const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db');

exports.sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ success: true, data: "⚠️ Gemini API key missing." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Fetch store context for the AI prompt
    const statsRes = await db.query(`
      SELECT 
        (SELECT COALESCE(SUM(total), 0) FROM bills WHERE user_id = $1) AS total_sales,
        (SELECT COUNT(*) FROM products WHERE user_id = $1 AND stock <= min_stock) AS low_stock_items
    `, [req.user.id]);
    const stats = statsRes.rows[0] || { total_sales: 0, low_stock_items: 0 };

    const prompt = `
      You are DukaanMitra AI, a highly intelligent virtual assistant for a kirana store owner in India. 
      You are connected to their actual live database.
      Store Context: The store's all-time sales are ₹${stats.total_sales}, and they currently have ${stats.low_stock_items} items running low on stock.
      
      The store owner asks: "${message}"
      
      Provide a brief, professional, and helpful response. Keep it concise (under 3 sentences). If they ask about sales or stock, use the context provided.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ success: true, data: text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ success: false, message: "AI generation failed." });
  }
};
