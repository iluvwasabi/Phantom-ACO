const db = require('../config/database');

console.log('Adding max_qty and max_checkouts fields to users table...');

try {
  db.exec(`ALTER TABLE users ADD COLUMN max_qty INTEGER DEFAULT 1;`);
  console.log('✓ Added max_qty column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ max_qty column already exists');
  } else {
    throw e;
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN max_checkouts INTEGER DEFAULT 1;`);
  console.log('✓ Added max_checkouts column');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ max_checkouts column already exists');
  } else {
    throw e;
  }
}

console.log('Max qty and checkouts fields migration completed successfully!');
