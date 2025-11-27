require('dotenv').config();
const db = require('./src/config/database');
const bcrypt = require('bcrypt');

console.log('🔧 Checking admin user...');

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'Pokemon123!desi';

async function ensureAdminExists() {
  try {
    // Check if admin user already exists
    const existingAdmin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(DEFAULT_USERNAME);

    if (existingAdmin) {
      console.log('✅ Admin user exists');

      // Always reset password on startup for Render deployments
      const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      db.prepare(`
        UPDATE admin_users
        SET password_hash = ?, is_active = 1
        WHERE username = ?
      `).run(password_hash, DEFAULT_USERNAME);

      console.log('🔄 Admin password has been reset to default');
    } else {
      // Create new admin user
      console.log('➕ Creating admin user...');
      const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

      db.prepare(`
        INSERT INTO admin_users (username, password_hash, is_active)
        VALUES (?, ?, 1)
      `).run(DEFAULT_USERNAME, password_hash);

      console.log('✅ Admin user created');
    }

    console.log(`📋 Login: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`);

  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message);
    // Don't exit - let the server start anyway
  }
}

ensureAdminExists();
