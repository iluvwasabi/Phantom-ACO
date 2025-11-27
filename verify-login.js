require('dotenv').config();
const db = require('./src/config/database');
const bcrypt = require('bcrypt');

console.log('\n🔍 Testing admin login credentials...\n');

const testPassword = 'Pokemon123!desi';
const testUsername = 'admin';

// Get admin from database
const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(testUsername);

if (!admin) {
  console.log('❌ No admin user found with username:', testUsername);
  process.exit(1);
}

console.log('✅ Admin user found:');
console.log(`   ID: ${admin.id}`);
console.log(`   Username: ${admin.username}`);
console.log(`   Active: ${admin.is_active ? 'Yes' : 'No'}`);
console.log(`   Password Hash: ${admin.password_hash.substring(0, 20)}...`);
console.log('');

// Test password
bcrypt.compare(testPassword, admin.password_hash, (err, result) => {
  if (err) {
    console.log('❌ Error comparing password:', err.message);
    process.exit(1);
  }

  if (result) {
    console.log('✅ Password verification SUCCESSFUL!');
    console.log(`   The password "${testPassword}" matches the hash in database.`);
    console.log('\n🎯 Login should work with these credentials:');
    console.log(`   Username: ${testUsername}`);
    console.log(`   Password: ${testPassword}\n`);
  } else {
    console.log('❌ Password verification FAILED!');
    console.log(`   The password "${testPassword}" does NOT match the hash in database.`);
    console.log('\n⚠️  This means the password was not saved correctly.\n');
  }
});
