require('dotenv').config();
const readline = require('readline');
const { createAdminUser } = require('./src/middleware/adminAuth');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔐 Admin Account Creation\n');
console.log('This script will create a new admin account for Phantom ACO.\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  try {
    const username = await question('Enter admin username: ');

    if (!username || username.trim() === '') {
      console.log('❌ Username cannot be empty');
      rl.close();
      process.exit(1);
    }

    const password = await question('Enter admin password: ');

    if (!password || password.length < 8) {
      console.log('❌ Password must be at least 8 characters long');
      rl.close();
      process.exit(1);
    }

    const confirmPassword = await question('Confirm admin password: ');

    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      rl.close();
      process.exit(1);
    }

    console.log('\n⏳ Creating admin account...\n');

    const admin = await createAdminUser(username.trim(), password);

    console.log('✅ Admin account created successfully!');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Admin ID: ${admin.id}\n`);
    console.log('You can now log in at /admin/login\n');

    rl.close();
    process.exit(0);

  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      console.log('\n❌ Error: Username already exists. Please choose a different username.\n');
    } else {
      console.log('\n❌ Error creating admin account:', error.message);
    }
    rl.close();
    process.exit(1);
  }
}

main();
