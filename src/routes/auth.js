const express = require('express');
const passport = require('passport');
const router = express.Router();

// Login route - force browser-only OAuth (prevent Discord app from opening)
router.get('/login', passport.authenticate('discord', {
  prompt: 'consent'
}));

// OAuth callback
router.get('/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/login-failed'
  }),
  (req, res) => {
    // Successful authentication
    // Check if there's a return URL stored in session
    const returnTo = req.session.returnTo;
    delete req.session.returnTo; // Clear it after use

    res.redirect(returnTo || '/dashboard');
  }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Login failed route
router.get('/login-failed', (req, res) => {
  res.render('login-failed', { user: null });
});

module.exports = router;
