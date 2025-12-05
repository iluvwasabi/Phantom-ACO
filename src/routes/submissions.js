const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { ensureAuthenticated, ensureHasACORole } = require('../middleware/auth');
const CryptoJS = require('crypto-js');

// Encryption helper
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, process.env.ENCRYPTION_KEY).toString();
}

function decrypt(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Discord notification helper
async function sendUrgentDiscordNotification(title, description, fields = [], color = 0xFF0000) {
  const DISCORD_CHANNEL_ID = '1446376744411074757';
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!DISCORD_BOT_TOKEN) {
    console.warn('Discord bot token not configured, skipping notification');
    return;
  }

  try {
    const embed = {
      title: `🚨 ${title}`,
      description: description,
      color: color,
      fields: fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Phantom ACO Service'
      }
    };

    const response = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      console.error('Discord notification failed:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}

// GET /api/panels/:service/products - Get products for a service panel (public for authenticated users)
router.get('/api/panels/:service/products', ensureAuthenticated, ensureHasACORole, (req, res) => {
  try {
    const { service } = req.params;

    const panel = db.prepare(`
      SELECT products FROM service_panels
      WHERE service_id = ?
    `).get(service);

    if (!panel) {
      return res.status(404).json({ error: 'Panel not found' });
    }

    const products = panel.products ? JSON.parse(panel.products) : [];
    res.json({ products });
  } catch (error) {
    console.error('Get panel products error:', error);
    res.status(500).json({ error: 'Failed to get panel products' });
  }
});

// GET /api/submissions - Get all user submissions
router.get('/api/submissions', ensureAuthenticated, ensureHasACORole, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all subscriptions for this user
    const subscriptions = db.prepare(`
      SELECT ss.*, ec.encrypted_username, ec.encrypted_password, ec.encrypted_imap
      FROM service_subscriptions ss
      LEFT JOIN encrypted_credentials ec ON ec.subscription_id = ss.id
      WHERE ss.user_id = ?
      ORDER BY ss.created_at DESC
    `).all(userId);

    // Decrypt and format the data
    const submissions = subscriptions.map(sub => {
      let decryptedData = {};

      // If encrypted_password contains JSON (for no_login services), parse it
      if (sub.encrypted_password) {
        try {
          // First try to decrypt the password field
          const decryptedPassword = decrypt(sub.encrypted_password);

          // Check if decryption failed (returns empty string or null)
          if (!decryptedPassword || decryptedPassword.trim() === '') {
            throw new Error('Decryption returned empty result');
          }

          // Check if it's a JSON string
          if (decryptedPassword.startsWith('{')) {
            const parsed = JSON.parse(decryptedPassword);
            // It's a full data object - decrypt each field
            decryptedData = {
              first_name: parsed.first_name || null,
              last_name: parsed.last_name || null,
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
              billing_same_as_shipping: parsed.billing_same_as_shipping || null,
              address1: parsed.address1 || null,
              unit_number: parsed.unit_number || null,
              city: parsed.city || null,
              state: parsed.state || null,
              zip_code: parsed.zip_code || null,
              country: parsed.country || null,
              account_email: parsed.account_email || null,
              account_password: null,  // SECURITY: Never send password to frontend
              account_imap: parsed.account_imap || null,
              max_qty: parsed.max_qty || null,
              max_checkouts: parsed.max_checkouts || null,
              selected_products: parsed.selected_products || []
            };
          } else {
            // It's just a password string (for login_required services)
            const username = sub.encrypted_username ? decrypt(sub.encrypted_username) : null;
            const imap = sub.encrypted_imap ? decrypt(sub.encrypted_imap) : null;

            decryptedData = {
              account_email: username && username.trim() !== '' ? username : null,
              account_password: null,  // SECURITY: Never send password to frontend
              account_imap: imap && imap.trim() !== '' ? imap : null
            };
          }
        } catch (e) {
          console.error('Decryption error for submission:', sub.id, e.message, e.stack);
          // Return placeholder data if decryption fails
          decryptedData = {
            email: '[Decryption Error]',
            card_number: '****',
            account_email: '[Decryption Error]',
            error: true
          };
        }
      }

      return {
        id: sub.id,
        service_name: sub.service_name,
        service_type: sub.service_type,
        status: sub.status,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
        notes: sub.notes,
        ...decryptedData
      };
    });

    res.json({ submissions });

  } catch (error) {
    console.error('Get submissions error:', error);
    // Return empty array instead of error to prevent frontend from breaking
    res.json({ submissions: [], error: error.message });
  }
});

