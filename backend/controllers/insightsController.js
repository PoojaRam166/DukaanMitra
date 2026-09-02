const db = require('../config/db');

// GET /api/insights
const getInsightsData = async (req, res, next) => {
  try {
    const [avg7Days, avg30Days, productDemand] = await Promise.all([
      // Last 7 days average sales
      db.query(`
        SELECT COALESCE(SUM(total) / 7, 0) AS avg_sales
        FROM bills
        WHERE created_at >= NOW() - INTERVAL '7 days' AND user_id = $1
      `, [req.user.id]),
      // Last 30 days average sales
      db.query(`
        SELECT COALESCE(SUM(total) / 30, 0) AS avg_sales
        FROM bills
        WHERE created_at >= NOW() - INTERVAL '30 days' AND user_id = $1
      `, [req.user.id]),
      // Product demand analysis (last 30 days)
      db.query(`
        SELECT 
          p.id, p.name, p.stock, p.min_stock,
          COALESCE(SUM(bi.quantity) / 30.0, 0.1) AS avg_daily -- avoid division by zero later
        FROM products p
        LEFT JOIN bill_items bi ON bi.product_id = p.id
        LEFT JOIN bills b ON b.id = bi.bill_id AND b.created_at >= NOW() - INTERVAL '30 days' AND b.user_id = $1
        WHERE p.user_id = $1
        GROUP BY p.id, p.name, p.stock, p.min_stock
      `, [req.user.id])
    ]);

    const tomorrowAvg = parseFloat(avg7Days.rows[0].avg_sales);
    const next7Avg = parseFloat(avg30Days.rows[0].avg_sales) * 7;

    const stockDemand = productDemand.rows.map(p => {
      const avgDaily = parseFloat(p.avg_daily);
      const stock = parseInt(p.stock);
      const days = stock > 0 ? Math.round(stock / avgDaily) : 0;
      
      let demand = 'low';
      if (days <= 3) demand = 'critical';
      else if (days <= 7) demand = 'high';
      else if (days <= 14) demand = 'medium';

      return {
        id: p.id,
        name: p.name,
        stock,
        avgDaily: avgDaily.toFixed(1),
        days,
        demand,
        min_stock: p.min_stock
      };
    });

    const restockSuggestions = stockDemand
      .filter(p => p.days <= 7 || p.stock <= p.min_stock)
      .map(p => ({
        ...p,
        priority: p.days <= 3 || p.stock <= p.min_stock ? 'high' : 'medium',
        msg: p.days <= 3 ? 'Stock will deplete soon. Restock immediately.' : 'Low stock on a popular item.'
      }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        forecast: {
          tomorrow: { min: Math.round(tomorrowAvg * 0.9), max: Math.round(tomorrowAvg * 1.1) },
          next7Days: { min: Math.round(next7Avg * 0.9), max: Math.round(next7Avg * 1.1) }
        },
        stockDemand: stockDemand.sort((a, b) => a.days - b.days).slice(0, 10),
        restockSuggestions
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getInsightsData };
