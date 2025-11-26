const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/aco.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
const initSchema = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT UNIQUE NOT NULL,
      discord_username TEXT NOT NULL,
      discord_discriminator TEXT,
      discord_avatar TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_verified INTEGER DEFAULT 0
    )
  `);

  // Service subscriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      service_name TEXT NOT NULL,
      form_submission_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Encrypted credentials table (for login-required services)
  db.exec(`
    CREATE TABLE IF NOT EXISTS encrypted_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL,
      encrypted_username TEXT,
      encrypted_password TEXT,
      encrypted_imap TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subscription_id) REFERENCES service_subscriptions(id) ON DELETE CASCADE
    )
  `);

  // Form submissions log
  db.exec(`
    CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      form_type TEXT NOT NULL,
      service_name TEXT NOT NULL,
      submission_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      form_url TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Session tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Admin settings table for customizable content
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type TEXT DEFAULT 'text',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);

  // Service panels configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id TEXT UNIQUE NOT NULL,
      service_name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color_gradient TEXT,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default service panels if they don't exist
  const checkPanels = db.prepare('SELECT COUNT(*) as count FROM service_panels').get();
  if (checkPanels.count === 0) {
    const insertPanel = db.prepare(`
      INSERT INTO service_panels (service_id, service_name, service_type, description, color_gradient, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertPanel.run('target', 'Target', 'login_required', 'Auto-checkout for Target Pokemon drops', 'linear-gradient(135deg, #cc0000, #ff0000)', 1);
    insertPanel.run('walmart', 'Walmart', 'login_required', 'Auto-checkout for Walmart Pokemon drops', 'linear-gradient(135deg, #0071ce, #004f9f)', 2);
    insertPanel.run('bestbuy', 'Best Buy', 'login_required', 'Auto-checkout for Best Buy Pokemon drops', 'linear-gradient(135deg, #0046be, #003d99)', 3);
    insertPanel.run('pokemoncenter', 'Pokemon Center', 'no_login', 'Auto-checkout for Pokemon Center drops', 'linear-gradient(135deg, #ffcb05, #f7a800)', 4);
    insertPanel.run('shopify', 'Shopify Stores', 'no_login', 'Auto-checkout for Shopify-based Pokemon stores', 'linear-gradient(135deg, #96bf48, #5e8e3e)', 5);
  }

  // Insert default login page settings if they don't exist
  const checkSettings = db.prepare('SELECT COUNT(*) as count FROM admin_settings').get();
  if (checkSettings.count === 0) {
    const insertSetting = db.prepare(`
      INSERT INTO admin_settings (setting_key, setting_value, setting_type)
      VALUES (?, ?, ?)
    `);

    insertSetting.run('login_page_title', 'Phantom ACO', 'text');
    insertSetting.run('login_page_tagline', 'Time is Money. Save both.', 'text');
    insertSetting.run('login_page_logo', '👻', 'text');
    insertSetting.run('brand_name', 'Phantom ACO', 'text');
  }

  console.log('Database schema initialized successfully');
};

// Run migrations
const runMigrations = () => {
  const migrationsDir = path.join(__dirname, '../migrations');

  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log(`Running ${migrationFiles.length} migrations...`);

    migrationFiles.forEach(file => {
      try {
        const migrationPath = path.join(migrationsDir, file);
        // Run migration by requiring it (each migration handles its own errors)
        delete require.cache[require.resolve(migrationPath)]; // Clear cache
        require(migrationPath);
      } catch (error) {
        console.error(`Error running migration ${file}:`, error.message);
      }
    });

    console.log('All migrations completed');
  }
};

// Initialize schema and run migrations on first load
initSchema();
runMigrations();

module.exports = db;
