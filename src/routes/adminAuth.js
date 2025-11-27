const express = require('express');
const router = express.Router();
const { redirectIfAdminAuthenticated, verifyAdminCredentials } = require('../middleware/adminAuth');

// Admin login page
router.get('/login', redirectIfAdminAuthenticated, (req, res) => {
  res.render('admin-login', {
    error: req.query.error,
    user: null
  });
});

// Admin login POST
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.redirect('/admin/login?error=missing');
    }

    const admin = await verifyAdminCredentials(username, password);

    if (!admin) {
      return res.redirect('/admin/login?error=invalid');
    }

    // Set admin session
    req.session.isAdmin = true;
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;

    // Redirect to original URL or admin dashboard
    const returnTo = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    res.redirect(returnTo);

  } catch (error) {
    console.error('Admin login error:', error);
    res.redirect('/admin/login?error=server');
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  req.session.isAdmin = false;
  delete req.session.adminId;
  delete req.session.adminUsername;

  res.redirect('/admin/login');
});

module.exports = router;
