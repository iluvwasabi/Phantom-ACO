const db = require('../config/database');

console.log('Creating drop preference system tables...');

try {
  // Create drops table
  db.exec(`
    CREATE TABLE IF NOT EXISTS drops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drop_name TEXT NOT NULL,
      description TEXT,
      drop_date DATETIME,
      discord_message_id TEXT UNIQUE,
      discord_channel_id TEXT,
      skus TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER
    )
  `);
  console.log('✓ Created drops table');

  // Create drop_preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS drop_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drop_id INTEGER NOT NULL,
      user_id INTEGER,
      discord_id TEXT NOT NULL,
      discord_username TEXT,
      sku TEXT NOT NULL,
      opted_in INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(drop_id, discord_id, sku),
      FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('✓ Created drop_preferences table');

  // Create indexes for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_drop_preferences_drop_id ON drop_preferences(drop_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_drop_preferences_discord_id ON drop_preferences(discord_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_drop_preferences_drop_sku ON drop_preferences(drop_id, sku)`);
  console.log('✓ Created indexes for drop_preferences');

  console.log('Drop preference migration completed successfully!');
} catch (error) {
  console.error('Error in drop preference migration:', error.message);
  throw error;
}

module.exports = db;
