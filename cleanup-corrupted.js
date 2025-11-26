const Database = require('better-sqlite3');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './data/aco.db';
const db = new Database(dbPath);

console.log('Checking for corrupted encrypted entries...');

function decrypt(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// First, clean up orphaned service_subscriptions (those without credentials)
const orphanedSubscriptions = db.prepare(`
  SELECT ss.id, ss.service_name
  FROM service_subscriptions ss
  LEFT JOIN encrypted_credentials ec ON ec.subscription_id = ss.id
  WHERE ec.id IS NULL
`).all();

if (orphanedSubscriptions.length > 0) {
  console.log(`\n🧹 Found ${orphanedSubscriptions.length} orphaned service subscriptions (no credentials):`);
  orphanedSubscriptions.forEach(sub => {
    console.log(`  - ${sub.service_name} (ID: ${sub.id})`);
  });

  if (process.argv.includes('--delete')) {
    const deleteStmt = db.prepare('DELETE FROM service_subscriptions WHERE id = ?');
    orphanedSubscriptions.forEach(sub => {
      deleteStmt.run(sub.id);
      console.log(`  ✓ Deleted subscription ID: ${sub.id}`);
    });
  }
}

// Get all encrypted credentials
const credentials = db.prepare(`
  SELECT ec.*, ss.service_name
  FROM encrypted_credentials ec
  JOIN service_subscriptions ss ON ss.id = ec.subscription_id
`).all();

console.log(`\nFound ${credentials.length} encrypted credential entries`);

let corruptedCount = 0;
const corruptedIds = [];

credentials.forEach(cred => {
  let isCorrupted = false;

  // Try to decrypt each field
  if (cred.encrypted_password) {
    try {
      const decrypted = decrypt(cred.encrypted_password);
      if (!decrypted || decrypted.trim() === '') {
        console.log(`⚠ Corrupted password for ${cred.service_name} (ID: ${cred.subscription_id})`);
        isCorrupted = true;
      }
    } catch (e) {
      console.log(`⚠ Failed to decrypt password for ${cred.service_name} (ID: ${cred.subscription_id}):`, e.message);
      isCorrupted = true;
    }
  }

  if (cred.encrypted_username) {
    try {
      const decrypted = decrypt(cred.encrypted_username);
      if (!decrypted || decrypted.trim() === '') {
        console.log(`⚠ Corrupted username for ${cred.service_name} (ID: ${cred.subscription_id})`);
        isCorrupted = true;
      }
    } catch (e) {
      console.log(`⚠ Failed to decrypt username for ${cred.service_name} (ID: ${cred.subscription_id}):`, e.message);
      isCorrupted = true;
    }
  }

  if (isCorrupted) {
    corruptedCount++;
    corruptedIds.push(cred.id);
  }
});

console.log(`\n📊 Summary:`);
console.log(`Total entries: ${credentials.length}`);
console.log(`Corrupted entries: ${corruptedCount}`);

if (corruptedCount > 0) {
  console.log('\n⚠️  Found corrupted entries. To delete them, run:');
  console.log('node cleanup-corrupted.js --delete');

  // Check if --delete flag is passed
  if (process.argv.includes('--delete')) {
    console.log('\n🗑️  Deleting corrupted entries...');

    const deleteStmt = db.prepare('DELETE FROM encrypted_credentials WHERE id = ?');
    corruptedIds.forEach(id => {
      deleteStmt.run(id);
      console.log(`Deleted credential ID: ${id}`);
    });

    console.log(`\n✅ Deleted ${corruptedIds.length} corrupted entries`);
  }
} else {
  console.log('✅ No corrupted entries found!');
}

db.close();
