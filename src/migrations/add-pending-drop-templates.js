const db = require('../config/database');

console.log('Creating pending_drop_templates table...');

try {
  // Create pending_drop_templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_drop_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      guild_id TEXT,
      message_url TEXT,
      drop_name TEXT,
      description TEXT,
      raw_message_content TEXT,
      embed_data TEXT,
      images TEXT,
      urls TEXT,
      extracted_skus TEXT,
      created_by_discord_id TEXT,
      created_by_discord_username TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      rejection_reason TEXT,
      converted_drop_id INTEGER,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (converted_drop_id) REFERENCES drops(id) ON DELETE SET NULL
    )
  `);
  console.log('✓ Created pending_drop_templates table');

  // Create indexes for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_pending_templates_status ON pending_drop_templates(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_pending_templates_message ON pending_drop_templates(message_id)`);
  console.log('✓ Created indexes for pending_drop_templates');

  console.log('Pending drop templates migration completed successfully!');
} catch (error) {
  console.error('Error in pending drop templates migration:', error.message);
  throw error;
}

module.exports = db;
