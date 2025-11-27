const bcrypt = require('bcrypt');
const db = require('../config/database');

/**
 * Middleware to ensure user is authenticated as admin (session-based)
 */
const ensureAdminAuth = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    // Set req.user for compatibility with existing code
    req.user = {
      id: req.session.adminId,
      username: req.session.adminUsername,
      isAdmin: true
    };
    return next();
  }

  // Store the original URL to redirect back after login
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
};

/**
 * Middleware to redirect authenticated admins away from login page
 */
const redirectIfAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  next();
};

/**
 * Verify admin credentials
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object|null>} Admin user object or null if invalid
 */
const verifyAdminCredentials = async (username, password) => {
  try {
    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1').get(username);

    if (!admin) {
      return null;
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return null;
    }

    // Update last login
    db.prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(admin.id);

    return {
      id: admin.id,
      username: admin.username
    };
  } catch (error) {
    console.error('Error verifying admin credentials:', error);
    return null;
  }
};

/**
 * Create new admin user
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} Created admin user
 */
const createAdminUser = async (username, password) => {
  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  const result = db.prepare(`
    INSERT INTO admin_users (username, password_hash)
    VALUES (?, ?)
  `).run(username, password_hash);

  return {
    id: result.lastInsertRowid,
    username
  };
};

module.exports = {
  ensureAdminAuth,
  redirectIfAdminAuthenticated,
  verifyAdminCredentials,
  createAdminUser
};
