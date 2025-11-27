const express = require('express');
const router = express.Router();
const { ensureAdminAuth } = require('../middleware/adminAuth');
const Service = require('../models/Service');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CryptoJS = require('crypto-js');

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = 'logo-' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, svg, webp)'));
    }
  }
});

// Admin dashboard
router.get('/', ensureAdminAuth, (req, res) => {
  const services = Service.getAllServices();

  // Get all users count
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  // Get all subscriptions count
  const subscriptionsCount = db.prepare('SELECT COUNT(*) as count FROM service_subscriptions').get().count;

  // Get recent submissions
  const recentSubmissions = db.prepare(`
    SELECT
      ss.id,
      ss.service_name,
      ss.service_type,
      ss.created_at,
      u.discord_username,
      u.discord_id
    FROM service_subscriptions ss
    JOIN users u ON ss.user_id = u.id
    ORDER BY ss.created_at DESC
    LIMIT 20
  `).all();

  // Fetch brand name from settings
  const brandNameSetting = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('brand_name');
  const brandName = brandNameSetting ? brandNameSetting.setting_value : 'Phantom ACO';

  res.render('admin', {
    user: req.user,
    services: services,
    usersCount: usersCount,
    subscriptionsCount: subscriptionsCount,
    recentSubmissions: recentSubmissions,
    brandName: brandName
  });
});

// Panels management page
router.get('/panels', ensureAdminAuth, (req, res) => {
  const panels = db.prepare(`
    SELECT * FROM service_panels
    ORDER BY display_order ASC
  `).all();

  // Fetch brand name from settings
  const brandNameSetting = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('brand_name');
  const brandName = brandNameSetting ? brandNameSetting.setting_value : 'Phantom ACO';

  res.render('admin-panels', {
    user: req.user,
    panels: panels,
    brandName: brandName
  });
});

// Settings management page
router.get('/settings', ensureAdminAuth, (req, res) => {
  const settings = db.prepare(`
    SELECT * FROM admin_settings
    ORDER BY setting_key ASC
  `).all();

  // Convert to key-value map
  const settingsMap = {};
  settings.forEach(s => {
    settingsMap[s.setting_key] = s.setting_value;
  });

  res.render('admin-settings', {
    user: req.user,
    settings: settingsMap,
    brandName: settingsMap.brand_name || 'Phantom ACO'
  });
});

