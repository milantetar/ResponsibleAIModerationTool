const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const moderationService = require('../services/moderationService');
const database = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for moderation
const moderationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: 'Too many moderation requests, please slow down' }
});

// Validation schema
const moderationSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required()
});

// Moderate content endpoint
router.post('/moderate', authenticateToken, moderationLimiter, async (req, res) => {
  try {
    const { error, value } = moderationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { content } = value;
    const userId = req.user?.id || null;

    // Check free tier limits for anonymous users
    if (!userId) {
      const userAgent = req.get('User-Agent') || '';
      const ip = req.ip;
      // In a real app, you'd track this more robustly
      // For now, we'll rely on client-side tracking
    }

    // Moderate content
    const result = await moderationService.moderateContent(content);

    // Log the moderation
    await database.logModeration(
      userId,
      content,
      result,
      result.flagged,
      result.confidence
    );

    // Return result with additional context
    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      user_authenticated: !!userId
    });
  } catch (error) {
    console.error('Moderation error:', error);
    res.status(500).json({ error: 'Moderation service temporarily unavailable' });
  }
});

// Get moderation stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const stats = await database.getModerationStats(userId);
    
    res.json({
      stats,
      user_authenticated: !!userId
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Unable to fetch stats' });
  }
});

// Submit feedback
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { moderationLogId, feedbackType, comment } = req.body;
    const userId = req.user?.id;

    if (!moderationLogId || !feedbackType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await database.addFeedback(moderationLogId, userId, feedbackType, comment);
    
    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Unable to submit feedback' });
  }
});

module.exports = router;