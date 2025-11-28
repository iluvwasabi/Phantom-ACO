// Add email column to orders table
const db = require('../config/database');

try {
  console.log('Adding email column to orders table...');
  db.exec(`ALTER TABLE orders ADD COLUMN email TEXT;`);
  console.log('✓ Added email column to orders table');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ email column already exists in orders table');
  } else {
    throw e;
  }
}

module.exports = {};
