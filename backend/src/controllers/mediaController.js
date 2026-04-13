const Job = require('../models/Job');
const { mediaQueue } = require('../config/queue');

exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, message: 'Please upload at least one file' });
    }

    let inputPath = '';
    if (req.files && req.files.length > 0) {
      inputPath = req.files.map(f => f.filename).join(',');
    } else if (req.file) {
      inputPath = req.file.filename;
    }

    const { type, operation, options } = req.body;

    const job = await Job.create({
      userId: req.user.id,
      type: type || 'image',
      operation: operation || 'convert',
      inputPath: inputPath,
      options: options ? (typeof options === 'string' ? JSON.parse(options) : options) : {},
      status: 'pending'
    });

    await mediaQueue.add(`process-${type}`, { jobId: job._id });

    res.status(202).json({ 
      success: true, 
      jobId: job._id, 
      message: `${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Media'} processing started` 
    });
  } catch (err) {
    next(err);
  }
};

exports.processImage = exports.uploadMedia;
exports.processVideo = exports.uploadMedia;
exports.processAudio = exports.uploadMedia;
