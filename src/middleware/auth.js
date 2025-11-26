const axios = require('axios');

/**
 * Middleware to ensure user is authenticated
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
};

/**
 * Middleware to verify user is in the Discord server
 */
const ensureInServer = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }

  try {
    const serverId = process.env.DISCORD_SERVER_ID;

    console.log('=== Server Check Debug ===');
    console.log('Server ID:', serverId);
    console.log('User guilds:', req.user.guilds);
    console.log('User object:', req.user);

    // Check if user has the guild in their guilds list
    if (req.user.guilds) {
      const inServer = req.user.guilds.some(guild => guild.id === serverId);
      console.log('In server check result:', inServer);

      if (inServer) {
        if (!req.user.is_verified) {
          // Mark user as verified
          const User = require('../models/User');
          User.verifyUser(req.user.id);
          req.user.is_verified = 1;
        }
        return next();
      }
    } else {
      console.log('No guilds found on user object - session may have expired');
    }

    // User not in server
    return res.render('not-in-server', {
      serverId: serverId,
      user: req.user
    });
  } catch (error) {
    console.error('Error checking server membership:', error);
    return res.status(500).send('Error verifying server membership');
  }
};

/**
 * Middleware to redirect authenticated users away from login page
 */
const redirectIfAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  next();
};

/**
 * Middleware to check if user has access to a specific service
 */
const checkServiceAccess = (serviceName) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/auth/login');
    }

    const Service = require('../models/Service');
    const subscription = Service.getSubscription(req.user.id, serviceName);

    if (subscription && subscription.status === 'active') {
      req.subscription = subscription;
      return next();
    }

    res.status(403).render('error', {
      message: 'You do not have access to this service',
      user: req.user
    });
  };
};

/**
 * Middleware to ensure user has administrator permissions on the Discord server
 */
const ensureAdmin = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    // Store the original URL to redirect back after login
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }

  try {
    const serverId = process.env.DISCORD_SERVER_ID;

    // Check if user has the guild in their guilds list
    if (req.user.guilds) {
      const guild = req.user.guilds.find(g => g.id === serverId);

      if (guild) {
        // Check if user has administrator permission (0x8 bit)
        const ADMINISTRATOR_PERMISSION = 0x8;
        const hasAdminPermission = (parseInt(guild.permissions) & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;

        console.log('=== Admin Check Debug ===');
        console.log('User:', req.user.discord_username);
        console.log('Guild permissions:', guild.permissions);
        console.log('Has admin:', hasAdminPermission);

        if (hasAdminPermission) {
          return next();
        }
      }
    }

    // User is not an admin
    return res.status(403).render('error', {
      message: 'Access Denied: Administrator permissions required',
      user: req.user
    });
  } catch (error) {
    console.error('Error checking admin permissions:', error);
    return res.status(500).send('Error verifying admin permissions');
  }
};

module.exports = {
  ensureAuthenticated,
  ensureInServer,
  redirectIfAuthenticated,
  checkServiceAccess,
  ensureAdmin
};
