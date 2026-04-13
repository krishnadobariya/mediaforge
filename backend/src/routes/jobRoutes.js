const express = require('express');
const router = express.Router();
const { getJobStatus, getUserJobs, getStats, downloadBatchAsZip } = require('../controllers/jobController');
const { protect } = require('../utils/authMiddleware');

const nocache = (req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
};

router.get('/stats', protect, getStats);
router.get('/download-batch', protect, downloadBatchAsZip);
router.get('/:id', protect, nocache, getJobStatus);
router.get('/', protect, nocache, getUserJobs);

module.exports = router;
