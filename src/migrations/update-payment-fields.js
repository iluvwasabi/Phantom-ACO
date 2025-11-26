const db = require('../config/database');

console.log('Updating payment fields...');

// Add card and address fields
try {
  db.exec(`ALTER TABLE users ADD COLUMN card_number TEXT;`);
  console.log('✓ Added card_number column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ card_number column already exists');
  } else {
    console.error('Error adding card_number:', err.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN exp_date TEXT;`);
  console.log('✓ Added exp_date column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ exp_date column already exists');
  } else {
    console.error('Error adding exp_date:', err.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN cvc TEXT;`);
  console.log('✓ Added cvc column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ cvc column already exists');
  } else {
    console.error('Error adding cvc:', err.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN billing_address TEXT;`);
  console.log('✓ Added billing_address column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ billing_address column already exists');
  } else {
    console.error('Error adding billing_address:', err.message);
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN shipping_address TEXT;`);
  console.log('✓ Added shipping_address column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ shipping_address column already exists');
  } else {
    console.error('Error adding shipping_address:', err.message);
  }
}

console.log('\nMigration completed successfully!');
console.log('Note: Old fields (payment_status, subscription_tier, customer_id) are kept for backwards compatibility');
