const express = require('express');
const router = express.Router();
const db = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /webhooks/bot - Receive checkout success notifications from bot
router.post('/webhooks/bot', express.json(), async (req, res) => {
  try {
    const {
      event,
      profile_id,
      order_number,
      retailer,
      product_name,
      order_total,
      timestamp
    } = req.body;

    // Verify this is a success event
    if (event !== 'checkout_success') {
      return res.json({ received: true });
    }

    // Extract submission ID from profile_id (e.g., "profile_123" → 123)
    const submissionId = parseInt(profile_id.replace('profile_', ''));

    // Get submission and user data
    const submission = db.prepare(`
      SELECT ss.*, u.email, u.discord_username, u.customer_id, u.discord_id
      FROM service_subscriptions ss
      JOIN users u ON u.id = ss.user_id
      WHERE ss.id = ?
    `).get(submissionId);

    if (!submission) {
      console.error(`❌ Submission ${submissionId} not found`);
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Calculate 7% fee (but this might be wrong - admin will review)
    const feeAmount = (order_total * 0.07).toFixed(2);

    console.log(`📋 New order pending review: $${order_total} → Fee: $${feeAmount}`);

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
      submission.user_id,
      retailer,
      product_name,
      order_number,
      order_total,
      feeAmount,
      7,
      timestamp || new Date().toISOString()
    );

    const orderId = orderResult.lastInsertRowid;

    console.log(`✅ Order ${orderId} created - awaiting admin approval`);

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
                { name: 'Customer', value: submission.discord_username, inline: true },
                { name: 'Retailer', value: retailer, inline: true },
                { name: 'Order Total', value: `$${order_total}`, inline: true },
                { name: 'Fee (7%)', value: `$${feeAmount}`, inline: true },
                { name: 'Order #', value: order_number || 'N/A', inline: true }
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
      status: 'pending_review'
    });

  } catch (error) {
    console.error('Bot webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
