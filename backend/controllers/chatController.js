const Groq = require("groq-sdk");
const db = require('../config/db');

exports.sendMessage = async (req, res, next) => {
  let stats = { total_sales: 0, low_stock_items: 0, total_products: 0, total_customers: 0 };
  let customerNames = '';
  let productNames = '';
  
  try {
    const { message, language } = req.body;
    
    if (!process.env.GROQ_API_KEY) {
      return res.json({ success: true, data: "⚠️ Groq API key missing." });
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

    const productsRes = await db.query('SELECT name FROM products WHERE user_id = $1 LIMIT 10', [req.user.id]);
    productNames = productsRes.rows.map(r => r.name).join(', ');

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    let prompt = `
      You are DukaanMitra AI, a highly intelligent virtual assistant for a kirana store owner in India. 
      You are connected to their actual live database.
      Store Context: The store's all-time sales are ₹${stats.total_sales}, and they currently have ${stats.low_stock_items} items running low on stock.
      
      The store owner asks: "${message}"
      
      Provide a brief, professional, and helpful response. Keep it concise (under 3 sentences). If they ask about sales or stock, use the context provided.
    `;

    if (language === 'te') {
      prompt += `\nCRITICAL INSTRUCTION: You MUST reply entirely in the Telugu language (తెలుగు). Do not use English.`;
    } else if (language === 'bi') {
      prompt += `\nCRITICAL INSTRUCTION: You MUST reply in a natural mix of Telugu and English (Bilingual/Tanglish style). Use Telugu script but mix in English words commonly used by Indians (like "stock", "sales", "products").`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
    });

    const text = chatCompletion.choices[0]?.message?.content || "";

    res.json({ success: true, data: text });
  } catch (error) {
    console.error("Groq API Error:", error.message);
    
    // Fallback response for invalid API keys so the UI doesn't break for the user
    // Fallback Mock AI Engine (Executes when API key is invalid/missing)
    const { language, message: userMsg } = req.body;
    const msgLower = (userMsg || '').toLowerCase();
    
    let enResponse = `Based on your store data, your total all-time sales are ₹${stats.total_sales || 0}. Keep up the great work!`;
    let teResponse = `మీ స్టోర్ డేటా ఆధారంగా, మీ మొత్తం విక్రయాలు ₹${stats.total_sales || 0}. ఇలాగే మంచి పనిని కొనసాగించండి!`;
    let biResponse = `మీ store data ప్రకారం, మీ total sales ₹${stats.total_sales || 0}. Keep it up!`;

    // Keyword matching for intelligent mock responses
    if (msgLower.includes('hi') || msgLower.includes('hello') || msgLower.includes('hey') || msgLower.includes('నమస్తే') || msgLower.includes('హలో')) {
      enResponse = "Hello! How can I help you manage your Kirana store today?";
      teResponse = "నమస్తే! ఈరోజు మీ కిరాణా స్టోర్‌ను నిర్వహించడంలో నేను మీకు ఎలా సహాయపడగలను?";
      biResponse = "హలో! ఈరోజు మీ kirana store manage చేయడానికి నేను ఎలా help చేయగలను?";
    } else if ((msgLower.includes('name') || msgLower.includes('what are') || msgLower.includes('ఏమిటి') || msgLower.includes('పేరు')) && (msgLower.includes('stock') || msgLower.includes('product') || msgLower.includes('item') || msgLower.includes('సరుకులు') || msgLower.includes('వస్తువులు'))) {
      if (productNames) {
        enResponse = `Here are some of the products currently in your inventory: ${productNames}.`;
        teResponse = `ప్రస్తుతం మీ ఇన్వెంటరీలో ఉన్న కొన్ని ఉత్పత్తులు ఇవిగో: ${productNames}.`;
        biResponse = `ప్రస్తుతం మీ inventory లో ఉన్న కొన్ని products ఇవిగో: ${productNames}.`;
      } else {
        enResponse = `You don't have any products in your inventory yet.`;
        teResponse = `మీ ఇన్వెంటరీలో ఇంకా ఎటువంటి ఉత్పత్తులు లేవు.`;
        biResponse = `మీ inventory లో ఇంకా products ఏమీ లేవు.`;
      }
    } else if (msgLower.includes('stock') || msgLower.includes('inventory') || msgLower.includes('స్టాక్') || msgLower.includes('entha')) {
      enResponse = `You currently have ${stats.low_stock_items || 0} items running dangerously low on stock. Please check the inventory page to restock them!`;
      teResponse = `ప్రస్తుతం మీ స్టోర్‌లో ${stats.low_stock_items || 0} వస్తువుల స్టాక్ ప్రమాదకరంగా తక్కువగా ఉంది. దయచేసి వాటిని రీస్టాక్ చేయడానికి ఇన్వెంటరీ పేజీని తనిఖీ చేయండి!`;
      biResponse = `ప్రస్తుతం మీ store లో ${stats.low_stock_items || 0} items కు low stock ఉంది. వాటిని restock చేయడానికి inventory పేజీని చెక్ చేయండి!`;
    } else if (msgLower.includes('sales') || msgLower.includes('profit') || msgLower.includes('bill') || msgLower.includes('అమ్మకాలు') || msgLower.includes('లాభం') || msgLower.includes('బిల్లు')) {
      enResponse = `Your store is doing fantastic! Your all-time total sales are ₹${stats.total_sales || 0}. Keep it up!`;
      teResponse = `మీ స్టోర్ చాలా అద్భుతంగా నడుస్తోంది! మీ మొత్తం విక్రయాలు ₹${stats.total_sales || 0}. ఇలాగే కొనసాగించండి!`;
      biResponse = `మీ store చాలా బాగా నడుస్తోంది! మీ total sales ₹${stats.total_sales || 0}. సూపర్!`;
    } else if (msgLower.includes('product') || msgLower.includes('item') || msgLower.includes('సరుకులు') || msgLower.includes('వస్తువులు')) {
      enResponse = `You currently have a total of ${stats.total_products || 0} distinct products registered in your shop's inventory.`;
      teResponse = `ప్రస్తుతం మీ దుకాణం ఇన్వెంటరీలో మొత్తం ${stats.total_products || 0} విభిన్న ఉత్పత్తులు నమోదు చేయబడ్డాయి.`;
      biResponse = `ప్రస్తుతం మీ shop inventory లో మొత్తం ${stats.total_products || 0} products register చేయబడ్డాయి.`;
    } else if ((msgLower.includes('name') || msgLower.includes('పేరు')) && (msgLower.includes('customer') || msgLower.includes('client') || msgLower.includes('కస్టమర్'))) {
      if (customerNames) {
        enResponse = `Here are some of your registered customers: ${customerNames}.`;
        teResponse = `మీ నమోదిత కస్టమర్ల పేర్లు: ${customerNames}.`;
        biResponse = `మీకు register అయిన కొందరు customers: ${customerNames}.`;
      } else {
        enResponse = `You don't have any customers registered yet.`;
        teResponse = `మీకు ఇంకా ఏ కస్టమర్లు నమోదు కాలేదు.`;
        biResponse = `మీకు ఇంకా customers ఎవరూ register అవ్వలేదు.`;
      }
    } else if (msgLower.includes('customer') || msgLower.includes('client') || msgLower.includes('కస్టమర్లు') || msgLower.includes('ఖాతాదారులు')) {
      enResponse = `You have built a great loyal base of ${stats.total_customers || 0} registered customers!`;
      teResponse = `మీరు ${stats.total_customers || 0} మంది నమోదిత కస్టమర్లతో గొప్ప పునాదిని నిర్మించుకున్నారు!`;
      biResponse = `మీకు ${stats.total_customers || 0} మంది loyal customers ఉన్నారు. గ్రేట్!`;
    } else if (msgLower.includes('who are you') || msgLower.includes('your name') || msgLower.includes('నీవు ఎవరు') || msgLower.includes('నీ పేరు')) {
      enResponse = "I am DukaanMitra AI, your personal Smart Business Assistant built specifically for Kirana store owners!";
      teResponse = "నేను మీ దుకాణమిత్ర AI ని, కిరాణా స్టోర్ యజమానుల కోసం ప్రత్యేకంగా రూపొందించబడిన మీ వ్యక్తిగత స్మార్ట్ బిజినెస్ అసిస్టెంట్!";
      biResponse = "నేను DukaanMitra AI ని, Kirana store ఓనర్ల కోసం తయారుచేసిన మీ Smart Business Assistant!";
    } else if (msgLower.includes('help') || msgLower.includes('support') || msgLower.includes('సహాయం') || msgLower.includes('సపోర్ట్')) {
      enResponse = "I can help you analyze your total sales, track your low-stock inventory, or provide insights into your products and customers. Just ask!";
      teResponse = "నేను మీ మొత్తం విక్రయాలను విశ్లేషించడంలో, మీ తక్కువ-స్టాక్ ఇన్వెంటరీని ట్రాక్ చేయడంలో లేదా మీ ఉత్పత్తులు మరియు కస్టమర్‌ల గురించి సమాచారం అందించడంలో సహాయపడగలను. అడగండి!";
      biResponse = "నేను మీ total sales analyze చేయడానికి, low-stock inventory ని track చేయడానికి help చేయగలను. అడగండి!";
    }

    const finalResponse = language === 'te' ? teResponse : language === 'bi' ? biResponse : enResponse;
    res.json({ success: true, data: finalResponse });
  }
};

