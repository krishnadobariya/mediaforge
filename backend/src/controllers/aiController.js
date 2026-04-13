const AIService = require('../services/aiService');

exports.generateContent = async (req, res, next) => {
  try {
    const { mediaType, description } = req.body;
    const result = await AIService.generateSocialContent(mediaType, description);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.transcribeMedia = async (req, res, next) => {
  try {
    // Logic to start transcription job
    res.status(202).json({ success: true, message: 'Transcription job started' });
  } catch (err) {
    next(err);
  }
};
