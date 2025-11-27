const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureInServer, ensureHasACORole } = require('../middleware/auth');
const Service = require('../models/Service');
const User = require('../models/User');

// Dashboard home
router.get('/', ensureAuthenticated, ensureInServer, ensureHasACORole, (req, res) => {
  const db = require('../config/database');

  // Fetch all active service panels from database (ordered by display_order)
  const servicePanels = db.prepare('SELECT * FROM service_panels WHERE is_active = 1 ORDER BY display_order ASC').all();

  const userSubscriptions = Service.getUserSubscriptions(req.user.id);

  // Create a map of subscribed services (supports multiple submissions per service)
  const subscribedServices = {};
  userSubscriptions.forEach(sub => {
    if (!subscribedServices[sub.service_name]) {
      subscribedServices[sub.service_name] = [];
    }
    subscribedServices[sub.service_name].push(sub);
  });

  // Check if user is admin
  const serverId = process.env.DISCORD_SERVER_ID;
  let isAdmin = false;
  if (req.user.guilds) {
    const guild = req.user.guilds.find(g => g.id === serverId);
    if (guild) {
      const ADMINISTRATOR_PERMISSION = 0x8;
      isAdmin = (parseInt(guild.permissions) & ADMINISTRATOR_PERMISSION) === ADMINISTRATOR_PERMISSION;
    }
  }

  // Fetch brand name from settings
  const brandNameSetting = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('brand_name');
  const brandName = brandNameSetting ? brandNameSetting.setting_value : 'Phantom ACO';

  // Get user's available servers
  const userGuildIds = req.user.guilds ? req.user.guilds.map(g => g.id) : [];
  const placeholders = userGuildIds.map(() => '?').join(',');
  const userServers = userGuildIds.length > 0
    ? db.prepare(`SELECT * FROM registered_servers WHERE server_id IN (${placeholders}) AND is_active = 1`).all(...userGuildIds)
    : [];

  // Get selected server info
  const selectedServer = db.prepare('SELECT * FROM registered_servers WHERE server_id = ?').get(req.session.selectedServerId);

  res.render('dashboard', {
    user: req.user,
    servicePanels: servicePanels,
    subscribedServices: subscribedServices,
    appUrl: process.env.APP_URL,
    isAdmin: isAdmin,
    brandName: brandName,
    userServers: userServers,
    selectedServer: selectedServer
  });
});

// Service selection page
router.get('/service/:serviceName', ensureAuthenticated, ensureInServer, ensureHasACORole, (req, res) => {
  const { serviceName } = req.params;
  const services = Service.getAllServices();

  // Find the service
  let service = null;
  let serviceType = null;

  if (services.LOGIN_REQUIRED[serviceName]) {
    service = services.LOGIN_REQUIRED[serviceName];
    serviceType = 'LOGIN_REQUIRED';
  } else if (services.NO_LOGIN[serviceName]) {
    service = services.NO_LOGIN[serviceName];
    serviceType = 'NO_LOGIN';
  }

  if (!service) {
    return res.status(404).render('error', {
      message: 'Service not found',
      user: req.user
    });
  }

  // Check if user already subscribed
  const existingSubscription = Service.getSubscription(req.user.id, serviceName);

  res.render('service-details', {
    user: req.user,
    service: service,
    serviceName: serviceName,
    serviceType: serviceType,
    existingSubscription: existingSubscription
  });
});

// Generate form URL with Discord prefill
router.get('/service/:serviceName/form', ensureAuthenticated, ensureInServer, ensureHasACORole, (req, res) => {
  const { serviceName } = req.params;
  const services = Service.getAllServices();

  // Determine service type
  let serviceType = null;
  let formBaseUrl = null;

  if (services.LOGIN_REQUIRED[serviceName]) {
    serviceType = 'LOGIN_REQUIRED';
    formBaseUrl = process.env.FORM_LOGIN_SERVICES;
  } else if (services.NO_LOGIN[serviceName]) {
    serviceType = 'NO_LOGIN';
    formBaseUrl = process.env.FORM_NO_LOGIN_SERVICES;
  } else {
    return res.status(404).json({ error: 'Service not found' });
  }

  // Build prefill URL
  const discordIdEntry = serviceType === 'LOGIN_REQUIRED'
    ? process.env.FORM_LOGIN_DISCORD_ID_ENTRY
    : process.env.FORM_NO_LOGIN_DISCORD_ID_ENTRY;

  const discordUsernameEntry = serviceType === 'LOGIN_REQUIRED'
    ? process.env.FORM_LOGIN_DISCORD_USERNAME_ENTRY
    : process.env.FORM_NO_LOGIN_DISCORD_USERNAME_ENTRY;

  const prefillUrl = `${formBaseUrl}?${discordIdEntry}=${req.user.discord_id}&${discordUsernameEntry}=${encodeURIComponent(req.user.discord_username)}&entry.service=${encodeURIComponent(serviceName)}`;

  // Log the form submission
  Service.logFormSubmission(req.user.id, serviceType, serviceName, prefillUrl);

  // Create or update subscription
  Service.createSubscription(req.user.id, serviceType, serviceName);

  res.json({
    formUrl: prefillUrl,
    serviceName: serviceName,
    serviceType: serviceType
  });
});

// User profile
router.get('/profile', ensureAuthenticated, ensureInServer, ensureHasACORole, (req, res) => {
  const subscriptions = User.getSubscriptions(req.user.id);
  const formSubmissions = User.getFormSubmissions(req.user.id);

  res.render('profile', {
    user: req.user,
    subscriptions: subscriptions,
    formSubmissions: formSubmissions
  });
});

// Unsubscribe from service
router.post('/service/:serviceName/unsubscribe', ensureAuthenticated, ensureInServer, ensureHasACORole, (req, res) => {
  const { serviceName } = req.params;

  Service.deleteSubscription(req.user.id, serviceName);

  res.redirect('/dashboard');
});

// Switch server
router.post('/switch-server', ensureAuthenticated, (req, res) => {
  const { serverId } = req.body;

  if (!serverId) {
    return res.status(400).json({ error: 'Server ID is required' });
  }

  // Update session
  req.session.selectedServerId = serverId;

  res.json({ success: true, message: 'Server switched successfully' });
});

module.exports = router;
