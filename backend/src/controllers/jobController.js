const Job = require('../models/Job');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

exports.getJobStatus = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.status(200).json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

exports.getUserJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ userId: req.user.id }).sort('-createdAt').limit(20);
    res.status(200).json({ success: true, jobs });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const jobs = await Job.find({ userId: req.user.id });
    
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => ['pending', 'processing'].includes(j.status)).length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    
    // Calculate storage used
    let storageUsedBytes = 0;
    const uploadDir = path.join(__dirname, '../../uploads');
    
    jobs.forEach(job => {
      if (job.status === 'completed' && job.outputUrl) {
        const filePath = path.join(uploadDir, job.outputUrl);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          storageUsedBytes += stats.size;
        }
      }
      // Also count input files if they are still on disk (optional, but let's stick to outputs for "Storage Used")
    });

    // Format storage used
    let storageUsed;
    if (storageUsedBytes < 1024) storageUsed = `${storageUsedBytes} B`;
    else if (storageUsedBytes < 1024 * 1024) storageUsed = `${(storageUsedBytes / 1024).toFixed(1)} KB`;
    else if (storageUsedBytes < 1024 * 1024 * 1024) storageUsed = `${(storageUsedBytes / (1024 * 1024)).toFixed(1)} MB`;
    else storageUsed = `${(storageUsedBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;

    res.status(200).json({
      success: true,
      stats: {
        totalJobs,
        activeJobs,
        completedJobs,
        storageUsed
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadBatchAsZip = async (req, res, next) => {
  try {
    const { jobIds } = req.query; // Expecting comma separated IDs
    if (!jobIds) return res.status(400).json({ message: 'No job IDs provided' });

    const ids = jobIds.split(',');
    const jobs = await Job.find({ _id: { $in: ids }, userId: req.user.id, status: 'completed' });

    if (jobs.length === 0) return res.status(404).json({ message: 'No completed jobs found for these IDs' });

    const zip = new AdmZip();
    const uploadDir = path.join(__dirname, '../../uploads');

    jobs.forEach(job => {
      const filePath = path.join(uploadDir, job.outputUrl);
      if (fs.existsSync(filePath)) {
        zip.addLocalFile(filePath);
      }
    });

    const zipName = `MediaForge-Batch-${Date.now()}.zip`;
    const zipData = zip.toBuffer();

    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename=${zipName}`);
    res.set('Content-Length', zipData.length);
    res.send(zipData);
  } catch (err) {
    next(err);
  }
};
