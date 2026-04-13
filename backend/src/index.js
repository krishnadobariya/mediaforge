const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Global Exception Handlers to Prevent Crashes from Background Tasks
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const connectDB = require('./config/db');
const { errorHandler } = require('./utils/errorMiddleware');

// Initialize Express
const app = express();

// Connect to Database
connectDB();

// Initialize Media Worker (Background Processing)
require('./workers/mediaWorker');

// Middlewares
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://localhost:3050',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: true, // Echoes the request origin back to the browser (best for debugging)
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static Folders
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/media', require('./routes/mediaRoutes'));

app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'MediaForge API is running' });
});

// Error Middleware
app.use(errorHandler);

// Job Recovery Logic
const recoverPendingJobs = async () => {
  try {
    const Job = require('./models/Job');
    const { mediaQueue } = require('./config/queue');
    const pendingJobs = await Job.find({ status: { $in: ['pending', 'processing'] } });
    if (pendingJobs.length > 0) {
      console.log(`[SYSTEM] 🔄 Recovering ${pendingJobs.length} pending/interrupted jobs...`);
      for (const job of pendingJobs) {
        // Reset processing jobs to pending so they restart cleanly
        if (job.status === 'processing') {
          job.status = 'pending';
          await job.save();
        }
        await mediaQueue.add('process-job-recovery', { jobId: job._id });
      }
    }
  } catch (err) {
    console.error('[SYSTEM] ❌ Job recovery failed:', err.message);
  }
};

// Periodic Storage Cleanup (Every 24 hours) - Essential for Free Tiers
const cleanupStorage = () => {
  const uploadDir = path.join(__dirname, '../uploads');
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  fs.readdir(uploadDir, (err, files) => {
    if (err) return console.error('[CLEANUP] Failed to read uploads dir:', err.message);

    files.forEach(file => {
      const filePath = path.join(uploadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (Date.now() - stats.mtimeMs > MAX_AGE_MS) {
          fs.unlink(filePath, (err) => {
            if (!err) console.log(`[CLEANUP] Deleted old file: ${file}`);
          });
        }
      });
    });
  });
};

// Run cleanup once on start and then every 24 hours
setInterval(cleanupStorage, 24 * 60 * 60 * 1000);
cleanupStorage();

const PORT = process.env.PORT || 5050;

app.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  await recoverPendingJobs();
});
