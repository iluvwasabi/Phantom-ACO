require('dotenv').config();
const { createAdminUser } = require('./src/middleware/adminAuth');

async function main() {
  try {
    console.log('\n🔐 Creating admin account...\n');

    const admin = await createAdminUser('admin', 'Pokemon123!desi');

    console.log('✅ Admin account created successfully!');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Admin ID: ${admin.id}\n`);
    console.log('You can now log in at /admin/login\n');

    process.exit(0);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      console.log('\n❌ Error: Username "admin" already exists.\n');
    } else {
      console.log('\n❌ Error creating admin account:', error.message);
    }
    process.exit(1);
  }
}

main();
