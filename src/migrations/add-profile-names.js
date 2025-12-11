const db = require('../config/database');

console.log('Adding profile_name to service_subscriptions and generating names...');

try {
  // Add profile_name column
  try {
    db.exec(`ALTER TABLE service_subscriptions ADD COLUMN profile_name TEXT;`);
    console.log('✓ Added profile_name column to service_subscriptions');
  } catch (e) {
    if (e.message.includes('duplicate')) {
      console.log('✓ profile_name column already exists');
    } else {
      throw e;
    }
  }

  // Generate profile names for existing submissions
  const users = db.prepare('SELECT id, discord_username FROM users').all();

  users.forEach(user => {
    if (!user.discord_username) {
      console.log(`⚠️ Skipping user ${user.id} - missing discord_username`);
      return;
    }

    // Get all submissions for this user, grouped by service
    const submissions = db.prepare(`
      SELECT id, service_name
      FROM service_subscriptions
      WHERE user_id = ? AND (profile_name IS NULL OR profile_name = '')
      ORDER BY service_name, created_at ASC
    `).all(user.id);

    // Group by service to number them
    const serviceGroups = {};
    submissions.forEach(sub => {
      if (!serviceGroups[sub.service_name]) {
        serviceGroups[sub.service_name] = [];
      }
      serviceGroups[sub.service_name].push(sub.id);
    });

    // Generate profile names using discord_username
    let updateCount = 0;
    Object.entries(serviceGroups).forEach(([serviceName, ids]) => {
      ids.forEach((id, index) => {
        const profileName = `${user.discord_username} ${serviceName} ${index + 1}`;
        db.prepare(`
          UPDATE service_subscriptions
          SET profile_name = ?
          WHERE id = ?
        `).run(profileName, id);
        updateCount++;
      });
    });

    if (updateCount > 0) {
      console.log(`✅ Generated ${updateCount} profile names for ${user.discord_username}`);
    }
  });

  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error in migration:', error.message);
  throw error;
}

module.exports = db;
