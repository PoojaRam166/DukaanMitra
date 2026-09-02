// Self-healing schema check, run once on every server startup.
//
// Why this exists: this project ships `schema.sql` (full setup) and
// `migration.sql` (incremental changes, e.g. adding `users.avatar_url`,
// `shop_settings`, `notifications`) as separate files the developer has to
// remember to run by hand. In practice that step gets missed whenever the
// project is re-cloned or the database is set up fresh from an older copy
// of schema.sql, and the app then fails with confusing errors like
// `column "avatar_url" does not exist` or 500s on /api/settings.

// Everything below is the same idempotent DDL already in migration.sql
// (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), just run automatically
// against whatever database the app connects to, so the schema can never
// silently drift out of sync with the code again. It never drops or
// rewrites existing data.
const db = require('../config/db');

async function ensureSchema() {
  // users.avatar_url — added after the initial schema for profile photos.
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT NULL;`);

  // shop_settings — added for the Settings page (profile/shop info/preferences).
  await db.query(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      shop_name VARCHAR(255) DEFAULT 'Sharma General Store',
      phone VARCHAR(50) DEFAULT '+91 98765 43210',
      gst_number VARCHAR(100) DEFAULT '',
      address TEXT DEFAULT '123, Main Market, Jaipur, Rajasthan 302001',
      upi_id VARCHAR(255) DEFAULT '',
      language VARCHAR(50) DEFAULT 'English',
      currency VARCHAR(50) DEFAULT '₹ Indian Rupee (INR)',
      theme VARCHAR(50) DEFAULT 'Light',
      date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',
      notify_low_stock BOOLEAN DEFAULT true,
      notify_out_of_stock BOOLEAN DEFAULT true,
      notify_daily_sales BOOLEAN DEFAULT true,
      notify_large_bills BOOLEAN DEFAULT false,
      notify_new_customer BOOLEAN DEFAULT false,
      notify_monthly_reports BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.query(`ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255) DEFAULT '';`);

  // notifications — added for the Notifications page / navbar bell.
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      time VARCHAR(50) DEFAULT 'Just now',
      priority VARCHAR(50) DEFAULT 'normal',
      read BOOLEAN DEFAULT false,
      icon VARCHAR(50) DEFAULT 'info',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // bills.amount_paid — added to track partial/full payments on credit bills.
  await db.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0;`);
  // Backfill non-credit bills as fully paid, and credit bills as 0 paid (if not already set)
  await db.query(`UPDATE bills SET amount_paid = total WHERE payment_method != 'credit' AND amount_paid = 0;`);
}

module.exports = ensureSchema;
