/**
 * Public API routes for external integrations
 * Used by checkout tagger bot to look up Discord IDs by email
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Simple API key auth (optional - set API_KEY in your .env)
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!process.env.API_KEY) {
    // No API key configured = open access
    return next();
  }
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

/**
 * GET /api/lookup?email=user@example.com
 * Returns the Discord ID for a given email
 * 
 * Used by: Discord checkout tagger bot
 * Response: { discordId: "123456789", username: "user#1234" }
 * Or: { error: "User not found" }
 */
router.get('/lookup', apiKeyAuth, (req, res) => {
  const email = req.query.email?.toLowerCase()?.trim();
  
  if (!email) {
    return res.status(400).json({ error: 'Email parameter required' });
  }
  
  try {
    const user = db.prepare(`
      SELECT discord_id, discord_username, discord_discriminator 
      FROM users 
      WHERE LOWER(email) = ?
    `).get(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found', email });
    }
    
    res.json({
      discordId: user.discord_id,
      username: user.discord_discriminator 
        ? `${user.discord_username}#${user.discord_discriminator}`
        : user.discord_username
    });
  } catch (error) {
    console.error('API lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
