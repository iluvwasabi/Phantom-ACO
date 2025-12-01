const db = require('../config/database');
const bcrypt = require('bcryptjs');

console.log('Setting up admin accounts and assignment tracking...\n');

// Migration 1: Add assigned_to column to service_subscriptions
console.log('=== Adding assigned_to column ===');
try {
  db.exec(`ALTER TABLE service_subscriptions ADD COLUMN assigned_to TEXT;`);
  console.log('✓ Added assigned_to column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ assigned_to column already exists');
  } else {
    console.error('✗ Error adding assigned_to:', e.message);
  }
}

// Migration 2: Create admin accounts for Desi and Ivan
console.log('\n=== Creating Admin Accounts ===');

// Hash passwords
const desiPasswordHash = bcrypt.hashSync('IDphantom@209425!', 10);
const ivanPasswordHash = bcrypt.hashSync('IDphantom@209425', 10);

// Check if Desi's account exists
const desiExists = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('Desi');
if (desiExists) {
  // Update password
  db.prepare('UPDATE admin_users SET password_hash = ?, is_active = 1 WHERE username = ?').run(desiPasswordHash, 'Desi');
  console.log('✓ Updated Desi\'s admin account');
} else {
  // Create new account
  db.prepare('INSERT INTO admin_users (username, password_hash, is_active) VALUES (?, ?, 1)').run('Desi', desiPasswordHash);
  console.log('✓ Created Desi\'s admin account');
}

// Check if Ivan's account exists
const ivanExists = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('Ivan');
if (ivanExists) {
  // Update password
  db.prepare('UPDATE admin_users SET password_hash = ?, is_active = 1 WHERE username = ?').run(ivanPasswordHash, 'Ivan');
  console.log('✓ Updated Ivan\'s admin account');
} else {
  // Create new account
  db.prepare('INSERT INTO admin_users (username, password_hash, is_active) VALUES (?, ?, 1)').run('Ivan', ivanPasswordHash);
  console.log('✓ Created Ivan\'s admin account');
}

console.log('\n✅ Admin setup completed successfully!');
console.log('\nAdmin Accounts:');
console.log('  Username: Desi | Password: IDphantom@209425!');
console.log('  Username: Ivan | Password: IDphantom@209425');
console.log('\nYou can now log in at: https://phantomaco.com/admin/login');
