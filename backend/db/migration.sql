-- Add avatar support to users (safe to re-run)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT NULL;

-- Create Settings table
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

-- Safe to re-run against a database where shop_settings already existed
-- before the upi_id column was added.
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255) DEFAULT '';

-- Seed shop settings for admin user
INSERT INTO shop_settings (user_id) 
SELECT id FROM users WHERE email = 'raj@sharma.in' 
ON CONFLICT DO NOTHING;

-- Create Notifications table
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

-- Seed Notifications
INSERT INTO notifications (title, description, time, priority, read, icon) VALUES 
('Surf Excel is out of stock', 'Stock reached 0. Restock immediately to avoid losing sales.', '5 min ago', 'critical', false, 'alert'),
('Basmati Rice running low', 'Current stock: 4 units. Average daily sales: 0.8 units. ~5 days remaining.', '1 hour ago', 'high', false, 'warning'),
('Parle-G stock will deplete in 2 days', 'High demand item. Consider restocking today.', '2 hours ago', 'high', false, 'warning'),
('Consider restocking Maggi Noodles', 'Stock: 8 units. Below minimum level of 15 units.', '3 hours ago', 'medium', false, 'info'),
('38 bills created today', 'Daily bill count is 12% above your average. Great sales day!', 'Today 6:00 PM', 'normal', true, 'success'),
('Dettol Soap stock is low', 'Current stock: 6. Minimum level: 12.', 'Yesterday', 'medium', true, 'warning'),
('New month started', 'Your January expense budget resets today. Review your expenses.', 'Jan 1', 'normal', true, 'info');
