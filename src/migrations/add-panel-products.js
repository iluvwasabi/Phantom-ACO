const db = require('../config/database');

function up() {
  console.log('Adding products column to service_panels table...');

  db.prepare(`
    ALTER TABLE service_panels
    ADD COLUMN products TEXT DEFAULT '[]'
  `).run();

  console.log('✅ Products column added successfully');
}

function down() {
  console.log('Removing products column from service_panels table...');

  // SQLite doesn't support DROP COLUMN easily, would need to recreate table
  console.log('⚠️  Rollback not implemented for SQLite ALTER TABLE DROP COLUMN');
}

module.exports = { up, down };
