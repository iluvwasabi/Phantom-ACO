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

/**
 * Middleware to ensure user has the ACO role or is an administrator
 */
const ensureHasACORole = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }

  try {
    const serverId = process.env.DISCORD_SERVER_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    // First check if user is an admin (admins bypass role check)
    if (req.user.guilds) {
      const guild = req.user.guilds.find(g => g.id === serverId);
      if (guild) {
        const ADMINISTRATOR_PERMISSION = 0x8;
        const hasAdminPermission = (parseInt(guild.permissions) & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;

        if (hasAdminPermission) {
          console.log(`Admin ${req.user.discord_username} bypassing ACO role check`);
          return next();
        }
      }
    }

    // Fetch user's roles from Discord API
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${serverId}/members/${req.user.discord_id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      }
    );

    const userRoles = response.data.roles;

    // Fetch all server roles to find ACO role ID
    const rolesResponse = await axios.get(
      `https://discord.com/api/v10/guilds/${serverId}/roles`,
      {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      }
    );

    const acoRole = rolesResponse.data.find(role => role.name === 'ACO');

    console.log('=== ACO Role Check Debug ===');
    console.log('User:', req.user.discord_username);
    console.log('User roles:', userRoles);
    console.log('ACO role ID:', acoRole?.id);

    if (acoRole && userRoles.includes(acoRole.id)) {
      console.log('User has ACO role');
      return next();
    }

    // User doesn't have ACO role
    return res.status(403).render('error', {
      message: 'Access Denied: You need the ACO role to access this service. Please contact an administrator.',
      user: req.user
    });

  } catch (error) {
    console.error('Error checking ACO role:', error);
    return res.status(500).send('Error verifying role permissions');
  }
};

module.exports = {
  ensureAuthenticated,
  ensureInServer,
  redirectIfAuthenticated,
  checkServiceAccess,
  ensureAdmin,
  ensureHasACORole
};
