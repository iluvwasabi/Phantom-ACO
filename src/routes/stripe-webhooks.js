const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Initialize Stripe only if API key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /webhooks/stripe - Handle Stripe webhook events
router.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Check if Stripe is configured
    if (!stripe) {
      console.warn('⚠️ Stripe webhook received but Stripe is not configured');
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'invoice.paid':
        // Invoice was paid - mark order as complete
        const paidInvoice = event.data.object;

        const order = db.prepare('SELECT * FROM orders WHERE stripe_invoice_id = ?')
          .get(paidInvoice.id);

        if (order) {
          // Mark order as paid
          db.prepare(`
            UPDATE orders
            SET status = 'paid', payment_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(order.id);

          console.log(`✅ Order ${order.id} paid - $${order.fee_amount}`);

          // Increment user's successful orders count and check for milestone
          if (order.user_id) {
            const user = db.prepare(`
              UPDATE users
              SET successful_orders_count = successful_orders_count + 1
              WHERE id = ?
              RETURNING successful_orders_count, notified_at_5_orders, discord_username
            `).get(order.user_id);

            if (user) {
              console.log(`📊 User ${user.discord_username} now has ${user.successful_orders_count} successful orders`);

              // Check if user reached 5 orders and hasn't been notified
              if (user.successful_orders_count === 5 && user.notified_at_5_orders === 0) {
                // Send Discord notification to admin
                const webhook = process.env.ADMIN_DISCORD_WEBHOOK;
                if (webhook) {
                  try {
                    await fetch(webhook, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        embeds: [{
                          title: '🎉 Milestone: User Reached 5 Successful Orders',
                          color: 0x10b981,  // Green
                          fields: [
                            { name: 'User', value: user.discord_username || 'Unknown', inline: true },
                            { name: 'Total Orders', value: '5', inline: true },
                            { name: 'Action', value: 'Consider compensation/reward', inline: false }
                          ],
                          timestamp: new Date().toISOString()
                        }]
                      })
                    });

                    console.log(`🎉 Sent 5-order milestone notification for ${user.discord_username}`);
                  } catch (error) {
                    console.error('Failed to send Discord notification:', error);
                  }
                }

                // Mark as notified
                db.prepare(`UPDATE users SET notified_at_5_orders = 1 WHERE id = ?`).run(order.user_id);
              }
            }
          }

          // Auto-disable keep_running for this submission
          if (order.submission_id) {
            db.prepare(`
              UPDATE service_subscriptions
              SET keep_running = 0, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(order.submission_id);

            console.log(`🔄 Auto-disabled keep_running for submission ${order.submission_id}`);
          }
        }
        break;

      case 'invoice.payment_failed':
        // Invoice payment failed - send reminder
        const failedInvoice = event.data.object;

        const unpaidOrder = db.prepare('SELECT * FROM orders WHERE stripe_invoice_id = ?')
          .get(failedInvoice.id);

        if (unpaidOrder) {
          db.prepare(`
            UPDATE orders
            SET status = 'payment_failed'
            WHERE id = ?
          `).run(unpaidOrder.id);

          console.log(`⚠️ Order ${unpaidOrder.id} payment failed`);

          // TODO: Send payment reminder
        }
        break;

      case 'checkout.session.completed':
        // Payment successful for subscription (if you add upfront payments later)
        const session = event.data.object;

        // Get customer email from session
        const customerEmail = session.customer_details.email;

        // Find user by email
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(customerEmail);

        if (user) {
          // Update user to paid status
          db.prepare(`
            UPDATE users
            SET payment_status = 'paid',
                subscription_tier = 'premium',
                customer_id = ?,
                payment_method = 'stripe'
            WHERE id = ?
          `).run(session.customer, user.id);

          console.log(`✅ User ${user.discord_username} (${customerEmail}) upgraded to premium`);
        } else {
          console.error(`❌ No user found with email: ${customerEmail}`);
        }
        break;

      case 'customer.subscription.deleted':
        // Subscription cancelled - downgrade user
        const subscription = event.data.object;

        const cancelledUser = db.prepare('SELECT * FROM users WHERE customer_id = ?')
          .get(subscription.customer);

        if (cancelledUser) {
          db.prepare(`
            UPDATE users
            SET payment_status = 'cancelled',
                subscription_tier = 'free'
            WHERE id = ?
          `).run(cancelledUser.id);

          console.log(`❌ User ${cancelledUser.discord_username} subscription cancelled`);
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    res.json({ received: true });
  }
);

module.exports = router;
