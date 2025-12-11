const db = require('../config/database');

console.log('Adding service_name to drops table and submission_id to drop_preferences...');

try {
  // Add service_name to drops table
  try {
    db.exec(`ALTER TABLE drops ADD COLUMN service_name TEXT;`);
    console.log('✓ Added service_name column to drops table');
  } catch (e) {
    if (e.message.includes('duplicate')) {
      console.log('✓ service_name column already exists in drops table');
    } else {
      throw e;
    }
  }

  // Add submission_id to drop_preferences table
  try {
    db.exec(`ALTER TABLE drop_preferences ADD COLUMN submission_id INTEGER;`);
    console.log('✓ Added submission_id column to drop_preferences table');
  } catch (e) {
    if (e.message.includes('duplicate')) {
      console.log('✓ submission_id column already exists in drop_preferences table');
    } else {
      throw e;
    }
  }

  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error in migration:', error.message);
  throw error;
}

module.exports = db;
