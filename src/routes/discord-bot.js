const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware to verify Discord bot requests
function verifyBotSecret(req, res, next) {
  const botSecret = req.headers['x-bot-secret'];

  if (!botSecret || botSecret !== process.env.DISCORD_BOT_API_SECRET) {
    console.warn('⚠️ Unauthorized Discord bot request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// POST /api/discord-bot/checkout - Receive checkout from Discord bot
router.post('/api/discord-bot/checkout', express.json(), verifyBotSecret, async (req, res) => {
  try {
    const {
      bot,
      retailer,
      product,
      price,
      orderNumber,
      email,
      profile,
      quantity,
      timestamp
    } = req.body;

    console.log('📨 Received checkout from Discord bot:', {
      bot,
      retailer,
      product,
      price,
      email
    });

    // Find user by email from their submissions
    let user = null;
    let submissionId = null;

    if (email) {
      // Try to find user by the email in their encrypted credentials
      const submissions = db.prepare(`
        SELECT ss.id, ss.user_id, u.email, u.discord_username, u.customer_id
        FROM service_subscriptions ss
        JOIN users u ON u.id = ss.user_id
        LEFT JOIN encrypted_credentials ec ON ec.subscription_id = ss.id
        WHERE ss.service_name = ?
      `).all(retailer.toLowerCase());

      // We need to decrypt and check each submission's email
      const CryptoJS = require('crypto-js');
      function decrypt(ciphertext) {
        try {
          const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
          return bytes.toString(CryptoJS.enc.Utf8);
        } catch (e) {
          return null;
        }
      }

      for (const sub of submissions) {
        const credentials = db.prepare('SELECT encrypted_password FROM encrypted_credentials WHERE subscription_id = ?').get(sub.id);

        if (credentials && credentials.encrypted_password) {
          try {
            const decryptedPassword = decrypt(credentials.encrypted_password);
            if (decryptedPassword && decryptedPassword.startsWith('{')) {
              const parsed = JSON.parse(decryptedPassword);
              const subEmail = parsed.email || parsed.account_email;

              if (subEmail && subEmail.toLowerCase() === email.toLowerCase()) {
                user = sub;
                submissionId = sub.id;
                console.log(`✅ Matched email ${email} to submission ${submissionId}`);
                break;
              }
            }
          } catch (e) {
            // Skip this submission
            continue;
          }
        }
      }
    }

    // If no user found by email, try to match by profile name or create generic order
    if (!user) {
      console.log(`⚠️  Could not match email ${email} to any submission`);
      // We'll create the order without linking to a specific user submission
      // Admin can manually link it later
    }

    // Calculate 7% fee
    const orderTotal = price * (quantity || 1);
    const feeAmount = (orderTotal * 0.07).toFixed(2);

    console.log(`💰 Order total: $${orderTotal} → Fee: $${feeAmount} (7%)`);

    // Create order record in "pending_review" status
    const orderResult = db.prepare(`
      INSERT INTO orders (
        submission_id,
        user_id,
        retailer,
        product_name,
        order_number,
        order_total,
        fee_amount,
        fee_percentage,
        status,
        order_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?)
    `).run(
      submissionId,
      user ? user.user_id : null,
      retailer,
      product,
      orderNumber,
      orderTotal,
      feeAmount,
      7,
      timestamp || new Date().toISOString()
    );

    const orderId = orderResult.lastInsertRowid;

    console.log(`✅ Created order ${orderId} - awaiting admin approval`);

    // Send Discord notification to admin (if webhook configured)
    const discordWebhook = process.env.ADMIN_DISCORD_WEBHOOK;
    if (discordWebhook) {
      try {
        await fetch(discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '📋 New Order Pending Review',
              color: 0xf59e0b, // Orange
              fields: [
                { name: 'Order ID', value: `#${orderId}`, inline: true },
                { name: 'Bot', value: bot, inline: true },
                { name: 'Customer', value: user ? user.discord_username : 'Unknown', inline: true },
                { name: 'Retailer', value: retailer, inline: true },
                { name: 'Product', value: product, inline: false },
                { name: 'Order Total', value: `$${orderTotal}`, inline: true },
                { name: 'Fee (7%)', value: `$${feeAmount}`, inline: true },
                { name: 'Order #', value: orderNumber || 'N/A', inline: true },
                { name: 'Email', value: email || 'N/A', inline: false }
              ],
              footer: { text: `Review at: ${process.env.APP_URL}/admin/orders` },
              timestamp: new Date().toISOString()
            }]
          })
        });
      } catch (error) {
        console.error('Discord notification error:', error);
      }
    }

    res.json({
      success: true,
      order_id: orderId,
      status: 'pending_review',
      matched_user: !!user,
      submission_id: submissionId
    });

  } catch (error) {
    console.error('Discord bot checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
