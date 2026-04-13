const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'pdf', 'download', 'ai'],
    required: true,
  },
  operation: {
    type: String, // e.g., 'convert', 'compress', 'remove-bg', 'extract-audio'
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  inputPath: {
    type: String,
    required: true,
  },
  outputUrl: {
    type: String,
  },
  options: {
    type: Object, // Specific options for the operation (format, quality, etc.)
    default: {},
  },
  error: {
    type: String,
  },
  progress: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
