const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db');

exports.sendMessage = async (req, res, next) => {
  try {
    const { message, language } = req.body;
    
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

    let prompt = `
      You are DukaanMitra AI, a highly intelligent virtual assistant for a kirana store owner in India. 
      You are connected to their actual live database.
      Store Context: The store's all-time sales are ₹${stats.total_sales}, and they currently have ${stats.low_stock_items} items running low on stock.
      
      The store owner asks: "${message}"
      
      Provide a brief, professional, and helpful response. Keep it concise (under 3 sentences). If they ask about sales or stock, use the context provided.
    `;

    if (language === 'te') {
      prompt += `\nCRITICAL INSTRUCTION: You MUST reply entirely in the Telugu language (తెలుగు). Do not use English.`;
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ success: true, data: text });
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    
    // Fallback response for invalid API keys so the UI doesn't break for the user
    // Fallback Mock AI Engine (Executes when API key is invalid/missing)
    const { language, message: userMsg } = req.body;
    const msgLower = (userMsg || '').toLowerCase();
    
    let enResponse = `Based on your store data, your total all-time sales are ₹${req.user.total_sales || 0}. Keep up the great work!`;
    let teResponse = `మీ స్టోర్ డేటా ఆధారంగా, మీ మొత్తం విక్రయాలు ₹${req.user.total_sales || 0}. ఇలాగే మంచి పనిని కొనసాగించండి!`;

    // Keyword matching for intelligent mock responses
    if (msgLower.includes('hi') || msgLower.includes('hello') || msgLower.includes('hey') || msgLower.includes('నమస్తే')) {
      enResponse = "Hello! How can I help you manage your store today?";
      teResponse = "నమస్తే! ఈరోజు మీ స్టోర్‌ను నిర్వహించడంలో నేను మీకు ఎలా సహాయపడగలను?";
    } else if (msgLower.includes('stock') || msgLower.includes('inventory') || msgLower.includes('స్టాక్') || msgLower.includes('entha')) {
      enResponse = `You currently have ${req.user.low_stock_items || 0} items running low on stock. Please check the inventory page!`;
      teResponse = `ప్రస్తుతం మీ స్టోర్‌లో ${req.user.low_stock_items || 0} వస్తువుల స్టాక్ తక్కువగా ఉంది. దయచేసి ఇన్వెంటరీ పేజీని తనిఖీ చేయండి!`;
    } else if (msgLower.includes('sales') || msgLower.includes('profit') || msgLower.includes('అమ్మకాలు') || msgLower.includes('లాభం')) {
      enResponse = `Your store is doing great! Your all-time sales are ₹${req.user.total_sales || 0}.`;
      teResponse = `మీ స్టోర్ చాలా బాగా నడుస్తోంది! మీ మొత్తం విక్రయాలు ₹${req.user.total_sales || 0}.`;
    }

    res.json({ success: true, data: language === 'te' ? teResponse : enResponse });
  }
};
