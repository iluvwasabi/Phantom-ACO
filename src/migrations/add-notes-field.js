const db = require('../config/database');

console.log('Adding notes field to service_subscriptions table...');

try {
  db.exec(`ALTER TABLE service_subscriptions ADD COLUMN notes TEXT;`);
  console.log('✓ Added notes column to service_subscriptions');
} catch (e) {
  if (e.message.includes('duplicate')) {
    console.log('✓ notes column already exists');
  } else {
    throw e;
  }
}
