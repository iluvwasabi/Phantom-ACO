const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

console.log('🔄 Making submission_id nullable in orders table...');

try {
  // SQLite doesn't support ALTER COLUMN, so we need to recreate the table

  // 1. Create new table with nullable submission_id
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER,
      user_id INTEGER,
      retailer TEXT NOT NULL,
      product_name TEXT NOT NULL,
      order_number TEXT,
      order_total REAL NOT NULL,
      fee_amount REAL NOT NULL,
      fee_percentage REAL DEFAULT 7,
      status TEXT DEFAULT 'pending_review',
      order_date TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      stripe_invoice_id TEXT,
      stripe_payment_intent_id TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      paid_at TEXT,
      invoice_url TEXT,
      discord_id TEXT,
      discord_username TEXT,
      FOREIGN KEY (submission_id) REFERENCES service_subscriptions(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 2. Copy data from old table
  db.exec(`
    INSERT INTO orders_new
    SELECT * FROM orders
  `);

  // 3. Drop old table
  db.exec(`DROP TABLE orders`);

  // 4. Rename new table
  db.exec(`ALTER TABLE orders_new RENAME TO orders`);

  console.log('✅ Successfully made submission_id nullable in orders table');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

db.close();
