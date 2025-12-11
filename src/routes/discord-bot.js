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

    // Don't try to match to submissions - just use the checkout email directly
    console.log(`📧 Using checkout email: ${email}`);

    // Calculate 8% fee with $5 minimum
    const orderTotal = price * (quantity || 1);
    const calculatedFee = orderTotal * 0.08;
    const feeAmount = Math.max(calculatedFee, 5).toFixed(2);

    if (calculatedFee < 5) {
      console.log(`💰 Order total: $${orderTotal} → Fee: $${feeAmount} (minimum $5 fee applied)`);
    } else {
      console.log(`💰 Order total: $${orderTotal} → Fee: $${feeAmount} (8%)`);
    }

    // Create order record in "pending_review" status with checkout email
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
        email,
        status,
        order_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?)
    `).run(
      null,  // No submission link
      null,  // No user link
      retailer,
      product,
      orderNumber,
      orderTotal,
      feeAmount,
      8,
      email,  // Store checkout email
      timestamp || new Date().toISOString()
    );

    const orderId = orderResult.lastInsertRowid;

    console.log(`✅ Created order ${orderId} with email ${email} - awaiting admin approval`);

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
                { name: 'Email', value: email || 'N/A', inline: true },
                { name: 'Retailer', value: retailer, inline: true },
                { name: 'Product', value: product, inline: false },
                { name: 'Order Total', value: `$${orderTotal}`, inline: true },
                { name: 'Fee', value: `$${feeAmount} (${calculatedFee < 5 ? '$5 min' : '8%'})`, inline: true },
                { name: 'Order #', value: orderNumber || 'N/A', inline: true }
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
      email: email
    });

  } catch (error) {
    console.error('Discord bot checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/discord-bot/send-dm - Queue invoice DM for user
router.post('/api/discord-bot/send-dm', express.json(), verifyBotSecret, async (req, res) => {
  try {
    const {
      discord_id,
      discord_username,
      product_name,
      retailer,
      order_total,
      fee_amount,
      order_number,
      invoice_url
    } = req.body;

    console.log(`📧 DM request received for ${discord_username} (${discord_id})`);

    // Store this data in a global queue for the Discord bot to process
    global.dmQueue = global.dmQueue || [];
    global.dmQueue.push({
      discord_id,
      discord_username,
      product_name,
      retailer,
      order_total,
      fee_amount,
      order_number,
      invoice_url,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      message: 'DM queued for delivery'
    });

  } catch (error) {
    console.error('Send invoice DM error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discord-bot/dm-queue - Get and clear DM queue
router.get('/api/discord-bot/dm-queue', verifyBotSecret, (req, res) => {
  try {
    global.dmQueue = global.dmQueue || [];

    // Return queue and clear it
    const queue = [...global.dmQueue];
    global.dmQueue = [];

    res.json({
      success: true,
      queue: queue
    });

  } catch (error) {
    console.error('Get DM queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== DROP PREFERENCE ENDPOINTS ====================

// POST /api/discord-bot/drop-interaction - Handle button clicks to toggle SKU preferences
router.post('/api/discord-bot/drop-interaction', express.json(), verifyBotSecret, async (req, res) => {
  try {
    const {
      drop_id,
      discord_id,
      discord_username,
      sku,
      action // 'toggle' or 'get_all'
    } = req.body;

    console.log(`📋 Drop interaction: User ${discord_username} (${discord_id}) - Drop ${drop_id} - SKU ${sku} - Action: ${action}`);

    // Find or create user record
    let user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);
    let userId = user ? user.id : null;

    if (action === 'toggle') {
      // Toggle preference
      const existing = db.prepare(`
        SELECT * FROM drop_preferences
        WHERE drop_id = ? AND discord_id = ? AND sku = ?
      `).get(drop_id, discord_id, sku);

      if (existing) {
        // Toggle the opted_in value
        db.prepare(`
          UPDATE drop_preferences
          SET opted_in = NOT opted_in, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(existing.id);

        console.log(`✅ Toggled preference for ${sku}: ${existing.opted_in ? 'opted out' : 'opted in'}`);

        res.json({
          success: true,
          opted_in: !existing.opted_in
        });
      } else {
        // Create new preference (default opted in)
        db.prepare(`
          INSERT INTO drop_preferences (drop_id, user_id, discord_id, discord_username, sku, opted_in)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(drop_id, userId, discord_id, discord_username, sku);

        console.log(`✅ Created new preference for ${sku}: opted in`);

        res.json({
          success: true,
          opted_in: true
        });
      }
    } else if (action === 'get_all') {
      // Get all preferences for this user and drop
      const preferences = db.prepare(`
        SELECT sku, opted_in
        FROM drop_preferences
        WHERE drop_id = ? AND discord_id = ?
      `).all(drop_id, discord_id);

      const prefMap = {};
      preferences.forEach(pref => {
        prefMap[pref.sku] = pref.opted_in === 1;
      });

      res.json({
        success: true,
        preferences: prefMap
      });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Drop interaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discord-bot/drop-preferences/:dropId/:discordId - Get user's current preferences for a drop
router.get('/api/discord-bot/drop-preferences/:dropId/:discordId', verifyBotSecret, async (req, res) => {
  try {
    const { dropId, discordId } = req.params;

    const drop = db.prepare('SELECT * FROM drops WHERE id = ?').get(dropId);

    if (!drop) {
      return res.status(404).json({ error: 'Drop not found' });
    }

    const skus = JSON.parse(drop.skus || '[]');

    // Get user's preferences
    const preferences = db.prepare(`
      SELECT sku, opted_in
      FROM drop_preferences
      WHERE drop_id = ? AND discord_id = ?
    `).all(dropId, discordId);

    const prefMap = {};
    preferences.forEach(pref => {
      prefMap[pref.sku] = pref.opted_in === 1;
    });

    res.json({
      success: true,
      drop_id: drop.id,
      drop_name: drop.drop_name,
      skus: skus,
      preferences: prefMap
    });

  } catch (error) {
    console.error('Get drop preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/post-drop-announcement - Endpoint for Discord bot to receive drop announcements from admin
// This endpoint will be called by admin.js when posting a drop
// The Discord bot will listen for requests to this endpoint and post the message
router.post('/api/post-drop-announcement', express.json(), verifyBotSecret, async (req, res) => {
  try {
    const {
      drop_id,
      drop_name,
      description,
      drop_date,
      sku_list,
      sku_count,
      channel_id
    } = req.body;

    console.log(`📢 Received drop announcement request: ${drop_name}`);

    // Store this in a global queue for the Discord bot to process
    // The Discord bot application will need to poll this queue or handle it via webhook
    global.dropAnnouncementQueue = global.dropAnnouncementQueue || [];
    global.dropAnnouncementQueue.push({
      drop_id,
      drop_name,
      description,
      drop_date,
      sku_list,
      sku_count,
      channel_id,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Drop announcement queued for posting to channel ${channel_id}`);

    // NOTE: In a real implementation, you would:
    // 1. Have your Discord bot application poll this queue
    // 2. Or use a webhook to notify the bot immediately
    // 3. Return the actual message_id after the bot posts it
    // For now, we'll return a placeholder message_id
    res.json({
      success: true,
      message: 'Drop announcement queued for posting',
      message_id: `placeholder_${drop_id}_${Date.now()}`,
      note: 'Discord bot needs to poll /api/discord-bot/get-drop-queue to post this announcement'
    });

  } catch (error) {
    console.error('Post drop announcement error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discord-bot/get-drop-queue - Discord bot polls this to get announcements to post
router.get('/api/discord-bot/get-drop-queue', verifyBotSecret, async (req, res) => {
  try {
    const queue = global.dropAnnouncementQueue || [];

    // Clear the queue after sending
    global.dropAnnouncementQueue = [];

    res.json({
      success: true,
      announcements: queue
    });

  } catch (error) {
    console.error('Get drop queue error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