exports.parseBilling = async (req, res, next) => {
  const fallbackParse = (text) => {
    let clean = text.toLowerCase();
    const stop = ["to the cart", "in the cart", "to cart", "in cart", "cart lo", "cart ki", "add chey", "add cheyyi", "veyi", "vey", "kottu", "please"];
    for (const p of stop) clean = clean.replace(new RegExp(`\\b${p}\\b`, 'gi'), ' ');
    
    const nums = { 'one':1,'oka':1,'okati':1,'two':2,'rendu':2,'three':3,'moodu':3,'four':4,'naalugu':4,'five':5,'aidu':5,'six':6,'aaru':6,'seven':7,'edu':7,'eight':8,'enimidi':8,'nine':9,'tommidi':9,'ten':10,'padi':10 };
    Object.keys(nums).forEach(w => clean = clean.replace(new RegExp(`\\b${w}\\b`, 'gi'), nums[w].toString()));
    
    const qtyMatch = clean.match(/\b(\d+)\b/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    
    const units = ["add","put","give","me","want","need","packets","packet","kg","kilos","kilo","liters","liter","grams","gram","pockets","pocket","lu","kavalu","kavali","ivi"];
    let product_name = clean.replace(/\b(\d+)\b/g, ' ');
    for (const u of units) product_name = product_name.replace(new RegExp(`\\b${u}\\b`, 'gi'), ' ');
    product_name = product_name.replace(/\s+/g, ' ').trim();
    
    return { product_name, quantity };
  };

  try {
    const { transcript } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.json({ success: true, data: fallbackParse(transcript) });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `
      You are an expert NLP parser for an Indian grocery store (Kirana) billing app.
      The user speaks a voice command to add an item to the cart. It may be in English, Telugu, or Tanglish (mixed).
      Extract the "product_name" and "quantity".
      CRITICAL RULES for quantity:
      1. If the user just says "add [item]" or "add [item] to cart", the quantity MUST be 1.
      2. The English word "to" (as in "to cart" or "to the bill") is a preposition and MUST NEVER be parsed as the number 2.
      3. "oka" = 1, "rendu" = 2, "moodu" = 3, "naalugu" = 4, "aidu" = 5.
      Output ONLY a valid JSON object with keys "product_name" (string) and "quantity" (number). No markdown, no other text.
      Command: "${transcript}"
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1, // very low for reliable JSON
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    
    // Fallback if LLM fails
    if (!result.product_name) {
      return res.json({ success: true, data: fallbackParse(transcript) });
    }

    res.json({ success: true, data: { product_name: result.product_name, quantity: result.quantity || 1 } });
  } catch (error) {
    console.error("Parse Billing API Error:", error.message);
    // If Groq API fails for any reason (e.g. rate limit, network), fallback gracefully
    if (req.body.transcript) {
      return res.json({ success: true, data: fallbackParse(req.body.transcript) });
    }
    res.status(500).json({ success: false, message: 'Failed to parse voice command' });
  }
};