// Users management page
router.get('/users', ensureAdminAuth, (req, res) => {
  const users = db.prepare(`
    SELECT
      u.id,
      u.discord_id,
      u.discord_username,
      u.email,
      u.created_at,
      u.last_login,
      u.is_verified,
      COUNT(DISTINCT ss.id) as submission_count
    FROM users u
    LEFT JOIN service_subscriptions ss ON ss.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  // Get services for each user
  users.forEach(user => {
    const services = db.prepare(`
      SELECT DISTINCT service_name
      FROM service_subscriptions
      WHERE user_id = ?
      ORDER BY service_name
    `).all(user.id);

    user.services = services.map(s => s.service_name);
  });

  // Fetch brand name from settings
  const brandNameSetting = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('brand_name');
  const brandName = brandNameSetting ? brandNameSetting.setting_value : 'Phantom ACO';

  res.render('admin-users', {
    user: req.user,
    users: users,
    brandName: brandName
  });
});

// Submissions management page
router.get('/submissions', ensureAdminAuth, (req, res) => {
  // Decryption helper
  function decrypt(ciphertext) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return null;
    }
  }

  // Get all submissions with user info
  const allSubmissions = db.prepare(`
    SELECT
      ss.id,
      ss.service_name,
      ss.service_type,
      ss.created_at,
      u.discord_username,
      u.discord_id,
      ec.encrypted_password
    FROM service_subscriptions ss
    JOIN users u ON ss.user_id = u.id
    LEFT JOIN encrypted_credentials ec ON ec.subscription_id = ss.id
    ORDER BY ss.created_at DESC
  `).all();

  // Decrypt and group by service
  const submissions = {
    target: [],
    walmart: [],
    bestbuy: [],
    pokemoncenter: [],
    shopify: []
  };

  allSubmissions.forEach(sub => {
    if (!sub.encrypted_password) return;

    try {
      const decryptedPassword = decrypt(sub.encrypted_password);
      if (!decryptedPassword || !decryptedPassword.startsWith('{')) return;

      const parsed = JSON.parse(decryptedPassword);
      const decrypted = {
        id: sub.id,
        discord_username: sub.discord_username,
        discord_id: sub.discord_id,
        service_name: sub.service_name,
        created_at: sub.created_at,
        email: parsed.email || null,
        phone: parsed.phone || null,
        name_on_card: parsed.name_on_card || null,
        card_type: parsed.card_type || null,
        card_number: parsed.card_number || null,
        cvv: parsed.cvv || null,
        exp_month: parsed.exp_month || null,
        exp_year: parsed.exp_year || null,
        billing_address: parsed.billing_address || null,
        billing_city: parsed.billing_city || null,
        billing_state: parsed.billing_state || null,
        billing_zipcode: parsed.billing_zipcode || null,
        address1: parsed.address1 || null,
        unit_number: parsed.unit_number || null,
        city: parsed.city || null,
        state: parsed.state || null,
        zip_code: parsed.zip_code || null,
        country: parsed.country || null,
        account_email: parsed.account_email || null,
        account_password: parsed.account_password || null,
        account_imap: parsed.account_imap || null
      };

      if (submissions[sub.service_name]) {
        submissions[sub.service_name].push(decrypted);
      }
    } catch (e) {
      console.error('Decryption error for submission:', sub.id, e.message);
    }
  });

  // Fetch brand name from settings
  const brandNameSetting = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('brand_name');
  const brandName = brandNameSetting ? brandNameSetting.setting_value : 'Phantom ACO';

  res.render('admin-submissions', {
    user: req.user,
    submissions: submissions,
    brandName: brandName
  });
});

// Get all users (API endpoint)
router.get('/api/users', ensureAdminAuth, (req, res) => {
  const users = db.prepare(`
    SELECT
      id,
      discord_id,
      discord_username,
      email,
      created_at,
      last_login,
      is_verified
    FROM users
    ORDER BY created_at DESC
  `).all();

  res.json({ users });
});

// Get a specific submission by ID (admin only - can fetch any user's submission)
router.get('/api/submissions/:id', ensureAdminAuth, (req, res) => {
  try {
    const submissionId = req.params.id;

    // Decryption helper
    function decrypt(ciphertext) {
      try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
      } catch (e) {
        return null;
      }
    }

    // Get submission with encrypted credentials
    const submission = db.prepare(`
      SELECT
        ss.id,
        ss.service_name,
        ss.service_type,
        ss.status,
        ss.created_at,
        ss.updated_at,
        ss.user_id,
        ec.encrypted_username,
        ec.encrypted_password,
        ec.encrypted_imap
      FROM service_subscriptions ss
      LEFT JOIN encrypted_credentials ec ON ec.subscription_id = ss.id
      WHERE ss.id = ?
    `).get(submissionId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Decrypt the data
    let decryptedData = {};

    if (submission.encrypted_password) {
      try {
        const decryptedPassword = decrypt(submission.encrypted_password);

        if (!decryptedPassword || decryptedPassword.trim() === '') {
          throw new Error('Decryption returned empty result');
        }

        // Check if it's a JSON string
        if (decryptedPassword.startsWith('{')) {
          const parsed = JSON.parse(decryptedPassword);
          decryptedData = {
            email: parsed.email || null,
            phone: parsed.phone || null,
            name_on_card: parsed.name_on_card || null,
            card_type: parsed.card_type || null,
            card_number: parsed.card_number || null,
            cvv: parsed.cvv || null,
            exp_month: parsed.exp_month || null,
            exp_year: parsed.exp_year || null,
            billing_address: parsed.billing_address || null,
            billing_city: parsed.billing_city || null,
            billing_state: parsed.billing_state || null,
            billing_zipcode: parsed.billing_zipcode || null,
            address1: parsed.address1 || null,
            unit_number: parsed.unit_number || null,
            city: parsed.city || null,
            state: parsed.state || null,
            zip_code: parsed.zip_code || null,
            country: parsed.country || null,
            account_email: parsed.account_email || null,
            account_password: parsed.account_password || null,
            account_imap: parsed.account_imap || null
          };
        } else {
          // It's just a password string (for login_required services)
          const username = submission.encrypted_username ? decrypt(submission.encrypted_username) : null;
          const imap = submission.encrypted_imap ? decrypt(submission.encrypted_imap) : null;

          decryptedData = {
            account_email: username && username.trim() !== '' ? username : null,
            account_password: decryptedPassword,
            account_imap: imap && imap.trim() !== '' ? imap : null
          };
        }
      } catch (e) {
        console.error('Decryption error for submission:', submission.id, e.message);
        return res.status(500).json({ error: 'Failed to decrypt submission data' });
      }
    }

    res.json({
      id: submission.id,
      service_name: submission.service_name,
      service_type: submission.service_type,
      status: submission.status,
      created_at: submission.created_at,
      updated_at: submission.updated_at,
      user_id: submission.user_id,
      ...decryptedData
    });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// Update any user's submission (admin only)
router.put('/api/submissions/:id', ensureAdminAuth, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const {
      email,
      phone,
      name_on_card,
      card_type,
      card_number,
      cvv,
      exp_month,
      exp_year,
      billing_address,
      billing_city,
      billing_state,
      billing_zipcode,
      address1,
      unit_number,
      city,
      state,
      zip_code,
      country,
      account_email,
      account_password,
      account_imap
    } = req.body;

    // Encryption helper
    function encrypt(text) {
      return CryptoJS.AES.encrypt(text, process.env.ENCRYPTION_KEY).toString();
    }

    // Find existing subscription (no ownership check for admin)
    const subscription = db.prepare('SELECT * FROM service_subscriptions WHERE id = ?').get(submissionId);

    if (!subscription) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Get the user_id from the subscription to update their payment info
    const userId = subscription.user_id;

    // Update user's payment information in users table
    const expDate = exp_month && exp_year ? `${exp_month}/${exp_year}` : null;
    const shippingFullAddress = address1 ? address1 + (unit_number ? ` ${unit_number}` : '') : null;

    db.prepare(`
      UPDATE users
      SET payment_email = ?, payment_method = ?, card_number = ?, exp_date = ?, cvc = ?,
          billing_address = ?, billing_city = ?, billing_state = ?, billing_zipcode = ?,
          shipping_address = ?, shipping_city = ?, shipping_state = ?, shipping_zipcode = ?,
          phone_number = ?
      WHERE id = ?
    `).run(
      email || account_email,
      card_type,
      card_number,
      expDate,
      cvv,
      billing_address,
      billing_city,
      billing_state,
      billing_zipcode,
      shippingFullAddress,
      city,
      state,
      zip_code,
      phone,
      userId
    );

    // Prepare data object (NOT encrypted yet)
    const dataToEncrypt = {
      email,
      phone,
      name_on_card,
      card_type,
      card_number,
      cvv,
      exp_month,
      exp_year,
      billing_address,
      billing_city,
      billing_state,
      billing_zipcode,
      address1,
      unit_number,
      city,
      state,
      zip_code,
      country,
      account_email,
      account_password,
      account_imap
    };

    // Encrypt the entire JSON object as a single string
    const encryptedDataString = encrypt(JSON.stringify(dataToEncrypt));

    // Update credentials
    db.prepare(`
      UPDATE encrypted_credentials
      SET encrypted_username = ?, encrypted_password = ?, encrypted_imap = ?, updated_at = CURRENT_TIMESTAMP
      WHERE subscription_id = ?
    `).run(
      account_email ? encrypt(account_email) : encrypt(email),
      encryptedDataString,
      account_imap ? encrypt(account_imap) : null,
      subscription.id
    );

    // Update subscription timestamp
    db.prepare('UPDATE service_subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(subscription.id);

    res.json({
      success: true,
      message: 'Submission updated successfully!'
    });

  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// Get all submissions (API endpoint)
router.get('/submissions', ensureAdminAuth, (req, res) => {
  const submissions = db.prepare(`
    SELECT
      ss.id,
      ss.service_name,
      ss.service_type,
      ss.status,
      ss.created_at,
      ss.updated_at,
      u.discord_username,
      u.discord_id,
      u.id as user_id
    FROM service_subscriptions ss
    JOIN users u ON ss.user_id = u.id
    ORDER BY ss.created_at DESC
  `).all();

  res.json({ submissions });
});

// Delete a submission (admin only)
router.delete('/submissions/:id', ensureAdminAuth, (req, res) => {
  try {
    const submissionId = req.params.id;

    db.prepare('DELETE FROM service_subscriptions WHERE id = ?').run(submissionId);

    res.json({ success: true, message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Admin delete error:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// Get service statistics
router.get('/stats', ensureAdminAuth, (req, res) => {
  try {
    // Count submissions by service
    const serviceStats = db.prepare(`
      SELECT
        service_name,
        service_type,
        COUNT(*) as count
      FROM service_subscriptions
      GROUP BY service_name, service_type
      ORDER BY count DESC
    `).all();

    // Count new users per day (last 30 days)
    const userGrowth = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    res.json({
      serviceStats,
      userGrowth
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Update a panel
router.put('/panels/:id', ensureAdminAuth, (req, res) => {
  try {
    const panelId = req.params.id;
    const { service_name, description, color_gradient, is_active, display_order } = req.body;

    db.prepare(`
      UPDATE service_panels
      SET service_name = ?, description = ?, color_gradient = ?, is_active = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(service_name, description, color_gradient, is_active ? 1 : 0, display_order, panelId);

    res.json({ success: true, message: 'Panel updated successfully' });
  } catch (error) {
    console.error('Update panel error:', error);
    res.status(500).json({ error: 'Failed to update panel' });
  }
});

