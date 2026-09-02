const db = require('../config/db');
const { getPrefs, createNotification } = require('../utils/notify');

// POST /api/bills — Creates bill with items + deducts stock inside a transaction
const createBill = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { customer_id, items, discount = 0, payment_method, transaction_id } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Bill must have at least one item' });
    }
    if (!payment_method) {
      return res.status(400).json({ success: false, message: 'Payment method is required' });
    }

    await client.query('BEGIN');

    // Validate each product and check stock
    let subtotal = 0;
    const resolvedItems = [];
    for (const item of items) {
      const prodResult = await client.query('SELECT * FROM products WHERE id = $1 AND user_id = $2 FOR UPDATE', [item.product_id, req.user.id]);
      if (prodResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Product ID ${item.product_id} not found` });
      }
      const product = prodResult.rows[0];
      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}`
        });
      }
      const itemSubtotal = product.sell_price * item.quantity;
      subtotal += itemSubtotal;
      resolvedItems.push({ product, quantity: item.quantity, price: product.sell_price, itemSubtotal });
    }

    const discountAmt = subtotal * (discount / 100);
    const total = subtotal - discountAmt;

    // Generate a unique bill number
    const billNumber = `INV-${Date.now().toString().slice(-7)}`;

    // Insert bill
    const amount_paid = payment_method === 'credit' ? 0 : total;
    const billResult = await client.query(
      'INSERT INTO bills (user_id, bill_number, customer_id, subtotal, discount, total, payment_method, amount_paid, transaction_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.user.id, billNumber, customer_id || null, subtotal, discount, total, payment_method, amount_paid, transaction_id || null]
    );
    const bill = billResult.rows[0];

    // Insert bill items + deduct stock
    const stockAlerts = [];
    for (const item of resolvedItems) {
      await client.query(
        'INSERT INTO bill_items (bill_id, product_id, quantity, price, subtotal) VALUES ($1,$2,$3,$4,$5)',
        [bill.id, item.product.id, item.quantity, item.price, item.itemSubtotal]
      );
      const updated = await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2 AND user_id = $3 RETURNING id, name, stock, min_stock',
        [item.quantity, item.product.id, req.user.id]
      );
      stockAlerts.push(updated.rows[0]);
    }

    await client.query('COMMIT');

    // Fire off notifications for things the shop owner asked to be told
    // about (Settings > Preferences > Notifications). Done after COMMIT so
    // a notification failure can never roll back the actual sale.
    try {
      const prefs = await getPrefs(req.user.id);

      if (prefs.notify_large_bills && total >= 5000) {
        await createNotification({
          title: 'Large bill created',
          description: `Bill ${billNumber} was billed for ₹${Number(total).toLocaleString('en-IN')}.`,
          priority: 'medium',
          icon: 'success',
          user_id: req.user.id
        });
      }

      for (const p of stockAlerts) {
        if (p.stock <= 0 && prefs.notify_out_of_stock) {
          await createNotification({
            title: `${p.name} is out of stock`,
            description: `${p.name} just sold out. Restock it to keep taking orders.`,
            priority: 'critical',
            icon: 'alert',
            dedupeWithinHours: 24,
            user_id: req.user.id
          });
        } else if (p.stock > 0 && p.stock <= p.min_stock && prefs.notify_low_stock) {
          await createNotification({
            title: `${p.name} is running low`,
            description: `Only ${p.stock} ${p.stock === 1 ? 'unit' : 'units'} left (reorder level: ${p.min_stock}).`,
            priority: 'high',
            icon: 'warning',
            dedupeWithinHours: 24,
            user_id: req.user.id
          });
        }
      }
    } catch (notifyErr) {
      console.error('Notification generation failed:', notifyErr.message);
    }

    res.status(201).json({ success: true, message: 'Bill created successfully', data: bill });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/bills
const getBills = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT b.*, c.name AS customer_name,
        COUNT(bi.id) AS item_count
      FROM bills b
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN bill_items bi ON bi.bill_id = b.id
      WHERE b.user_id = $1
      GROUP BY b.id, c.name
      ORDER BY b.created_at DESC
      LIMIT 100
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/bills/:id
const getBillById = async (req, res, next) => {
  try {
    const billResult = await db.query(
      'SELECT b.*, c.name AS customer_name FROM bills b LEFT JOIN customers c ON c.id = b.customer_id WHERE b.id = $1 AND b.user_id = $2',
      [req.params.id, req.user.id]
    );
    if (billResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Bill not found' });

    const itemsResult = await db.query(
      'SELECT bi.*, p.name AS product_name FROM bill_items bi JOIN products p ON p.id = bi.product_id WHERE bi.bill_id = $1',
      [req.params.id]
    );
    res.json({ success: true, data: { ...billResult.rows[0], items: itemsResult.rows } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/bills/:id/pay
const payCredit = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    // First fetch the current bill
    const current = await db.query('SELECT total, amount_paid FROM bills WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const { total, amount_paid } = current.rows[0];
    const newAmountPaid = Math.min(parseFloat(amount_paid || 0) + amt, parseFloat(total));

    const result = await db.query(
      'UPDATE bills SET amount_paid = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [newAmountPaid, req.params.id, req.user.id]
    );

    res.json({ success: true, message: `Recorded payment of ₹${amt}`, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBill, getBills, getBillById, payCredit };
