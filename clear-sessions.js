const fs = require('fs');
const path = require('path');

const sessionsDbPath = path.join(__dirname, 'data', 'sessions.db');

console.log('🔄 Clearing session cache...');

if (fs.existsSync(sessionsDbPath)) {
  try {
    fs.unlinkSync(sessionsDbPath);
    console.log('✅ Session cache cleared successfully!');
  } catch (error) {
    console.log('⚠️  Warning: Could not delete sessions.db:', error.message);
  }
} else {
  console.log('ℹ️  No session cache found (this is normal on first run)');
}
