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
 * Middleware to verify user is in any registered Discord server
 * (Multi-tenant support)
 */
const ensureInServer = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }

  try {
    const db = require('../config/database');

    // Get all active registered servers
    const registeredServers = db.prepare('SELECT * FROM registered_servers WHERE is_active = 1').all();

    console.log('=== Multi-Tenant Server Check ===');
    console.log('Registered servers:', registeredServers.length);
    console.log('User guilds:', req.user.guilds?.length || 0);

    if (!req.user.guilds || req.user.guilds.length === 0) {
      console.log('No guilds found on user object - session may have expired');
      return res.render('not-in-server', {
        serverId: null,
        user: req.user,
        message: 'No Discord servers found. Your session may have expired.'
      });
    }

    // Find which registered servers the user is a member of
    const userServers = [];
    for (const guild of req.user.guilds) {
      const registeredServer = registeredServers.find(s => s.server_id === guild.id);
      if (registeredServer) {
        userServers.push({
          ...registeredServer,
          permissions: guild.permissions
        });
      }
    }

    console.log('User is in', userServers.length, 'registered server(s)');

    if (userServers.length === 0) {
      // User not in any registered server
      return res.render('not-in-server', {
        serverId: null,
        user: req.user,
        message: 'You are not a member of any authorized Discord servers.'
      });
    }

    // Store the user's servers in session for later use
    req.session.userServers = userServers.map(s => ({
      id: s.server_id,
      name: s.server_name,
      required_role: s.required_role_name
    }));

    // If user has a selected server in session, use it; otherwise use the first one
    if (!req.session.selectedServerId) {
      req.session.selectedServerId = userServers[0].server_id;
    }

    // Mark user as verified
    if (!req.user.is_verified) {
      const User = require('../models/User');
      User.verifyUser(req.user.id);
      req.user.is_verified = 1;
    }

    // Update user's server_id in database
    db.prepare('UPDATE users SET server_id = ? WHERE id = ?').run(req.session.selectedServerId, req.user.id);

    return next();

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
 * Middleware to ensure user has the required role in their selected server
 * (Multi-tenant support - checks role configured for each server)
 */
const ensureHasACORole = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }

  try {
    const db = require('../config/database');
    const botToken = process.env.DISCORD_BOT_TOKEN;

    // Get the user's selected server
    const selectedServerId = req.session.selectedServerId;

    if (!selectedServerId) {
      return res.status(403).render('error', {
        message: 'No server selected. Please log in again.',
        user: req.user
      });
    }

    // Get the registered server configuration
    const registeredServer = db.prepare('SELECT * FROM registered_servers WHERE server_id = ? AND is_active = 1').get(selectedServerId);

    if (!registeredServer) {
      return res.status(403).render('error', {
        message: 'Server not found or inactive.',
        user: req.user
      });
    }

    // Fetch user's roles from Discord API
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${selectedServerId}/members/${req.user.discord_id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      }
    );

    const userRoles = response.data.roles;

    // Fetch all server roles to find the required role
    const rolesResponse = await axios.get(
      `https://discord.com/api/v10/guilds/${selectedServerId}/roles`,
      {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      }
    );

    const requiredRole = rolesResponse.data.find(role => role.name === registeredServer.required_role_name);

    console.log('=== Multi-Tenant Role Check ===');
    console.log('User:', req.user.discord_username);
    console.log('Server:', registeredServer.server_name);
    console.log('Required role:', registeredServer.required_role_name);
    console.log('User roles:', userRoles);
    console.log('Required role ID:', requiredRole?.id);

    if (requiredRole && userRoles.includes(requiredRole.id)) {
      console.log('User has required role');
      return next();
    }

    // Get user's other available servers
    const userGuildIds = req.user.guilds ? req.user.guilds.map(g => g.id) : [];
    const placeholders = userGuildIds.map(() => '?').join(',');
    const availableServers = userGuildIds.length > 0
      ? db.prepare(`SELECT * FROM registered_servers WHERE server_id IN (${placeholders}) AND is_active = 1`).all(...userGuildIds)
      : [];

    // User doesn't have required role
    return res.status(403).render('error', {
      message: `Access Denied: You need the "${registeredServer.required_role_name}" role in ${registeredServer.server_name} to access this service. Please contact an administrator.`,
      user: req.user,
      availableServers: availableServers,
      currentServer: registeredServer
    });

  } catch (error) {
    console.error('Error checking role:', error);
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
