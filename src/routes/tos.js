const express = require('express');
const router = express.Router();
const db = require('../config/database');

const CURRENT_TOS_VERSION = 'v1.0';

// TOS acceptance page
router.get('/tos', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }

  res.render('tos', {
    user: req.user,
    tosVersion: CURRENT_TOS_VERSION
  });
});

// Handle TOS acceptance
router.post('/tos/accept', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/');
  }

  try {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Check if already accepted this version
    const existing = db.prepare(`
      SELECT * FROM tos_acceptances
      WHERE user_id = ? AND tos_version = ?
    `).get(userId, CURRENT_TOS_VERSION);

    if (!existing) {
      // Record acceptance
      db.prepare(`
        INSERT INTO tos_acceptances (user_id, tos_version, ip_address, user_agent)
        VALUES (?, ?, ?, ?)
      `).run(userId, CURRENT_TOS_VERSION, ipAddress, userAgent);

      console.log(`✓ User ${req.user.discord_username} (${userId}) accepted TOS ${CURRENT_TOS_VERSION} from ${ipAddress}`);
    }

    // Redirect to dashboard
    res.redirect('/dashboard');

  } catch (error) {
    console.error('TOS acceptance error:', error);
    res.status(500).render('error', {
      message: 'Failed to record TOS acceptance',
      user: req.user
    });
  }
});

// Middleware to check TOS acceptance
function ensureTOSAccepted(req, res, next) {
  // Skip for non-authenticated users
  if (!req.isAuthenticated()) {
    return next();
  }

  // Skip for admin routes
  if (req.path.startsWith('/admin')) {
    return next();
  }

  // Skip for TOS routes themselves
  if (req.path.startsWith('/tos')) {
    return next();
  }

  // Skip for auth routes
  if (req.path.startsWith('/auth')) {
    return next();
  }

  // Check if user has accepted current TOS version
  const acceptance = db.prepare(`
    SELECT * FROM tos_acceptances
    WHERE user_id = ? AND tos_version = ?
  `).get(req.user.id, CURRENT_TOS_VERSION);

  if (!acceptance) {
    return res.redirect('/tos');
  }

  next();
}

module.exports = { router, ensureTOSAccepted, CURRENT_TOS_VERSION };
