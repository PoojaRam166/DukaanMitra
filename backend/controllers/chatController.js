const Groq = require("groq-sdk");
const db = require('../config/db');

const tools = [
  {
    type: "function",
    function: {
      name: "get_today_sales",
      description: "Get the total sales amount for today.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sales_by_period",
      description: "Get the total sales for a specific period (e.g. week, month, year).",
      parameters: { 
        type: "object", 
        properties: { 
          period: { type: "string", enum: ["week", "month", "year"], description: "The time period" } 
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_credit",
      description: "Get the outstanding credit/udhaar balance for a specific customer.",
      parameters: { 
        type: "object", 
        properties: { 
          customer_name: { type: "string", description: "Name of the customer" } 
        },
        required: ["customer_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_credit_summary",
      description: "Get the total outstanding credit across all customers and top pending customers.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_product_stock",
      description: "Get the current stock quantity for a product.",
      parameters: { 
        type: "object", 
        properties: { 
          product_name: { type: "string", description: "Name of the product" } 
        },
        required: ["product_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_low_stock_products",
      description: "Get a list of products running low on stock.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_purchase_history",
      description: "Get purchase history and total spent for a specific customer.",
      parameters: { 
        type: "object", 
        properties: { 
          customer_name: { type: "string", description: "Name of the customer" } 
        },
        required: ["customer_name"]
      }
    }
  }
];

async function getTodaySales(userId) {
  const res = await db.query(`SELECT COALESCE(SUM(total), 0) as total FROM bills WHERE user_id = $1 AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata')`, [userId]);
  return { total_sales_today: parseFloat(res.rows[0].total) };
}

async function getSalesByPeriod(userId, period) {
  let interval = '7 days';
  if (period === 'month') interval = '1 month';
  if (period === 'year') interval = '1 year';
  
  const res = await db.query(`SELECT COALESCE(SUM(total), 0) as total FROM bills WHERE user_id = $1 AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '${interval}'`, [userId]);
  return { period, total_sales: parseFloat(res.rows[0].total) };
}

async function getCustomerCredit(userId, customerName) {
  const res = await db.query(`
    SELECT c.name, SUM(b.total - b.amount_paid) as owed 
    FROM bills b JOIN customers c ON c.id = b.customer_id 
    WHERE b.user_id = $1 AND c.name ILIKE $2 AND b.payment_method = 'credit' AND b.total > b.amount_paid 
    GROUP BY c.id, c.name`, [userId, `%${customerName}%`]);
  
  if (res.rows.length === 0) return { customer: customerName, owed: 0, message: "No outstanding credit found for this customer." };
  return { customer: res.rows[0].name, owed: parseFloat(res.rows[0].owed) };
}

async function getCreditSummary(userId) {
  const totalRes = await db.query(`SELECT COALESCE(SUM(total - amount_paid), 0) as total_credit FROM bills WHERE user_id = $1 AND payment_method = 'credit' AND total > amount_paid`, [userId]);
  const listRes = await db.query(`SELECT c.name, SUM(b.total - b.amount_paid) as owed FROM bills b JOIN customers c ON c.id = b.customer_id WHERE b.user_id = $1 AND b.payment_method = 'credit' AND b.total > b.amount_paid GROUP BY c.id, c.name ORDER BY owed DESC LIMIT 10`, [userId]);
  
  return {
    total_pending_credit: parseFloat(totalRes.rows[0].total_credit),
    customers_owing: listRes.rows.map(r => ({ name: r.name, owed: parseFloat(r.owed) }))
  };
}

async function getProductStock(userId, productName) {
  const res = await db.query(`SELECT name, stock FROM products WHERE user_id = $1 AND name ILIKE $2`, [userId, `%${productName}%`]);
  if (res.rows.length === 0) return { product: productName, message: "Product not found in inventory." };
  return { product: res.rows[0].name, stock: parseInt(res.rows[0].stock) };
}

async function getLowStockProducts(userId) {
  const res = await db.query(`SELECT name, stock, min_stock FROM products WHERE user_id = $1 AND stock <= min_stock LIMIT 20`, [userId]);
  return { low_stock_items: res.rows };
}

async function getCustomerPurchaseHistory(userId, customerName) {
  const cRes = await db.query(`SELECT id, name FROM customers WHERE user_id = $1 AND name ILIKE $2`, [userId, `%${customerName}%`]);
  if (cRes.rows.length === 0) return { customer: customerName, message: "Customer not found." };
  
  const customerId = cRes.rows[0].id;
  const historyRes = await db.query(`SELECT bill_number, total, created_at FROM bills WHERE user_id = $1 AND customer_id = $2 ORDER BY created_at DESC LIMIT 5`, [userId, customerId]);
  const totalSpentRes = await db.query(`SELECT COALESCE(SUM(total), 0) as total_spent FROM bills WHERE user_id = $1 AND customer_id = $2`, [userId, customerId]);
  
  return {
    customer: cRes.rows[0].name,
    total_spent_all_time: parseFloat(totalSpentRes.rows[0].total_spent),
    recent_purchases: historyRes.rows
  };
}

exports.sendMessage = async (req, res, next) => {
  try {
    const { message, language } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.json({ success: true, data: "Chatbot requires Groq API key." });
    }

    let systemPrompt = "You are DukaanMitra AI, a smart assistant for an Indian Kirana store owner.\nYou answer questions by calling tools to fetch live data from the database.\nCRITICAL INSTRUCTIONS:\n1. NEVER hallucinate numbers, names, or stock. If a tool returns no data, say you don't know or it's not found.\n2. Keep responses short, simple, and conversational (under 3 sentences).\n3. Use ₹ for currency.\n4. You are talking to the shop owner, not a customer.\n5. Answer based ONLY on the data returned by tools.";

    if (language === 'te') {
      systemPrompt += "\nYou MUST reply in Telugu script (తెలుగు). Be extremely respectful.";
    } else if (language === 'bi') {
      systemPrompt += "\nYou MUST reply in Tanglish (Telugu script + English words like sales, stock, pending, profit). Real Indian shop owners mix these.";
    } else {
      systemPrompt += "\nYou MUST reply in fluent English.";
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Step 1: Send message to Groq with tools
    let response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: messages,
      tools: tools,
      tool_choice: "auto",
      temperature: 0.2
    });

    let responseMessage = response.choices[0].message;

    // Step 2: Handle tool calls if any
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      messages.push(responseMessage);
      
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let functionResult;
        
        try {
          if (functionName === "get_today_sales") functionResult = await getTodaySales(req.user.id);
          else if (functionName === "get_sales_by_period") functionResult = await getSalesByPeriod(req.user.id, args.period);
          else if (functionName === "get_customer_credit") functionResult = await getCustomerCredit(req.user.id, args.customer_name);
          else if (functionName === "get_credit_summary") functionResult = await getCreditSummary(req.user.id);
          else if (functionName === "get_product_stock") functionResult = await getProductStock(req.user.id, args.product_name);
          else if (functionName === "get_low_stock_products") functionResult = await getLowStockProducts(req.user.id);
          else if (functionName === "get_customer_purchase_history") functionResult = await getCustomerPurchaseHistory(req.user.id, args.customer_name);
          else functionResult = { error: "Unknown tool" };
        } catch(err) {
          functionResult = { error: err.message };
        }
        
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(functionResult),
        });
      }
      
      // Step 3: Call Groq again with the tool results to get the final response
      response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        temperature: 0.2
      });
      responseMessage = response.choices[0].message;
    }

    return res.json({ success: true, data: responseMessage.content });

  } catch (error) {
    console.error("Chat API Error:", error.message);
    res.status(500).json({ success: false, message: 'Failed to process chat request' });
  }
};

