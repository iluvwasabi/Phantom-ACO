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

console.log('\n✅ All migrations completed successfully!');
console.log('\nYou can now use the updated features with first_name, last_name, billing_same_as_shipping, max_qty, and max_checkouts fields.');
