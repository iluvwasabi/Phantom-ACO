const db = require('../config/database');

console.log('Adding submission_limit to service_panels table...');

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(service_panels)").all();
  const hasSubmissionLimit = tableInfo.some(col => col.name === 'submission_limit');

  if (!hasSubmissionLimit) {
    // Add submission_limit column (0 = unlimited, 1-5 = specific limit)
    db.prepare(`
      ALTER TABLE service_panels
      ADD COLUMN submission_limit INTEGER DEFAULT 0
    `).run();
    console.log('✓ submission_limit column added to service_panels');
  } else {
    console.log('✓ submission_limit column already exists');
  }

  console.log('Submission limit migration completed successfully!');
} catch (error) {
  console.error('Error adding submission_limit:', error);
  process.exit(1);
}
