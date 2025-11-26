const db = require('../config/database');

console.log('Adding payment fields to users table...');

try {
  // Add payment-related columns to users table
  db.exec(`
    ALTER TABLE users ADD COLUMN payment_email TEXT;
  `);
  console.log('✓ Added payment_email column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ payment_email column already exists');
  } else {
    console.error('Error adding payment_email:', err.message);
  }
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN payment_method TEXT;
  `);
  console.log('✓ Added payment_method column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ payment_method column already exists');
  } else {
    console.error('Error adding payment_method:', err.message);
  }
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
  `);
  console.log('✓ Added subscription_tier column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ subscription_tier column already exists');
  } else {
    console.error('Error adding subscription_tier:', err.message);
  }
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
  `);
  console.log('✓ Added payment_status column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ payment_status column already exists');
  } else {
    console.error('Error adding payment_status:', err.message);
  }
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN customer_id TEXT;
  `);
  console.log('✓ Added customer_id column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ customer_id column already exists');
  } else {
    console.error('Error adding customer_id:', err.message);
  }
}

try {
  db.exec(`
    ALTER TABLE users ADD COLUMN phone_number TEXT;
  `);
  console.log('✓ Added phone_number column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ phone_number column already exists');
  } else {
    console.error('Error adding phone_number:', err.message);
  }
}

console.log('\nMigration completed successfully!');
process.exit(0);
