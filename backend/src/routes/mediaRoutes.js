const express = require('express');
const router = express.Router();
const upload = require('../utils/multerStorage');
const { protect } = require('../utils/authMiddleware');
const { uploadMedia } = require('../controllers/mediaController');

// All media uploads go through this route
// The field name for the file is 'media'
router.post('/upload', protect, upload.array('media', 50), uploadMedia);

// Legacy/Specific routes (optional, redirecting to uploadMedia)
router.post('/image', protect, upload.array('media', 50), uploadMedia);
router.post('/video', protect, upload.array('media', 50), uploadMedia);
router.post('/audio', protect, upload.array('media', 50), uploadMedia);

module.exports = router;
