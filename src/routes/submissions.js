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
            const username = sub.encrypted_username ? decrypt(sub.encrypted_username) : null;
            const imap = sub.encrypted_imap ? decrypt(sub.encrypted_imap) : null;

            decryptedData = {
              account_email: username && username.trim() !== '' ? username : null,
              account_password: decryptedPassword,
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
      account_imap,
      notes
    } = req.body;

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

    // Create service subscription
    const subscriptionResult = db.prepare(`
      INSERT INTO service_subscriptions (user_id, service_type, service_name, status, notes)
      VALUES (?, ?, ?, 'active', ?)
    `).run(userId, account_email ? 'login_required' : 'no_login', service, notes || null);

    const subscriptionId = subscriptionResult.lastInsertRowid;

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
      account_imap,
      notes
    } = req.body;

    // Find existing subscription and verify ownership
    const subscription = db.prepare('SELECT * FROM service_subscriptions WHERE id = ? AND user_id = ?').get(submissionId, userId);

    if (!subscription) {
      return res.status(404).json({ error: 'Submission not found or you do not have permission to edit it' });
    }

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

    // Update subscription with notes and timestamp
    db.prepare('UPDATE service_subscriptions SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(notes || null, subscription.id);

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

    // Delete (cascade will handle credentials)
    db.prepare('DELETE FROM service_subscriptions WHERE id = ?').run(submissionId);

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

module.exports = router;
