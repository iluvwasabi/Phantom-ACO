const db = require('./src/config/database');

console.log('\n=== Registered Servers ===\n');
const servers = db.prepare('SELECT * FROM registered_servers ORDER BY id DESC').all();

servers.forEach(server => {
  console.log(`ID: ${server.id}`);
  console.log(`Server ID: ${server.server_id}`);
  console.log(`Name: ${server.server_name}`);
  console.log(`Required Role: ${server.required_role_name}`);
  console.log(`Active: ${server.is_active ? 'Yes' : 'No'}`);
  console.log(`User Count: ${server.user_count || 0}`);
  console.log('---');
});
