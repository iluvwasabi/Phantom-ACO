const db = require('../config/database');

console.log('Adding first_name and last_name fields to users table...');

try {
  db.exec(`ALTER TABLE users ADD COLUMN first_name TEXT;`);
  console.log('✓ Added first_name column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ first_name column already exists');
  } else {
    throw e;
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN last_name TEXT;`);
  console.log('✓ Added last_name column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ last_name column already exists');
  } else {
    throw e;
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN billing_same_as_shipping INTEGER DEFAULT 1;`);
  console.log('✓ Added billing_same_as_shipping column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ billing_same_as_shipping column already exists');
  } else {
    throw e;
  }
}

console.log('Name fields migration completed successfully!');
