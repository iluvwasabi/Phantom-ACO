// Run this script ONCE on Render to fix the orders table schema
// Command: node fix-orders-table.js

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('🔧 Fixing orders table schema...');
console.log('Database path:', dbPath);

try {
  // Check if orders table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='orders'
  `).get();

  if (!tableExists) {
    console.log('❌ Orders table does not exist. Run the app first to create tables.');
    process.exit(1);
  }

  console.log('✅ Orders table exists');

  // Get current orders
  const orders = db.prepare('SELECT * FROM orders').all();
  console.log(`📊 Found ${orders.length} existing orders`);

  // Create new orders table with nullable submission_id and user_id
  console.log('🔨 Creating new orders table...');
  db.exec(`
    CREATE TABLE orders_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER,
      user_id INTEGER,
      retailer TEXT NOT NULL,
      product_name TEXT,
      order_number TEXT,
      order_total REAL NOT NULL,
      fee_amount REAL NOT NULL,
      fee_percentage INTEGER DEFAULT 7,
      stripe_invoice_id TEXT,
      status TEXT DEFAULT 'pending_review',
      order_date DATETIME,
      payment_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES service_subscriptions(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Copy existing orders
  if (orders.length > 0) {
    console.log('📋 Copying existing orders...');
    const insert = db.prepare(`
      INSERT INTO orders_new (
        id, submission_id, user_id, retailer, product_name, order_number,
        order_total, fee_amount, fee_percentage, stripe_invoice_id, status,
        order_date, payment_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const order of orders) {
      insert.run(
        order.id,
        order.submission_id,
        order.user_id,
        order.retailer,
        order.product_name,
        order.order_number,
        order.order_total,
        order.fee_amount,
        order.fee_percentage,
        order.stripe_invoice_id,
        order.status,
        order.order_date,
        order.payment_date,
        order.created_at,
        order.updated_at
      );
    }
    console.log(`✅ Copied ${orders.length} orders`);
  }

  // Drop old table and rename new one
  console.log('🔄 Replacing old table...');
  db.exec('DROP TABLE orders');
  db.exec('ALTER TABLE orders_new RENAME TO orders');

  console.log('✅ Orders table fixed successfully!');
  console.log('🎉 submission_id and user_id are now nullable');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
