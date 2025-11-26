const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || './data/aco.db';
const db = new Database(dbPath);

console.log('Starting database migration...');

// Enable foreign keys
db.pragma('foreign_keys = OFF');

// Drop and recreate service_subscriptions table without unique constraint
db.exec(`
  -- Create temporary table with new schema
  CREATE TABLE service_subscriptions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    service_name TEXT NOT NULL,
    form_submission_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Copy data from old table
  INSERT INTO service_subscriptions_new
  SELECT id, user_id, service_type, service_name, form_submission_id, created_at, updated_at, status
  FROM service_subscriptions;

  -- Drop old table
  DROP TABLE service_subscriptions;

  -- Rename new table
  ALTER TABLE service_subscriptions_new RENAME TO service_subscriptions;
`);

db.pragma('foreign_keys = ON');

console.log('Migration completed successfully!');
console.log('Users can now create multiple submissions for the same service.');

db.close();
