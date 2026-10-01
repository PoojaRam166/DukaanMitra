const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Get customer data for public portal
exports.getCustomerPortalData = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ error: "Invalid portal link." });
    }
    
    let customerId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      customerId = decoded.customerId;
    } catch (err) {
      return res.status(400).json({ error: "Invalid or expired portal link." });
    }
    
    if (!customerId) {
      return res.status(400).json({ error: "Invalid portal link." });
    }

    // Fetch customer details
    const customerQuery = await db.query(
      "SELECT id, name, phone, user_id FROM customers WHERE id = $1",
      [customerId]
    );

    if (customerQuery.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found." });
    }
    
    const customer = customerQuery.rows[0];
    
    // Fetch shop name (we need user_id to get shop settings)
    const settingsQuery = await db.query(
      "SELECT shop_name FROM shop_settings WHERE user_id = $1",
      [customer.user_id]
    );
    const shopName = settingsQuery.rows.length > 0 ? settingsQuery.rows[0].shop_name : "Your Trusted Shop";

    // Fetch all credit bills for this customer
    const billsQuery = await db.query(`
      SELECT 
        b.id, b.bill_number, b.total, b.amount_paid, b.created_at, b.payment_method,
        json_agg(json_build_object(
          'product_name', p.name,
          'quantity', bi.quantity,
          'price', bi.price,
          'subtotal', bi.subtotal
        )) as items
      FROM bills b
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
      LEFT JOIN products p ON bi.product_id = p.id
      WHERE b.customer_id = $1 AND b.payment_method = 'credit'
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `, [customerId]);

    res.json({
      shop_name: shopName,
      customer: {
        name: customer.name,
        phone: customer.phone,
      },
      credit_bills: billsQuery.rows,
    });
  } catch (err) {
    next(err);
  }
};
