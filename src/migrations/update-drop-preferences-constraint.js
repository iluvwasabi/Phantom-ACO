const db = require('../config/database');

console.log('Updating drop_preferences unique constraint to include submission_id...');

try {
  // SQLite doesn't support ALTER TABLE to modify constraints
  // We need to recreate the table with the new constraint

  // Create new table with updated constraint
  db.exec(`
    CREATE TABLE IF NOT EXISTS drop_preferences_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drop_id INTEGER NOT NULL,
      user_id INTEGER,
      discord_id TEXT NOT NULL,
      discord_username TEXT,
      sku TEXT NOT NULL,
      submission_id INTEGER,
      opted_in INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(drop_id, discord_id, sku, submission_id),
      FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (submission_id) REFERENCES service_subscriptions(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Created new drop_preferences table with updated constraint');

  // Copy data from old table to new table
  db.exec(`
    INSERT OR IGNORE INTO drop_preferences_new
    (id, drop_id, user_id, discord_id, discord_username, sku, submission_id, opted_in, created_at, updated_at)
    SELECT id, drop_id, user_id, discord_id, discord_username, sku, submission_id, opted_in, created_at, updated_at
    FROM drop_preferences
  `);
  console.log('✓ Copied data to new table');

  // Drop old table
  db.exec(`DROP TABLE IF EXISTS drop_preferences`);
  console.log('✓ Dropped old table');

  // Rename new table to original name
  db.exec(`ALTER TABLE drop_preferences_new RENAME TO drop_preferences`);
  console.log('✓ Renamed new table');

  // Recreate indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_drop_preferences_drop_id ON drop_preferences(drop_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_drop_preferences_discord_id ON drop_preferences(discord_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_drop_preferences_drop_sku ON drop_preferences(drop_id, sku)`);
  console.log('✓ Recreated indexes');

  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error in migration:', error.message);
  throw error;
}

module.exports = db;