const fallbackParseExpense = (transcript) => {
  const numMatch = transcript.match(/\\b(\\d+)\\b/);
  const amount = numMatch ? parseInt(numMatch[1]) : 0;
  return { amount, category: "Miscellaneous", description: transcript };
};

exports.parseExpenseVoice = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!process.env.GROQ_API_KEY) {
      return res.json({ success: true, data: fallbackParseExpense(transcript) });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = \`
      You are an expert AI parser for a shop owner's expense tracker.
      The user speaks a voice command to log an expense. It may be in English, Telugu, or Tanglish.
      Extract the "amount", "category", and "description".
      Categories must be one of: "Inventory", "Salary", "Rent", "Utilities", "Electricity Bill", "Transport", "Purchase Cost", "Marketing", "Maintenance", "Other".
      Common expense contexts: electricity bill, rent, transport, purchase cost, supplies, vendor payments.
      Output ONLY a valid JSON object with keys "amount" (number), "category" (string), and "description" (string).
      Command: "\${transcript}"
    \`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    if (!result.amount || !result.category) {
      return res.json({ success: true, data: fallbackParseExpense(transcript) });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Parse Expense API Error:", error.message);
    if (req.body.transcript) {
      return res.json({ success: true, data: fallbackParseExpense(req.body.transcript) });
    }
    res.status(500).json({ success: false, message: 'Failed to parse voice command' });
  }
};

exports.parseBilling = async (req, res, next) => {
  const fallbackParse = (text) => {
    let clean = text.toLowerCase();
    const stop = ["to the cart", "in the cart", "to cart", "in cart", "cart lo", "cart ki", "add chey", "add cheyyi", "veyi", "vey", "kottu", "please", "ivvu", "ivandi", "kavali", "add", "bill lo", "esey"];
    for (const p of stop) clean = clean.replace(new RegExp(\`\\\\b\${p}\\\\b\`, 'gi'), ' ');

    const nums = { 'one': 1, 'oka': 1, 'okati': 1, 'two': 2, 'rendu': 2, 'three': 3, 'moodu': 3, 'four': 4, 'naalugu': 4, 'five': 5, 'aidu': 5, 'six': 6, 'aaru': 6, 'seven': 7, 'edu': 7, 'eight': 8, 'enimidi': 8, 'nine': 9, 'tommidi': 9, 'ten': 10, 'padi': 10 };
    Object.keys(nums).forEach(w => clean = clean.replace(new RegExp(\`\\\\b\${w}\\\\b\`, 'gi'), nums[w].toString()));

    const qtyMatch = clean.match(/\\b(\\d+)\\b/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    const units = ["add", "put", "give", "me", "want", "need", "packets", "packet", "kg", "kilos", "kilo", "liters", "liter", "grams", "gram", "pockets", "pocket", "lu", "kavalu", "kavali", "ivi"];
    let product_name = clean.replace(/\\b(\\d+)\\b/g, ' ');
    for (const u of units) product_name = product_name.replace(new RegExp(\`\\\\b\${u}\\\\b\`, 'gi'), ' ');
    product_name = product_name.replace(/\\s+/g, ' ').trim();

    return { product_name, quantity };
  };

  try {
    const { transcript } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.json({ success: true, data: fallbackParse(transcript) });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = \`
      You are an expert NLP parser for an Indian grocery store (Kirana) billing app.
      The user speaks a voice command to add an item to the cart. It may be in English, Telugu, or Tanglish (mixed).
      Extract the "product_name" and "quantity".
      CRITICAL RULES for quantity:
      1. If the user just says "add [item]" or "add [item] to cart", the quantity MUST be 1.
      2. The English word "to" (as in "to cart" or "to the bill") is a preposition and MUST NEVER be parsed as the number 2.
      3. "oka" = 1, "rendu" = 2, "moodu" = 3, "naalugu" = 4, "aidu" = 5.
      Output ONLY a valid JSON object with keys "product_name" (string) and "quantity" (number). No markdown, no other text.
      Command: "\${transcript}"
    \`;

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
