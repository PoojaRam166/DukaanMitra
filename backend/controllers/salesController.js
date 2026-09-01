const db = require('../config/db');

// GET /api/sales
const getSalesData = async (req, res, next) => {
  try {
    const filter = req.query.filter || '7 Days'; // 'Today', 'Yesterday', '7 Days', '30 Days'

    // Build an inclusive lower bound and an exclusive upper bound so each
    // filter only ever covers the days it names (e.g. "Yesterday" must not
    // also pull in today's bills).
    let lowerBound = "NOW() - INTERVAL '7 days'";
    let upperBound = "NOW() + INTERVAL '1 second'"; // effectively "no upper limit"
    if (filter === 'Today') {
      lowerBound = "CURRENT_DATE";
    } else if (filter === 'Yesterday') {
      lowerBound = "CURRENT_DATE - INTERVAL '1 day'";
      upperBound = "CURRENT_DATE";
    } else if (filter === '30 Days') {
      lowerBound = "NOW() - INTERVAL '30 days'";
    }
    const dateRangeClause = `>= ${lowerBound} AND created_at < ${upperBound}`;
    const dateRangeClauseB = `>= ${lowerBound} AND b.created_at < ${upperBound}`;

    const [summary, trends, daily, bestProducts, payments] = await Promise.all([
      // Summary
      db.query(`
        SELECT 
          COALESCE(SUM(b.total), 0) AS total_sales,
          COUNT(DISTINCT b.id) AS bills_created,
          COALESCE(SUM(b.total) / NULLIF(COUNT(DISTINCT b.id), 0), 0) AS avg_order_value,
          COALESCE(SUM(bi.quantity), 0) AS items_sold
        FROM bills b
        LEFT JOIN bill_items bi ON bi.bill_id = b.id
        WHERE b.created_at ${dateRangeClauseB}
      `),
      // Trends (Group by date)
      db.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') AS date,
          COALESCE(SUM(total), 0) AS sales
        FROM bills
        WHERE created_at ${dateRangeClause}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at) ASC
      `),
      // Daily Sales Table
      db.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('day', b.created_at), 'Mon DD, YYYY') AS date,
          COUNT(DISTINCT b.id) AS bills,
          COALESCE(SUM(b.total), 0) AS sales,
          COALESCE(SUM(b.total) / NULLIF(COUNT(DISTINCT b.id), 0), 0) AS avg,
          COALESCE(SUM(bi.quantity), 0) AS items
        FROM bills b
        LEFT JOIN bill_items bi ON bi.bill_id = b.id
        WHERE b.created_at ${dateRangeClauseB}
        GROUP BY DATE_TRUNC('day', b.created_at)
        ORDER BY DATE_TRUNC('day', b.created_at) DESC
      `),
      // Best Selling Products
      db.query(`
        SELECT 
          p.name, 
          SUM(bi.quantity) AS units, 
          SUM(bi.subtotal) AS revenue
        FROM bill_items bi 
        JOIN products p ON p.id = bi.product_id
        JOIN bills b ON b.id = bi.bill_id
        WHERE b.created_at ${dateRangeClauseB}
        GROUP BY p.id, p.name 
        ORDER BY revenue DESC 
        LIMIT 5
      `),
      // Payment Methods
      db.query(`
        SELECT 
          payment_method AS name, 
          COUNT(*) AS count
        FROM bills
        WHERE created_at ${dateRangeClause}
        GROUP BY payment_method
      `)
    ]);

    // Calculate percentages for payment methods
    const totalPayments = payments.rows.reduce((acc, curr) => acc + parseInt(curr.count), 0);
    // Payment methods are stored lowercase (cash/upi/card/credit) as set by
    // the Billing page, so match case-insensitively — comparing against the
    // Title-cased strings here previously never matched, silently painting
    // every method with the same fallback color.
    const PAYMENT_COLORS = { upi: '#3B5BDB', cash: '#16A34A', card: '#D97706', credit: '#DC2626' };
    const paymentData = payments.rows.map(p => ({
      name: p.name,
      value: totalPayments ? Math.round((parseInt(p.count) / totalPayments) * 100) : 0,
      color: PAYMENT_COLORS[String(p.name).toLowerCase()] || '#6B7280'
    }));

    res.json({
      success: true,
      data: {
        summary: summary.rows[0],
        trendData: trends.rows,
        dateTable: daily.rows,
        bestProducts: bestProducts.rows,
        paymentData
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSalesData };
