const db = require('../config/database');

console.log('Running all pending migrations...\n');

// Migration 1: Add name fields
console.log('=== Migration 1: Adding name and billing fields ===');
try {
  db.exec(`ALTER TABLE users ADD COLUMN first_name TEXT;`);
  console.log('✓ Added first_name column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ first_name column already exists');
  } else {
    console.error('✗ Error adding first_name:', e.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN last_name TEXT;`);
  console.log('✓ Added last_name column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ last_name column already exists');
  } else {
    console.error('✗ Error adding last_name:', e.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN billing_same_as_shipping INTEGER DEFAULT 1;`);
  console.log('✓ Added billing_same_as_shipping column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ billing_same_as_shipping column already exists');
  } else {
    console.error('✗ Error adding billing_same_as_shipping:', e.message);
  }
}

// Migration 2: Add max qty and checkouts fields
console.log('\n=== Migration 2: Adding max_qty and max_checkouts fields ===');
try {
  db.exec(`ALTER TABLE users ADD COLUMN max_qty INTEGER DEFAULT 1;`);
  console.log('✓ Added max_qty column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ max_qty column already exists');
  } else {
    console.error('✗ Error adding max_qty:', e.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN max_checkouts INTEGER DEFAULT 1;`);
  console.log('✓ Added max_checkouts column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ max_checkouts column already exists');
  } else {
    console.error('✗ Error adding max_checkouts:', e.message);
  }
}

// Migration 3: Add assigned_to field and create admin accounts
console.log('\n=== Migration 3: Adding assigned_to field ===');
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

console.log('\n=== Creating Admin Accounts ===');

// Pre-hashed passwords (bcrypt rounds: 10)
const desiPasswordHash = '$2b$10$hAu1yW7nLGAlh8w/clvfWOOSLB.2VI/2fH4HVYWx/ujzO6rRf23Jm';
const ivanPasswordHash = '$2b$10$DCuDg2t.WlKPKS3WsVth3u9KSvkY8qVfhOeftDr/.zyxGgH.qCmpG';

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

console.log('\n✅ All migrations completed successfully!');
console.log('\nAdmin Accounts:');
console.log('  Username: Desi | Password: IDphantom@209425!');
console.log('  Username: Ivan | Password: IDphantom@209425');
console.log('\nYou can now log in at: https://phantomaco.com/admin/login');