// POST /api/submissions - Create new submission
router.post('/api/submissions', ensureAuthenticated, ensureHasACORole, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      service,
      first_name,
      last_name,
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
      billing_same_as_shipping,
      address1,
      unit_number,
      city,
      state,
      zip_code,
      country,
      account_email,
      account_password,
      account_imap,
      max_qty,
      max_checkouts,
      notes
    } = req.body;

    // Update user's payment information in users table
    const expDate = exp_month && exp_year ? `${exp_month}/${exp_year}` : null;
    const shippingFullAddress = address1 ? address1 + (unit_number ? ` ${unit_number}` : '') : null;

    db.prepare(`
      UPDATE users
      SET first_name = ?, last_name = ?, payment_email = ?, payment_method = ?, card_number = ?, exp_date = ?, cvc = ?,
          billing_address = ?, billing_city = ?, billing_state = ?, billing_zipcode = ?,
          shipping_address = ?, shipping_city = ?, shipping_state = ?, shipping_zipcode = ?,
          phone_number = ?, billing_same_as_shipping = ?, max_qty = ?, max_checkouts = ?
      WHERE id = ?
    `).run(
      first_name,
      last_name,
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
      billing_same_as_shipping ? 1 : 0,
      max_qty || 1,
      max_checkouts || 1,
      userId
    );

    // Check submission limit for this service
    const servicePanel = db.prepare('SELECT submission_limit FROM service_panels WHERE service_id = ?').get(service);
    if (servicePanel && servicePanel.submission_limit > 0) {
      const currentCount = db.prepare('SELECT COUNT(*) as count FROM service_subscriptions WHERE user_id = ? AND service_name = ?').get(userId, service);
      if (currentCount && currentCount.count >= servicePanel.submission_limit) {
        return res.status(400).json({
          error: `Submission limit reached. You can only have ${servicePanel.submission_limit} submission${servicePanel.submission_limit > 1 ? 's' : ''} for this service.`
        });
      }
    }

    // Create service subscription (with keep_running defaulting to 1)
    const subscriptionResult = db.prepare(`
      INSERT INTO service_subscriptions (user_id, service_type, service_name, status, notes, keep_running)
      VALUES (?, ?, ?, 'active', ?, 1)
    `).run(userId, account_email ? 'login_required' : 'no_login', service, notes || null);

    const subscriptionId = subscriptionResult.lastInsertRowid;

    // Prepare data object (NOT encrypted yet)
    const dataToEncrypt = {
      first_name,
      last_name,
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
      billing_same_as_shipping,
      address1,
      unit_number,
      city,
      state,
      zip_code,
      country,
      account_email,
      account_password,
      selected_products: req.body.selected_products || []
    };

    // Only include account_imap if not Target service
    if (service !== 'target') {
      dataToEncrypt.account_imap = account_imap;
    }

    // Keep legacy max_qty and max_checkouts for backwards compatibility
    if (req.body.max_qty) dataToEncrypt.max_qty = max_qty;
    if (req.body.max_checkouts) dataToEncrypt.max_checkouts = max_checkouts;

    // Encrypt the entire JSON object as a single string
    const encryptedDataString = encrypt(JSON.stringify(dataToEncrypt));

    // Store in encrypted_credentials table
    db.prepare(`
      INSERT INTO encrypted_credentials (
        subscription_id, encrypted_username, encrypted_password, encrypted_imap
      ) VALUES (?, ?, ?, ?)
    `).run(
      subscriptionId,
      account_email ? encrypt(account_email) : encrypt(email),
      encryptedDataString,
      account_imap ? encrypt(account_imap) : null
    );

    // Log form submission
    db.prepare(`
      INSERT INTO form_submissions (user_id, form_type, service_name)
      VALUES (?, ?, ?)
    `).run(userId, account_email ? 'login_required' : 'no_login', service);

    // Send Discord notification for new submission
    const user = db.prepare('SELECT discord_username, discord_id FROM users WHERE id = ?').get(userId);
    const servicePanelInfo = db.prepare('SELECT service_name FROM service_panels WHERE service_id = ?').get(service);
    const serviceName = servicePanelInfo ? servicePanelInfo.service_name : service;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'N/A';

    await sendUrgentDiscordNotification(
      'NEW SUBMISSION ADDED',
      `A user has added a new submission for **${serviceName}**`,
      [
        { name: 'User', value: user?.discord_username || 'Unknown', inline: true },
        { name: 'Discord ID', value: user?.discord_id || 'N/A', inline: true },
        { name: 'Name', value: fullName, inline: true },
        { name: 'Service', value: serviceName, inline: true },
        { name: 'Email', value: account_email || email || 'N/A', inline: true },
        { name: 'Submission ID', value: `${subscriptionId}`, inline: true },
        { name: 'Created At', value: new Date().toLocaleString(), inline: false }
      ],
      0x00FF00  // Green color for new submission
    );

    res.json({
      success: true,
      message: 'Submission created successfully!'
    });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// PUT /api/submissions/:id - Update existing submission
