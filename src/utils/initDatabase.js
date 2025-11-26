#!/usr/bin/env node

/**
 * Database Initialization Script
 * Run this script to initialize or reset the database
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/aco.db';
const dbDir = path.dirname(dbPath);

console.log('ACO Service Database Initialization');
console.log('===================================\n');

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  console.log(`Creating data directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Check if database already exists
const dbExists = fs.existsSync(dbPath);
if (dbExists) {
  console.log('⚠️  Database already exists!');
  console.log(`Location: ${dbPath}`);
  console.log('\nOptions:');
  console.log('1. Backup existing database');
  console.log('2. Delete and recreate (WARNING: All data will be lost)');
  console.log('3. Exit\n');

  // For automation, we'll just exit if DB exists
  console.log('Exiting... Database already initialized.');
  console.log('To reset, manually delete the database file and run this script again.\n');
  process.exit(0);
}

console.log(`Creating new database: ${dbPath}\n`);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Creating tables...\n');

// Users table
console.log('✓ Creating users table');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE NOT NULL,
    discord_username TEXT NOT NULL,
    discord_discriminator TEXT,
    discord_avatar TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_verified INTEGER DEFAULT 0
  )
`);

// Service subscriptions table
console.log('✓ Creating service_subscriptions table');
db.exec(`
  CREATE TABLE IF NOT EXISTS service_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    service_name TEXT NOT NULL,
    form_submission_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, service_name)
  )
`);

// Encrypted credentials table
console.log('✓ Creating encrypted_credentials table');
db.exec(`
  CREATE TABLE IF NOT EXISTS encrypted_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    encrypted_username TEXT,
    encrypted_password TEXT,
    encrypted_imap TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id) ON DELETE CASCADE
  )
`);

// Form submissions log
console.log('✓ Creating form_submissions table');
db.exec(`
  CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    form_type TEXT NOT NULL,
    service_name TEXT NOT NULL,
    submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    form_url TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Session tracking
console.log('✓ Creating user_sessions table');
db.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create indexes for better performance
console.log('\nCreating indexes...\n');

console.log('✓ Creating index on users.discord_id');
db.exec('CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id)');

console.log('✓ Creating index on service_subscriptions.user_id');
db.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON service_subscriptions(user_id)');

console.log('✓ Creating index on form_submissions.user_id');
db.exec('CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id)');

console.log('✓ Creating index on user_sessions.session_id');
db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON user_sessions(session_id)');

// Verify tables were created
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

console.log('\n✅ Database initialized successfully!\n');
console.log('Created tables:');
tables.forEach(table => {
  console.log(`  - ${table.name}`);
});

console.log('\nDatabase location:', dbPath);
console.log('Database size:', fs.statSync(dbPath).size, 'bytes\n');

// Close database
db.close();

console.log('Initialization complete! You can now start the ACO Service.\n');
