const db = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

class Service {
  static SERVICES = {
    LOGIN_REQUIRED: {
      target: { name: 'Target', icon: 'target.png' },
      walmart: { name: 'Walmart', icon: 'walmart.png' },
      bestbuy: { name: 'Best Buy', icon: 'bestbuy.png' }
    },
    NO_LOGIN: {
      pokemoncenter: { name: 'Pokemon Center', icon: 'pokemoncenter.png' },
      shopify: { name: 'Shopify Sites', icon: 'shopify.png' }
    }
  };

  static createSubscription(userId, serviceType, serviceName, formSubmissionId = null) {
    const stmt = db.prepare(`
      INSERT INTO service_subscriptions (user_id, service_type, service_name, form_submission_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, service_name) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP,
        status = 'active',
        form_submission_id = excluded.form_submission_id
    `);

    const result = stmt.run(userId, serviceType, serviceName, formSubmissionId);
    return result.lastInsertRowid || db.prepare(
      'SELECT id FROM service_subscriptions WHERE user_id = ? AND service_name = ?'
    ).get(userId, serviceName).id;
  }

  static saveCredentials(subscriptionId, credentials) {
    const stmt = db.prepare(`
      INSERT INTO encrypted_credentials (subscription_id, encrypted_username, encrypted_password, encrypted_imap)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(subscription_id) DO UPDATE SET
        encrypted_username = excluded.encrypted_username,
        encrypted_password = excluded.encrypted_password,
        encrypted_imap = excluded.encrypted_imap,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      subscriptionId,
      encrypt(credentials.username),
      encrypt(credentials.password),
      encrypt(credentials.imap)
    );
  }

  static getSubscription(userId, serviceName) {
    return db.prepare(`
      SELECT * FROM service_subscriptions
      WHERE user_id = ? AND service_name = ?
    `).get(userId, serviceName);
  }

  static getUserSubscriptions(userId) {
    return db.prepare(`
      SELECT * FROM service_subscriptions
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `).all(userId);
  }

  static getCredentials(subscriptionId) {
    const encrypted = db.prepare(`
      SELECT * FROM encrypted_credentials
      WHERE subscription_id = ?
    `).get(subscriptionId);

    if (!encrypted) return null;

    return {
      username: decrypt(encrypted.encrypted_username),
      password: decrypt(encrypted.encrypted_password),
      imap: decrypt(encrypted.encrypted_imap)
    };
  }

  static logFormSubmission(userId, formType, serviceName, formUrl) {
    const stmt = db.prepare(`
      INSERT INTO form_submissions (user_id, form_type, service_name, form_url)
      VALUES (?, ?, ?, ?)
    `);

    return stmt.run(userId, formType, serviceName, formUrl);
  }

  static deleteSubscription(userId, serviceName) {
    const stmt = db.prepare(`
      UPDATE service_subscriptions
      SET status = 'inactive'
      WHERE user_id = ? AND service_name = ?
    `);

    return stmt.run(userId, serviceName);
  }

  static getAllServices() {
    // Fetch service panels from database to get descriptions
    const panels = db.prepare('SELECT * FROM service_panels WHERE is_active = 1 ORDER BY display_order').all();

    // Create a map of panel data by service_id
    const panelMap = {};
    panels.forEach(panel => {
      panelMap[panel.service_id] = panel;
    });

    // Merge static data with database panel data
    const services = {
      LOGIN_REQUIRED: {},
      NO_LOGIN: {}
    };

    Object.entries(this.SERVICES.LOGIN_REQUIRED).forEach(([key, value]) => {
      services.LOGIN_REQUIRED[key] = {
        ...value,
        description: panelMap[key]?.description || '',
        color_gradient: panelMap[key]?.color_gradient || ''
      };
    });

    Object.entries(this.SERVICES.NO_LOGIN).forEach(([key, value]) => {
      services.NO_LOGIN[key] = {
        ...value,
        description: panelMap[key]?.description || '',
        color_gradient: panelMap[key]?.color_gradient || ''
      };
    });

    return services;
  }

  static getServicesByType(type) {
    return type === 'login' ? this.SERVICES.LOGIN_REQUIRED : this.SERVICES.NO_LOGIN;
  }
}

module.exports = Service;
