const db = require('../config/db');
const ss = require('simple-statistics');

// GET /api/insights
const getInsightsData = async (req, res, next) => {
  try {
    const [dailySales, productDemand] = await Promise.all([
      // Fetch daily sales for the last 30 days for ML Linear Regression
      db.query(`
        SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) AS total_sales
        FROM bills
        WHERE created_at >= NOW() - INTERVAL '30 days' AND user_id = $1
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `, [req.user.id]),
      // Product demand analysis (last 30 days)
      db.query(`
        SELECT 
          p.id, p.name, p.stock, p.min_stock,
          COALESCE(sales.total_qty / 30.0, 0.1) AS avg_daily -- avoid division by zero later
        FROM products p
        LEFT JOIN (
          SELECT bi.product_id, SUM(bi.quantity) as total_qty
          FROM bill_items bi
          JOIN bills b ON b.id = bi.bill_id
          WHERE b.created_at >= NOW() - INTERVAL '30 days' AND b.user_id = $1
          GROUP BY bi.product_id
        ) sales ON sales.product_id = p.id
        WHERE p.user_id = $1
        GROUP BY p.id, p.name, p.stock, p.min_stock, sales.total_qty
      `, [req.user.id])
    ]);

    // --- ML Prediction using Custom Gradient Descent ---
    // Scalable for future bulk data scope
    let tomorrowMin = 0, tomorrowMax = 0, next7Min = 0, next7Max = 0;
    
    if (dailySales.rows.length >= 3) {
      const N = dailySales.rows.length;
      const xData = [];
      const yData = [];
      
      dailySales.rows.forEach((row, idx) => {
        xData.push(idx);
        yData.push(parseFloat(row.total_sales));
      });

      // Feature scaling (Normalization) for X to ensure Gradient Descent converges properly
      const xMean = xData.reduce((a, b) => a + b, 0) / N;
      const xStd = Math.sqrt(xData.reduce((a, b) => a + Math.pow(b - xMean, 2), 0) / N) || 1;
      const xNormalized = xData.map(x => (x - xMean) / xStd);

      // Gradient Descent parameters
      let m = 0; // Slope
      let b = 0; // Intercept
      const epochs = 1000;
      const learningRate = 0.1;

      // Training loop
      for (let i = 0; i < epochs; i++) {
        let dm = 0;
        let db = 0;
        
        for (let j = 0; j < N; j++) {
          const x = xNormalized[j];
          const y = yData[j];
          const y_pred = (m * x) + b;
          const error = y_pred - y;
          
          dm += error * x;
          db += error;
        }
        
        m -= learningRate * (2 / N) * dm;
        b -= learningRate * (2 / N) * db;
      }

      // Prediction function
      const predict = (xRaw) => {
        const xNorm = (xRaw - xMean) / xStd;
        return (m * xNorm) + b;
      };

      const nextDayIdx = N; // Predict for tomorrow
      const predictedTomorrow = Math.max(0, predict(nextDayIdx)); // Ensure no negative sales
      
      let predicted7Days = 0;
      for(let i = 0; i < 7; i++) {
        predicted7Days += Math.max(0, predict(nextDayIdx + i));
      }

      // Add a 10% variance for Min/Max
      tomorrowMin = Math.round(predictedTomorrow * 0.9);
      tomorrowMax = Math.round(predictedTomorrow * 1.1);
      next7Min = Math.round(predicted7Days * 0.9);
      next7Max = Math.round(predicted7Days * 1.1);
    } else {
      // Fallback if not enough data for ML
      tomorrowMin = 0; tomorrowMax = 0; next7Min = 0; next7Max = 0;
    }

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
          tomorrow: { min: tomorrowMin, max: tomorrowMax },
          next7Days: { min: next7Min, max: next7Max }
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
