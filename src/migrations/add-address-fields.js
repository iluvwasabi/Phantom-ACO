const db = require('../config/database');

console.log('Adding separate address fields to users table...');

// Billing address fields
try {
  db.exec(`ALTER TABLE users ADD COLUMN billing_city TEXT;`);
  console.log('✓ Added billing_city column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ billing_city column already exists');
  } else {
    console.error('Error adding billing_city:', err.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN billing_state TEXT;`);
  console.log('✓ Added billing_state column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ billing_state column already exists');
  } else {
    console.error('Error adding billing_state:', err.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN billing_zipcode TEXT;`);
  console.log('✓ Added billing_zipcode column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ billing_zipcode column already exists');
  } else {
    console.error('Error adding billing_zipcode:', err.message);
  }
}

// Shipping address fields
try {
  db.exec(`ALTER TABLE users ADD COLUMN shipping_city TEXT;`);
  console.log('✓ Added shipping_city column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ shipping_city column already exists');
  } else {
    console.error('Error adding shipping_city:', err.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN shipping_state TEXT;`);
  console.log('✓ Added shipping_state column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ shipping_state column already exists');
  } else {
    console.error('Error adding shipping_state:', err.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN shipping_zipcode TEXT;`);
  console.log('✓ Added shipping_zipcode column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ shipping_zipcode column already exists');
  } else {
    console.error('Error adding shipping_zipcode:', err.message);
  }
}

console.log('\nMigration completed successfully!');
console.log('Note: billing_address and shipping_address fields are kept for backwards compatibility');
process.exit(0);
