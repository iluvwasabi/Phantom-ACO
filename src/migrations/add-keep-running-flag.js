const db = require('../config/database');

function up() {
  console.log('Adding keep_running column to service_subscriptions table...');

  db.prepare(`
    ALTER TABLE service_subscriptions
    ADD COLUMN keep_running INTEGER DEFAULT 1
  `).run();

  console.log('✅ Keep_running column added successfully');
}

function down() {
  console.log('Removing keep_running column from service_subscriptions table...');

  // SQLite doesn't support DROP COLUMN easily, would need to recreate table
  console.log('⚠️  Rollback not implemented for SQLite ALTER TABLE DROP COLUMN');
}

module.exports = { up, down };
