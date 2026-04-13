const express = require('express');
const router = express.Router();
const { protect } = require('../utils/authMiddleware');
const { generateContent, transcribeMedia } = require('../controllers/aiController');

router.post('/generate-content', protect, generateContent);
router.post('/transcribe', protect, transcribeMedia);

module.exports = router;
