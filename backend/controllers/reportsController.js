const db = require('../config/db');

// GET /api/reports
const getReportsData = async (req, res, next) => {
  try {
    const timeFilter = req.query.filter || 'This Month';
    
    let dateFilter = "DATE_TRUNC('month', CURRENT_DATE)"; // This month start
    if (timeFilter === 'Last Month') dateFilter = "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', CURRENT_DATE)";
    else if (timeFilter === 'Last 3 Months') dateFilter = "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')";
    
    let salesQuery = `WHERE created_at >= ${dateFilter.split(' AND ')[0]}`;
    if (dateFilter.includes('AND')) salesQuery = `WHERE created_at >= ${dateFilter}`;

    const [salesData, expenseData, inventoryData, customerData] = await Promise.all([
      // Sales stats
      db.query(`
        SELECT COALESCE(SUM(total), 0) AS total_sales, COUNT(*) AS bills_count 
        FROM bills ${salesQuery} AND user_id = $1
      `, [req.user.id]),
      // Expense stats
      db.query(`
        SELECT COALESCE(SUM(amount), 0) AS total_expenses, COUNT(DISTINCT category) AS categories 
        FROM expenses 
        WHERE date >= ${dateFilter.split(' AND ')[0].replace('created_at', 'date')} AND user_id = $1
      `, [req.user.id]),
      // Inventory stats
      db.query(`
        SELECT COALESCE(SUM(stock * buy_price), 0) AS total_value, COUNT(*) AS products_count 
        FROM products WHERE user_id = $1
      `, [req.user.id]),
      // Customer stats
      db.query(`
        SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE active = true) AS active 
        FROM customers WHERE user_id = $1
      `, [req.user.id])
    ]);

    const sales = parseFloat(salesData.rows[0].total_sales);
    const bills = parseInt(salesData.rows[0].bills_count);
    const expenses = parseFloat(expenseData.rows[0].total_expenses);
    const expCategories = parseInt(expenseData.rows[0].categories);
    const invValue = parseFloat(inventoryData.rows[0].total_value);
    const invProducts = parseInt(inventoryData.rows[0].products_count);
    const custTotal = parseInt(customerData.rows[0].total);
    const custActive = parseInt(customerData.rows[0].active);
    
    const profit = sales - expenses;
    const margin = sales > 0 ? Math.round((profit / sales) * 100) : 0;
    const gst = Math.round(sales * 0.18); // assuming 18% avg GST for display purposes

    res.json({
      success: true,
      data: {
        salesStats: { thisMonth: sales, bills },
        profitStats: { netProfit: profit, margin: `${margin}%` },
        expenseStats: { thisMonth: expenses, categories: expCategories },
        inventoryStats: { totalValue: invValue, products: invProducts },
        customerStats: { totalCustomers: custTotal, active: custActive },
        gstStats: { taxableSales: sales, gst: gst }
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/custom?start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns detailed sales, expense, inventory and customer data for a custom date range,
// used to generate a downloadable custom report on the Reports page.
const getCustomReport = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'Both start and end dates are required' });
    }

    const startDate = `${start} 00:00:00`;
    const endDate = `${end} 23:59:59`;

    const [bills, expenses, inventorySummary, customerSummary] = await Promise.all([
      db.query(
        `SELECT b.bill_number, b.created_at, c.name AS customer_name, b.payment_method, b.subtotal, b.discount, b.total
         FROM bills b LEFT JOIN customers c ON c.id = b.customer_id
         WHERE b.created_at BETWEEN $1 AND $2 AND b.user_id = $3
         ORDER BY b.created_at ASC`,
        [startDate, endDate, req.user.id]
      ),
      db.query(
        `SELECT date, category, description, amount FROM expenses
         WHERE date BETWEEN $1 AND $2 AND user_id = $3
         ORDER BY date ASC`,
        [start, end, req.user.id]
      ),
      db.query(
        `SELECT COALESCE(SUM(stock * buy_price), 0) AS total_value, COUNT(*) AS products_count FROM products WHERE user_id = $1`, [req.user.id]
      ),
      db.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE active = true) AS active FROM customers WHERE user_id = $1`, [req.user.id]
      ),
    ]);

    const totalSales = bills.rows.reduce((sum, b) => sum + parseFloat(b.total), 0);
    const totalExpenses = expenses.rows.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    res.json({
      success: true,
      data: {
        range: { start, end },
        summary: {
          totalSales,
          totalExpenses,
          netProfit: totalSales - totalExpenses,
          billsCount: bills.rows.length,
          inventoryValue: parseFloat(inventorySummary.rows[0].total_value),
          products: parseInt(inventorySummary.rows[0].products_count),
          totalCustomers: parseInt(customerSummary.rows[0].total),
          activeCustomers: parseInt(customerSummary.rows[0].active),
        },
        bills: bills.rows,
        expenses: expenses.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getReportsData, getCustomReport };
