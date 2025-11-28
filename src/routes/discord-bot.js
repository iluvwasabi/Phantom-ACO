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

    // Calculate 7% fee with $4 minimum
    const orderTotal = price * (quantity || 1);
    const calculatedFee = orderTotal * 0.07;
    const feeAmount = Math.max(calculatedFee, 4).toFixed(2);

    if (calculatedFee < 4) {
      console.log(`💰 Order total: $${orderTotal} → Fee: $${feeAmount} (minimum $4 fee applied)`);
    } else {
      console.log(`💰 Order total: $${orderTotal} → Fee: $${feeAmount} (7%)`);
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
      7,
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
                { name: 'Fee', value: `$${feeAmount} (${calculatedFee < 4 ? '$4 min' : '7%'})`, inline: true },
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

module.exports = router;