router.put('/api/submissions/:id', ensureAuthenticated, ensureHasACORole, async (req, res) => {
  try {
    const userId = req.user.id;
    const submissionId = req.params.id;
    const {
      first_name,
      last_name,
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
      billing_same_as_shipping,
      address1,
      unit_number,
      city,
      state,
      zip_code,
      country,
      account_email,
      account_password,
      account_imap,
      max_qty,
      max_checkouts,
      notes
    } = req.body;

    // Find existing subscription and verify ownership
    const subscription = db.prepare('SELECT * FROM service_subscriptions WHERE id = ? AND user_id = ?').get(submissionId, userId);

    if (!subscription) {
      return res.status(404).json({ error: 'Submission not found or you do not have permission to edit it' });
    }

    // Get existing encrypted data to preserve password if not provided
    let existingPassword = account_password;
    if (!account_password || account_password.trim() === '') {
      const existingCreds = db.prepare('SELECT encrypted_password FROM encrypted_credentials WHERE subscription_id = ?').get(submissionId);
      if (existingCreds && existingCreds.encrypted_password) {
        try {
          const decryptedData = decrypt(existingCreds.encrypted_password);
          const parsedData = JSON.parse(decryptedData);
          existingPassword = parsedData.account_password || '';
        } catch (e) {
          console.error('Error retrieving existing password:', e);
        }
      }
    }

    // Update user's payment information in users table
    const expDate = exp_month && exp_year ? `${exp_month}/${exp_year}` : null;
    const shippingFullAddress = address1 ? address1 + (unit_number ? ` ${unit_number}` : '') : null;

    db.prepare(`
      UPDATE users
      SET first_name = ?, last_name = ?, payment_email = ?, payment_method = ?, card_number = ?, exp_date = ?, cvc = ?,
          billing_address = ?, billing_city = ?, billing_state = ?, billing_zipcode = ?,
          shipping_address = ?, shipping_city = ?, shipping_state = ?, shipping_zipcode = ?,
          phone_number = ?, billing_same_as_shipping = ?, max_qty = ?, max_checkouts = ?
      WHERE id = ?
    `).run(
      first_name,
      last_name,
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
      billing_same_as_shipping ? 1 : 0,
      max_qty || 1,
      max_checkouts || 1,
      userId
    );

    // Prepare data object (NOT encrypted yet)
    const dataToEncrypt = {
      first_name,
      last_name,
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
      billing_same_as_shipping,
      address1,
      unit_number,
      city,
      state,
      zip_code,
      country,
      account_email,
      account_password: existingPassword,  // Use existing password if not provided
      account_imap,
      max_qty,
      max_checkouts
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

    // Update subscription with notes and timestamp
    db.prepare('UPDATE service_subscriptions SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(notes || null, subscription.id);

    // Send Discord notification for edit
    const user = db.prepare('SELECT discord_username, discord_id FROM users WHERE id = ?').get(userId);
    const servicePanelInfo = db.prepare('SELECT service_name FROM service_panels WHERE service_id = ?').get(subscription.service_name);
    const serviceName = servicePanelInfo ? servicePanelInfo.service_name : subscription.service_name;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || 'N/A';

    await sendUrgentDiscordNotification(
      'SUBMISSION EDITED',
      `A user has edited their submission for **${serviceName}**`,
      [
        { name: 'User', value: user?.discord_username || 'Unknown', inline: true },
        { name: 'Discord ID', value: user?.discord_id || 'N/A', inline: true },
        { name: 'Name', value: fullName, inline: true },
        { name: 'Service', value: serviceName, inline: true },
        { name: 'Email', value: account_email || email || 'N/A', inline: true },
        { name: 'Submission ID', value: `${submissionId}`, inline: true },
        { name: 'Updated At', value: new Date().toLocaleString(), inline: false }
      ],
      0xFFA500  // Orange color for edit
    );

    res.json({
      success: true,
      message: 'Submission updated successfully!'
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

// DELETE /api/submissions/:id - Delete submission
router.delete('/api/submissions/:id', ensureAuthenticated, ensureHasACORole, async (req, res) => {
  try {
    const userId = req.user.id;
    const submissionId = req.params.id;

    // Find subscription and verify ownership
    const subscription = db.prepare('SELECT * FROM service_subscriptions WHERE id = ? AND user_id = ?').get(submissionId, userId);

    if (!subscription) {
      return res.status(404).json({ error: 'Submission not found or you do not have permission to delete it' });
    }

    // Get user and service info before deletion
    const user = db.prepare('SELECT discord_username, discord_id FROM users WHERE id = ?').get(userId);
    const servicePanelInfo = db.prepare('SELECT service_name FROM service_panels WHERE service_id = ?').get(subscription.service_name);
    const serviceName = servicePanelInfo ? servicePanelInfo.service_name : subscription.service_name;

    // Get encrypted credentials to show email and name in notification
    const creds = db.prepare('SELECT encrypted_username, encrypted_password FROM encrypted_credentials WHERE subscription_id = ?').get(submissionId);
    let userEmail = 'N/A';
    let fullName = 'N/A';
    if (creds) {
      if (creds.encrypted_username) {
        try {
          userEmail = decrypt(creds.encrypted_username);
        } catch (e) {
          console.error('Error decrypting email for notification:', e);
        }
      }
      if (creds.encrypted_password) {
        try {
          const decryptedData = decrypt(creds.encrypted_password);
          const parsedData = JSON.parse(decryptedData);
          fullName = `${parsedData.first_name || ''} ${parsedData.last_name || ''}`.trim() || 'N/A';
        } catch (e) {
          console.error('Error decrypting name for notification:', e);
        }
      }
    }

    // Delete (cascade will handle credentials)
    db.prepare('DELETE FROM service_subscriptions WHERE id = ?').run(submissionId);

    // Send Discord notification for deletion
    await sendUrgentDiscordNotification(
      'SUBMISSION DELETED',
      `A user has deleted their submission for **${serviceName}**`,
      [
        { name: 'User', value: user?.discord_username || 'Unknown', inline: true },
        { name: 'Discord ID', value: user?.discord_id || 'N/A', inline: true },
        { name: 'Name', value: fullName, inline: true },
        { name: 'Service', value: serviceName, inline: true },
        { name: 'Email', value: userEmail, inline: true },
        { name: 'Submission ID', value: `${submissionId}`, inline: true },
        { name: 'Deleted At', value: new Date().toLocaleString(), inline: false }
      ],
      0xFF0000  // Red color for delete
    );

    res.json({
      success: true,
      message: 'Submission deleted successfully!'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// PUT /api/submissions/:id/toggle-bot - Toggle added_to_bot flag
router.put('/api/submissions/:id/toggle-bot', ensureAuthenticated, ensureHasACORole, async (req, res) => {
  try {
    const userId = req.user.id;
    const submissionId = req.params.id;
    const { added_to_bot } = req.body;

    // Find subscription and verify ownership
    const subscription = db.prepare('SELECT * FROM service_subscriptions WHERE id = ? AND user_id = ?').get(submissionId, userId);

    if (!subscription) {
      return res.status(404).json({ error: 'Submission not found or you do not have permission to edit it' });
    }

    // Update added_to_bot flag
    db.prepare(`
      UPDATE service_subscriptions
      SET added_to_bot = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(added_to_bot, submissionId);

    res.json({
      success: true,
      message: added_to_bot ? 'Marked as added to bot' : 'Unmarked from bot'
    });

  } catch (error) {
    console.error('Toggle bot error:', error);
    res.status(500).json({ error: 'Failed to update added_to_bot flag' });
  }
});

// POST /api/submissions/:id/toggle-running - Toggle keep_running flag
router.post('/:id/toggle-running', ensureAuthenticated, ensureHasACORole, async (req, res) => {
  try {
    const userId = req.user.id;
    const submissionId = req.params.id;
    const { keep_running } = req.body;

    // Verify ownership
    const submission = db.prepare(`
      SELECT * FROM service_subscriptions
      WHERE id = ? AND user_id = ?
    `).get(submissionId, userId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found or access denied' });
    }

    // Update keep_running flag
    db.prepare(`
      UPDATE service_subscriptions
      SET keep_running = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(keep_running ? 1 : 0, submissionId);

    res.json({
      success: true,
      keep_running: keep_running ? 1 : 0,
      message: keep_running ? 'Profile will keep running' : 'Profile will stop after next checkout'
    });

  } catch (error) {
    console.error('Toggle keep running error:', error);
    res.status(500).json({ error: 'Failed to update keep_running flag' });
  }
});

module.exports = router;
