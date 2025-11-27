const db = require('../config/database');

console.log('Creating TOS acceptance table...');

try {
  // Create TOS acceptances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tos_acceptances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tos_version TEXT NOT NULL DEFAULT 'v1.0',
      accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✓ Created tos_acceptances table');

  // Add index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tos_user_version
    ON tos_acceptances(user_id, tos_version)
  `);

  console.log('✓ Created index on tos_acceptances');
  console.log('TOS table migration completed successfully!');

} catch (error) {
  console.error('Error creating TOS table:', error.message);
  process.exit(1);
}
