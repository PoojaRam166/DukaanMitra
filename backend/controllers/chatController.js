const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../config/db');

exports.sendMessage = async (req, res, next) => {
  let stats = { total_sales: 0, low_stock_items: 0, total_products: 0, total_customers: 0 };
  let customerNames = '';
  
  try {
    const { message, language } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ success: true, data: "⚠️ Gemini API key missing." });
    }

    const statsRes = await db.query(`
      SELECT 
        (SELECT COALESCE(SUM(total), 0) FROM bills WHERE user_id = $1) AS total_sales,
        (SELECT COUNT(*) FROM products WHERE user_id = $1 AND stock <= min_stock) AS low_stock_items,
        (SELECT COUNT(*) FROM products WHERE user_id = $1) AS total_products,
        (SELECT COUNT(*) FROM customers WHERE user_id = $1) AS total_customers
    `, [req.user.id]);
    stats = statsRes.rows[0] || stats;

    const customersRes = await db.query('SELECT name FROM customers WHERE user_id = $1 LIMIT 10', [req.user.id]);
    customerNames = customersRes.rows.map(r => r.name).join(', ');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    
    let enResponse = `Based on your store data, your total all-time sales are ₹${stats.total_sales || 0}. Keep up the great work!`;
    let teResponse = `మీ స్టోర్ డేటా ఆధారంగా, మీ మొత్తం విక్రయాలు ₹${stats.total_sales || 0}. ఇలాగే మంచి పనిని కొనసాగించండి!`;

    // Keyword matching for intelligent mock responses
    if (msgLower.includes('hi') || msgLower.includes('hello') || msgLower.includes('hey') || msgLower.includes('నమస్తే') || msgLower.includes('హలో')) {
      enResponse = "Hello! How can I help you manage your Kirana store today?";
      teResponse = "నమస్తే! ఈరోజు మీ కిరాణా స్టోర్‌ను నిర్వహించడంలో నేను మీకు ఎలా సహాయపడగలను?";
    } else if (msgLower.includes('stock') || msgLower.includes('inventory') || msgLower.includes('స్టాక్') || msgLower.includes('entha')) {
      enResponse = `You currently have ${stats.low_stock_items || 0} items running dangerously low on stock. Please check the inventory page to restock them!`;
      teResponse = `ప్రస్తుతం మీ స్టోర్‌లో ${stats.low_stock_items || 0} వస్తువుల స్టాక్ ప్రమాదకరంగా తక్కువగా ఉంది. దయచేసి వాటిని రీస్టాక్ చేయడానికి ఇన్వెంటరీ పేజీని తనిఖీ చేయండి!`;
    } else if (msgLower.includes('sales') || msgLower.includes('profit') || msgLower.includes('bill') || msgLower.includes('అమ్మకాలు') || msgLower.includes('లాభం') || msgLower.includes('బిల్లు')) {
      enResponse = `Your store is doing fantastic! Your all-time total sales are ₹${stats.total_sales || 0}. Keep it up!`;
      teResponse = `మీ స్టోర్ చాలా అద్భుతంగా నడుస్తోంది! మీ మొత్తం విక్రయాలు ₹${stats.total_sales || 0}. ఇలాగే కొనసాగించండి!`;
    } else if (msgLower.includes('product') || msgLower.includes('item') || msgLower.includes('సరుకులు') || msgLower.includes('వస్తువులు')) {
      enResponse = `You currently have a total of ${stats.total_products || 0} distinct products registered in your shop's inventory.`;
      teResponse = `ప్రస్తుతం మీ దుకాణం ఇన్వెంటరీలో మొత్తం ${stats.total_products || 0} విభిన్న ఉత్పత్తులు నమోదు చేయబడ్డాయి.`;
    } else if ((msgLower.includes('name') || msgLower.includes('పేరు')) && (msgLower.includes('customer') || msgLower.includes('client') || msgLower.includes('కస్టమర్'))) {
      if (customerNames) {
        enResponse = `Here are some of your registered customers: ${customerNames}.`;
        teResponse = `మీ నమోదిత కస్టమర్ల పేర్లు: ${customerNames}.`;
      } else {
        enResponse = `You don't have any customers registered yet.`;
        teResponse = `మీకు ఇంకా ఏ కస్టమర్లు నమోదు కాలేదు.`;
      }
    } else if (msgLower.includes('customer') || msgLower.includes('client') || msgLower.includes('కస్టమర్లు') || msgLower.includes('ఖాతాదారులు')) {
      enResponse = `You have built a great loyal base of ${stats.total_customers || 0} registered customers!`;
      teResponse = `మీరు ${stats.total_customers || 0} మంది నమోదిత కస్టమర్లతో గొప్ప పునాదిని నిర్మించుకున్నారు!`;
    } else if (msgLower.includes('who are you') || msgLower.includes('your name') || msgLower.includes('నీవు ఎవరు') || msgLower.includes('నీ పేరు')) {
      enResponse = "I am DukaanMitra AI, your personal Smart Business Assistant built specifically for Kirana store owners!";
      teResponse = "నేను మీ దుకాణమిత్ర AI ని, కిరాణా స్టోర్ యజమానుల కోసం ప్రత్యేకంగా రూపొందించబడిన మీ వ్యక్తిగత స్మార్ట్ బిజినెస్ అసిస్టెంట్!";
    } else if (msgLower.includes('help') || msgLower.includes('support') || msgLower.includes('సహాయం') || msgLower.includes('సపోర్ట్')) {
      enResponse = "I can help you analyze your total sales, track your low-stock inventory, or provide insights into your products and customers. Just ask!";
      teResponse = "నేను మీ మొత్తం విక్రయాలను విశ్లేషించడంలో, మీ తక్కువ-స్టాక్ ఇన్వెంటరీని ట్రాక్ చేయడంలో లేదా మీ ఉత్పత్తులు మరియు కస్టమర్‌ల గురించి సమాచారం అందించడంలో సహాయపడగలను. అడగండి!";
    }

    res.json({ success: true, data: language === 'te' ? teResponse : enResponse });
  }
};
