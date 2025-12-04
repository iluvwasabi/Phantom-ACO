const db = require('../config/database');

function up() {
  console.log('Adding successful orders counter columns to users table...');

  db.prepare(`
    ALTER TABLE users
    ADD COLUMN successful_orders_count INTEGER DEFAULT 0
  `).run();

  db.prepare(`
    ALTER TABLE users
    ADD COLUMN notified_at_5_orders INTEGER DEFAULT 0
  `).run();

  console.log('✅ Successful orders counter columns added successfully');
}

function down() {
  console.log('Removing successful orders counter columns from users table...');

  // SQLite doesn't support DROP COLUMN easily, would need to recreate table
  console.log('⚠️  Rollback not implemented for SQLite ALTER TABLE DROP COLUMN');
}

module.exports = { up, down };
