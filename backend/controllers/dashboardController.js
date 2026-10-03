const db = require('../config/db');
const { getPrefs, createNotification } = require('../utils/notify');

// GET /api/dashboard — Aggregated stats for the Dashboard page
const getDashboard = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [todaySales, yesterdaySales, totalSales, totalExpenses, productStats, customerCount, recentBills, lowStock, topProducts, dailySales, totalUdhaar, topDefaulters, dailyExpenses] =
      await Promise.all([
        // Today's sales total
        db.query(
          "SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count FROM bills WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') AND user_id = $1",
          [req.user.id]
        ),
        // Yesterday's sales total
        db.query(
          "SELECT COALESCE(SUM(total), 0) AS total FROM bills WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('day', (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day') AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') < DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata') AND user_id = $1",
          [req.user.id]
        ),
        // All-time sales
        db.query("SELECT COALESCE(SUM(total), 0) AS total FROM bills WHERE user_id = $1", [req.user.id]),
        // All-time expenses
        db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = $1", [req.user.id]),
        // Product stats
        db.query(
          "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE stock=0) AS out_of_stock, COUNT(*) FILTER (WHERE stock>0 AND stock<=min_stock) AS low_stock FROM products WHERE user_id = $1", [req.user.id]
        ),
        // Total customers
        db.query("SELECT COUNT(*) AS total FROM customers WHERE user_id = $1", [req.user.id]),
        // Recent 5 bills
        db.query(`
          SELECT b.bill_number, b.total, b.payment_method, b.created_at, c.name AS customer_name
          FROM bills b LEFT JOIN customers c ON c.id = b.customer_id
          WHERE b.user_id = $1
          ORDER BY b.created_at DESC LIMIT 5
        `, [req.user.id]),
        // Low stock products
        db.query(
          "SELECT id, name, stock, min_stock FROM products WHERE stock <= min_stock AND user_id = $1 ORDER BY stock ASC LIMIT 6", [req.user.id]
        ),
        // Top 5 selling products by quantity
        db.query(`
          SELECT p.name, p.stock, SUM(bi.quantity) AS total_qty, SUM(bi.subtotal) AS total_revenue
          FROM bill_items bi JOIN products p ON p.id = bi.product_id
          WHERE p.user_id = $1
          GROUP BY p.id, p.name, p.stock ORDER BY total_qty DESC LIMIT 5
        `, [req.user.id]),
        // Daily sales for the last 7 days
        db.query(`
          SELECT TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'Dy') AS day,
                 COALESCE(SUM(total), 0) AS sales
          FROM bills
          WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '7 days' AND user_id = $1
          GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'Dy'), DATE_TRUNC('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
          ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
        `, [req.user.id]),
        // Total pending udhaar (Credit)
        db.query("SELECT COALESCE(SUM(total - amount_paid), 0) AS total FROM bills WHERE payment_method = 'credit' AND user_id = $1", [req.user.id]),
        // Top 3 defaulters (Customers with highest balance)
        db.query(`
          SELECT c.id, c.name, c.phone, SUM(b.total - b.amount_paid) AS balance 
          FROM customers c 
          JOIN bills b ON b.customer_id = c.id 
          WHERE b.payment_method = 'credit' AND b.user_id = $1 
          GROUP BY c.id, c.name, c.phone 
          HAVING SUM(b.total - b.amount_paid) > 0 
          ORDER BY balance DESC 
          LIMIT 3
        `, [req.user.id]),
        // Daily expenses for the last 7 days
        db.query(`
          SELECT TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'Dy') AS day,
                 COALESCE(SUM(amount), 0) AS expenses
          FROM expenses
          WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '7 days' AND user_id = $1
          GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'Dy'), DATE_TRUNC('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
          ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
        `, [req.user.id]),
      ]);

    // Merge dailySales and dailyExpenses into a single array for the AreaChart
    const mergedDaily = dailySales.rows.map(ds => {
      const exp = dailyExpenses.rows.find(de => de.day === ds.day);
      return {
        day: ds.day,
        sales: parseFloat(ds.sales),
        expenses: exp ? parseFloat(exp.expenses) : 0
      };
    });

    res.json({
      success: true,
      data: {
        today_sales: parseFloat(todaySales.rows[0].total),
        today_bills: parseInt(todaySales.rows[0].count),
        yesterday_sales: parseFloat(yesterdaySales.rows[0].total),
        total_sales: parseFloat(totalSales.rows[0].total),
        est_profit: parseFloat(totalSales.rows[0].total) - parseFloat(totalExpenses.rows[0].total),
        total_products: parseInt(productStats.rows[0].total),
        out_of_stock: parseInt(productStats.rows[0].out_of_stock),
        low_stock: parseInt(productStats.rows[0].low_stock),
        total_customers: parseInt(customerCount.rows[0].total),
        total_udhaar: parseFloat(totalUdhaar.rows[0].total),
        top_defaulters: topDefaulters.rows,
        recent_bills: recentBills.rows,
        low_stock_products: lowStock.rows,
        top_products: topProducts.rows,
        daily_sales: mergedDaily,
      },
    });

    // Once-a-day / once-a-month summary notifications. Dashboard load is a
    // reliable, dependency-free trigger point since the shop owner opens
    // it every session — `dedupeExact` keeps these from ever posting twice.
    try {
      const prefs = await getPrefs(req.user.id);

      if (prefs.notify_daily_sales) {
        const y = yesterdayStart;
        const yLabel = y.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const yTotal = parseFloat(yesterdaySales.rows[0].total);
        if (yTotal > 0) {
          await createNotification({
            title: `Daily sales summary: ${yLabel}`,
            description: `You made ₹${yTotal.toLocaleString('en-IN')} in sales on ${yLabel}.`,
            priority: 'normal',
            icon: 'info',
            dedupeExact: true,
            user_id: req.user.id
          });
        }
      }

      if (prefs.notify_monthly_reports && todayStart.getDate() <= 5) {
        const lastMonthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
        const monthLabel = lastMonthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        const lastMonthSales = await db.query(
          'SELECT COALESCE(SUM(total), 0) AS total FROM bills WHERE created_at >= $1 AND created_at < $2 AND user_id = $3',
          [lastMonthStart.toISOString(), lastMonthEnd.toISOString(), req.user.id]
        );
        const total = parseFloat(lastMonthSales.rows[0].total);
        if (total > 0) {
          await createNotification({
            title: `Monthly report ready: ${monthLabel}`,
            description: `Your ${monthLabel} report is ready — total sales were ₹${total.toLocaleString('en-IN')}. View it in Reports.`,
            priority: 'normal',
            icon: 'success',
            dedupeExact: true,
            user_id: req.user.id
          });
        }
      }
    } catch (notifyErr) {
      console.error('Notification generation failed:', notifyErr.message);
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
