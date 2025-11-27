require('dotenv').config();
const db = require('./src/config/database');
const bcrypt = require('bcrypt');

console.log('\n🔍 Checking admin accounts...\n');

const admins = db.prepare('SELECT * FROM admin_users').all();

if (admins.length === 0) {
  console.log('❌ No admin accounts found!\n');
} else {
  console.log(`✅ Found ${admins.length} admin account(s):\n`);
  admins.forEach(admin => {
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Created: ${admin.created_at}`);
    console.log(`   Last Login: ${admin.last_login || 'Never'}`);
    console.log(`   Active: ${admin.is_active ? 'Yes' : 'No'}`);
    console.log('');
  });
}

console.log('\n🔄 Resetting admin password to: Pokemon123!desi\n');

async function resetPassword() {
  try {
    const password_hash = await bcrypt.hash('Pokemon123!desi', 10);

    db.prepare(`
      UPDATE admin_users
      SET password_hash = ?
      WHERE username = 'admin'
    `).run(password_hash);

    console.log('✅ Password reset successfully!\n');
    console.log('You can now login with:');
    console.log('   Username: admin');
    console.log('   Password: Pokemon123!desi\n');

  } catch (error) {
    console.log('❌ Error resetting password:', error.message);
  }
}

resetPassword();
