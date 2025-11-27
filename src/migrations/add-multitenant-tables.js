const db = require('../config/database');

console.log('Creating multi-tenant tables...');

try {
  // Create registered_servers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS registered_servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE NOT NULL,
      server_name TEXT NOT NULL,
      required_role_name TEXT DEFAULT 'ACO',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Created registered_servers table');

  // Create admin_users table (for password-based admin authentication)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active INTEGER DEFAULT 1
    )
  `);
  console.log('✓ Created admin_users table');

  // Add server_id column to users table to track which server they authenticated from
  try {
    db.exec(`ALTER TABLE users ADD COLUMN server_id TEXT;`);
    console.log('✓ Added server_id to users table');
  } catch (e) {
    if (!e.message.includes('duplicate')) {
      console.log('✓ server_id column already exists');
    }
  }

  // If DISCORD_SERVER_ID env var exists, add it as the first registered server
  if (process.env.DISCORD_SERVER_ID) {
    const existingServer = db.prepare('SELECT * FROM registered_servers WHERE server_id = ?').get(process.env.DISCORD_SERVER_ID);

    if (!existingServer) {
      db.prepare(`
        INSERT INTO registered_servers (server_id, server_name, required_role_name)
        VALUES (?, ?, ?)
      `).run(process.env.DISCORD_SERVER_ID, 'Primary Server', 'ACO');
      console.log('✓ Added primary Discord server to registered_servers');
    }
  }

  console.log('Multi-tenant migration completed successfully!');
} catch (error) {
  console.error('Error in multi-tenant migration:', error.message);
  throw error;
}

module.exports = db;
