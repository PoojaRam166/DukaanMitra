const db = require('../config/db');
const { getPrefs, createNotification } = require('../utils/notify');

// GET /api/customers?search=
const getCustomers = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    let query = `
      SELECT c.*,
        COUNT(b.id) AS total_bills,
        COALESCE(SUM(b.total), 0) AS total_spent,
        MAX(b.created_at) AS last_purchase
      FROM customers c
      LEFT JOIN bills b ON b.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.name ILIKE $1 OR c.phone ILIKE $1)`;
    }
    query += ' GROUP BY c.id ORDER BY c.created_at DESC';

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/customers/:id
const getCustomerById = async (req, res, next) => {
  try {
    const customerResult = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (customerResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });

    const billsResult = await db.query(
      `SELECT b.id, b.bill_number, b.total, b.amount_paid, b.payment_method, b.created_at,
        COUNT(bi.id) AS item_count
       FROM bills b LEFT JOIN bill_items bi ON bi.bill_id = b.id
       WHERE b.customer_id = $1
       GROUP BY b.id ORDER BY b.created_at DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...customerResult.rows[0], purchase_history: billsResult.rows } });
  } catch (err) {
    next(err);
  }
};

// POST /api/customers
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone are required' });

    const result = await db.query(
      'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, email || null]
    );

    try {
      const prefs = await getPrefs(req.user.id);
      if (prefs.notify_new_customer) {
        await createNotification({
          title: 'New customer added',
          description: `${name} was added to your customer list.`,
          priority: 'normal',
          icon: 'success',
        });
      }
    } catch (notifyErr) {
      console.error('Notification generation failed:', notifyErr.message);
    }

    res.status(201).json({ success: true, message: 'Customer added', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/customers/:id
const updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, active } = req.body;
    const result = await db.query(
      'UPDATE customers SET name=$1, phone=$2, email=$3, active=$4 WHERE id=$5 RETURNING *',
      [name, phone, email || null, active !== undefined ? active : true, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer updated', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/customers/:id
const deleteCustomer = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/customers/:id/pay
const payCustomerCredit = async (req, res, next) => {
  const client = await db.getClient();
  try {
    const { amount } = req.body;
    let amtToDistribute = parseFloat(amount);
    if (!amtToDistribute || amtToDistribute <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    await client.query('BEGIN');

    // Fetch all unpaid credit bills for this customer, oldest first
    const unpaidBillsResult = await client.query(
      `SELECT id, total, amount_paid FROM bills 
       WHERE customer_id = $1 AND payment_method = 'credit' AND amount_paid < total 
       ORDER BY created_at ASC FOR UPDATE`,
      [req.params.id]
    );

    let distributed = 0;

    for (const bill of unpaidBillsResult.rows) {
      if (amtToDistribute <= 0) break;

      const remainingOnBill = parseFloat(bill.total) - parseFloat(bill.amount_paid);
      const paymentForThisBill = Math.min(remainingOnBill, amtToDistribute);

      const newAmountPaid = parseFloat(bill.amount_paid) + paymentForThisBill;

      await client.query(
        'UPDATE bills SET amount_paid = $1 WHERE id = $2',
        [newAmountPaid, bill.id]
      );

      amtToDistribute -= paymentForThisBill;
      distributed += paymentForThisBill;
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Successfully distributed ₹${distributed.toLocaleString('en-IN')} across pending bills.` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, payCustomerCredit };
