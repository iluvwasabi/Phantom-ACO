const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database');

// POST /webhooks/stripe - Handle Stripe webhook events
router.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
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
          db.prepare(`
            UPDATE orders
            SET status = 'paid', payment_date = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(order.id);

          console.log(`✅ Order ${order.id} paid - $${order.fee_amount}`);

          // TODO: Send thank you message to customer
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
