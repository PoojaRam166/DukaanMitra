-- Create a default admin user (password is 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Raj Sharma', 'raj@sharma.in', '$2b$10$P45CEijp98lLERHEZae/sOVwXPX1zr311SsPTxkwczTU61TdvLmZi', 'admin');

-- Seed Products
INSERT INTO products (name, sku, category, buy_price, sell_price, stock, min_stock, unit) VALUES
('Aashirvaad Atta 10kg', 'ATT-001', 'Grains', 340, 400, 45, 10, 'piece'),
('Amul Milk 500ml', 'MLK-002', 'Dairy', 28, 32, 120, 30, 'piece'),
('Basmati Rice 5kg', 'RIC-003', 'Grains', 280, 330, 4, 10, 'piece'),
('Fortune Sunflower Oil 1L', 'OIL-004', 'Oils', 130, 155, 22, 15, 'piece'),
('Surf Excel 1kg', 'DET-005', 'Household', 195, 230, 2, 5, 'piece'),
('Maggi Noodles 70g', 'NOO-006', 'Snacks', 12, 15, 8, 15, 'piece'),
('Parle-G 800g', 'BSC-007', 'Snacks', 45, 50, 60, 20, 'piece'),
('Tata Salt 1kg', 'SLT-008', 'Spices', 18, 22, 35, 10, 'piece'),
('Dettol Soap 75g', 'SOP-009', 'Personal Care', 28, 35, 6, 12, 'piece'),
('Good Day Butter 200g', 'BSC-010', 'Snacks', 35, 42, 40, 15, 'piece');

-- Seed Customers
INSERT INTO customers (name, phone, email, active) VALUES
('Priya Patel', '+91 98765 43210', 'priya@example.com', true),
('Suresh Kumar', '+91 87654 32109', 'suresh@example.com', true),
('Anita Verma', '+91 76543 21098', 'anita@example.com', true),
('Rajesh Gupta', '+91 65432 10987', 'rajesh@example.com', false),
('Meena Devi', '+91 54321 09876', 'meena@example.com', true),
('Vikram Singh', '+91 43210 98765', 'vikram@example.com', true);

-- Seed Expenses
INSERT INTO expenses (date, category, description, amount) VALUES
(CURRENT_DATE, 'Rent', 'Monthly shop rent', 15000),
(CURRENT_DATE, 'Electricity', 'December electricity bill', 3200),
(CURRENT_DATE - INTERVAL '1 day', 'Staff Salary', 'Helper salary', 8000),
(CURRENT_DATE - INTERVAL '2 days', 'Packaging', 'Carry bags', 1200),
(CURRENT_DATE - INTERVAL '3 days', 'Transport', 'Delivery charges', 800);