// Create a new panel
router.post('/panels', ensureAdminAuth, (req, res) => {
  try {
    const { service_id, service_name, service_type, description, color_gradient, display_order } = req.body;

    const result = db.prepare(`
      INSERT INTO service_panels (service_id, service_name, service_type, description, color_gradient, display_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(service_id, service_name, service_type, description, color_gradient, display_order || 99);

    res.json({ success: true, message: 'Panel created successfully', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create panel error:', error);
    res.status(500).json({ error: 'Failed to create panel' });
  }
});

// Delete a panel
router.delete('/panels/:id', ensureAdminAuth, (req, res) => {
  try {
    const panelId = req.params.id;

    db.prepare('DELETE FROM service_panels WHERE id = ?').run(panelId);

    res.json({ success: true, message: 'Panel deleted successfully' });
  } catch (error) {
    console.error('Delete panel error:', error);
    res.status(500).json({ error: 'Failed to delete panel' });
  }
});

// Update settings
router.post('/settings', ensureAdminAuth, (req, res) => {
  try {
    const updates = req.body;

    const updateStmt = db.prepare(`
      UPDATE admin_settings
      SET setting_value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE setting_key = ?
    `);

    for (const [key, value] of Object.entries(updates)) {
      updateStmt.run(value, req.user.id, key);
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Upload logo
router.post('/upload-logo', ensureAdminAuth, upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Logo file uploaded:', req.file);
    const logoPath = `/uploads/logos/${req.file.filename}`;

    // Get the old logo before updating
    const oldLogoRow = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('login_page_logo');
    const oldLogo = oldLogoRow ? oldLogoRow.setting_value : null;

    // Use INSERT OR REPLACE to ensure the setting is always saved
    const result = db.prepare(`
      INSERT OR REPLACE INTO admin_settings (id, setting_key, setting_value, setting_type, updated_at, updated_by)
      VALUES (
        (SELECT id FROM admin_settings WHERE setting_key = 'login_page_logo'),
        'login_page_logo',
        ?,
        'text',
        CURRENT_TIMESTAMP,
        ?
      )
    `).run(logoPath, req.user.id);

    console.log('Database update result:', result);
    console.log('New logo path saved:', logoPath);

    // Delete old logo file if it exists and is not an emoji
    if (oldLogo && oldLogo.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../public', oldLogo);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log('Deleted old logo:', oldPath);
      }
    }

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logoPath: logoPath
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo: ' + error.message });
  }
});

// Update user payment information
router.post('/users/:id/payment', ensureAdminAuth, (req, res) => {
  try {
    const userId = req.params.id;
    const { payment_email, payment_method, card_number, exp_date, cvc,
            billing_address, billing_city, billing_state, billing_zipcode,
            shipping_address, shipping_city, shipping_state, shipping_zipcode,
            phone_number } = req.body;

    db.prepare(`
      UPDATE users
      SET payment_email = ?, payment_method = ?, card_number = ?, exp_date = ?, cvc = ?,
          billing_address = ?, billing_city = ?, billing_state = ?, billing_zipcode = ?,
          shipping_address = ?, shipping_city = ?, shipping_state = ?, shipping_zipcode = ?,
          phone_number = ?
      WHERE id = ?
    `).run(payment_email, payment_method, card_number, exp_date, cvc,
           billing_address, billing_city, billing_state, billing_zipcode,
           shipping_address, shipping_city, shipping_state, shipping_zipcode,
           phone_number, userId);

    res.json({ success: true, message: 'Payment information updated successfully' });
  } catch (error) {
    console.error('Update payment info error:', error);
    res.status(500).json({ error: 'Failed to update payment information' });
  }
});

// Delete logo (revert to emoji)
router.delete('/logo', ensureAdminAuth, (req, res) => {
  try {
    const currentLogo = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('login_page_logo');

    // Delete file if it's an uploaded image
    if (currentLogo && currentLogo.setting_value && currentLogo.setting_value.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../public', currentLogo.setting_value);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Deleted logo file:', filePath);
      }
    }

    // Reset to default emoji using INSERT OR REPLACE
    db.prepare(`
      INSERT OR REPLACE INTO admin_settings (id, setting_key, setting_value, setting_type, updated_at, updated_by)
      VALUES (
        (SELECT id FROM admin_settings WHERE setting_key = 'login_page_logo'),
        'login_page_logo',
        '👻',
        'text',
        CURRENT_TIMESTAMP,
        ?
      )
    `).run(req.user.id);

    console.log('Logo reset to emoji');
    res.json({ success: true, message: 'Logo deleted, reverted to emoji' });
  } catch (error) {
    console.error('Delete logo error:', error);
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

// Delete user
router.delete('/users/:id', ensureAdminAuth, (req, res) => {
  try {
    const userId = req.params.id;

    // Verify user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Delete user (CASCADE will handle related records in service_subscriptions, encrypted_credentials, etc.)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Server management page
router.get('/servers', ensureAdminAuth, (req, res) => {
  const servers = db.prepare(`
    SELECT *,
      (SELECT COUNT(*) FROM users WHERE server_id = registered_servers.server_id) as user_count
    FROM registered_servers
    ORDER BY created_at DESC
  `).all();

  // Fetch brand name from settings
  const brandNameSetting = db.prepare('SELECT setting_value FROM admin_settings WHERE setting_key = ?').get('brand_name');
  const brandName = brandNameSetting ? brandNameSetting.setting_value : 'Phantom ACO';

  res.render('admin-servers', {
    user: req.user,
    servers: servers,
    brandName: brandName
  });
});

// Add new server (API)
router.post('/api/servers', ensureAdminAuth, (req, res) => {
  try {
    const { server_id, server_name, required_role_name } = req.body;

    if (!server_id || !server_name || !required_role_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if server already exists
    const existing = db.prepare('SELECT * FROM registered_servers WHERE server_id = ?').get(server_id);
    if (existing) {
      return res.status(400).json({ error: 'Server already registered' });
    }

    const result = db.prepare(`
      INSERT INTO registered_servers (server_id, server_name, required_role_name)
      VALUES (?, ?, ?)
    `).run(server_id, server_name, required_role_name);

    res.json({
      success: true,
      message: 'Server registered successfully',
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Add server error:', error);
    res.status(500).json({ error: 'Failed to register server' });
  }
});

// Update server (API)
router.put('/api/servers/:id', ensureAdminAuth, (req, res) => {
  try {
    const serverId = req.params.id;
    const { server_name, required_role_name, is_active } = req.body;

    db.prepare(`
      UPDATE registered_servers
      SET server_name = ?, required_role_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(server_name, required_role_name, is_active ? 1 : 0, serverId);

    res.json({ success: true, message: 'Server updated successfully' });
  } catch (error) {
    console.error('Update server error:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Delete server (API)
router.delete('/api/servers/:id', ensureAdminAuth, (req, res) => {
  try {
    const serverId = req.params.id;

    db.prepare('DELETE FROM registered_servers WHERE id = ?').run(serverId);

    res.json({ success: true, message: 'Server deleted successfully' });
  } catch (error) {
    console.error('Delete server error:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

module.exports = router;
