const Groq = require("groq-sdk");
const db = require('../config/db');

exports.sendMessage = async (req, res, next) => {
  try {
    const { message, language } = req.body;

    if (!process.env.GROQ_API_KEY) {
      // Just a check to log if we want, but we don't return here anymore, 
      // we let it fall through to the fallback at the bottom.
    }

    const statsRes = await db.query(`
      WITH user_bills AS (
        SELECT * FROM bills WHERE user_id = $1
      ),
      user_expenses AS (
        SELECT * FROM expenses WHERE user_id = $1
      )
      SELECT 
        (SELECT COALESCE(SUM(total), 0) FROM user_bills) AS total_sales,
        (SELECT COUNT(*) FROM user_bills) AS total_bills,
        
        (SELECT COALESCE(SUM(total), 0) FROM user_bills WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata')) AS sales_today,
        (SELECT COALESCE(SUM(total), 0) FROM user_bills WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('day', (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day') AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') < DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata')) AS sales_yesterday,
        (SELECT COALESCE(SUM(total), 0) FROM user_bills WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '7 days') AS sales_week,
        (SELECT COALESCE(SUM(total), 0) FROM user_bills WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')) AS sales_month,
        (SELECT COALESCE(SUM(total), 0) FROM user_bills WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('year', NOW() AT TIME ZONE 'Asia/Kolkata')) AS sales_year,

        (SELECT COALESCE(SUM(amount), 0) FROM user_expenses WHERE date >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) AS exp_today,
        (SELECT COALESCE(SUM(amount), 0) FROM user_expenses WHERE date = (DATE_TRUNC('day', (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day'))::DATE) AS exp_yesterday,
        (SELECT COALESCE(SUM(amount), 0) FROM user_expenses WHERE date >= ((NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '7 days')::DATE) AS exp_week,
        
        (SELECT COUNT(*) FROM products WHERE user_id = $1) AS total_products,
        (SELECT COUNT(*) FROM products WHERE user_id = $1 AND stock <= min_stock) AS low_stock_items,
        (SELECT COUNT(*) FROM customers WHERE user_id = $1) AS total_customers,
        (SELECT COALESCE(SUM(total - amount_paid), 0) FROM user_bills WHERE payment_method = 'credit' AND total > amount_paid) AS total_credit,
        (SELECT COALESCE(SUM(total), 0) FROM user_bills WHERE payment_method = 'cash') AS total_cash,
        (SELECT COALESCE(SUM(total), 0) FROM user_bills WHERE payment_method IN ('upi', 'phonepe', 'gpay', 'paytm')) AS total_upi,
        (SELECT COALESCE(SUM(total), 0) FROM user_bills WHERE payment_method = 'card') AS total_card
    `, [req.user.id]);

    let stats = statsRes.rows[0] || {};

    const [customersRes, productsRes, creditNamesRes, lowStockRes, expensesRes, topProductsRes, topCustomersRes] = await Promise.all([
      db.query('SELECT name FROM customers WHERE user_id = $1 LIMIT 100', [req.user.id]),
      db.query('SELECT name, stock FROM products WHERE user_id = $1 LIMIT 500', [req.user.id]),
      db.query(`SELECT c.name, SUM(b.total - b.amount_paid) as owed FROM bills b JOIN customers c ON c.id = b.customer_id WHERE b.user_id = $1 AND b.payment_method = 'credit' AND b.total > b.amount_paid GROUP BY c.id, c.name LIMIT 50`, [req.user.id]),
      db.query(`SELECT name, stock FROM products WHERE user_id = $1 AND stock <= min_stock LIMIT 50`, [req.user.id]),
      db.query(`SELECT category, amount, date FROM expenses WHERE user_id = $1 ORDER BY date DESC LIMIT 15`, [req.user.id]),
      db.query(`
        SELECT p.name, SUM(bi.quantity) as qty_sold 
        FROM bill_items bi 
        JOIN bills b ON b.id = bi.bill_id 
        JOIN products p ON p.id = bi.product_id 
        WHERE b.user_id = $1 
        GROUP BY p.id, p.name 
        ORDER BY qty_sold DESC 
        LIMIT 10
      `, [req.user.id]),
      db.query(`
        SELECT c.name, COUNT(b.id) as visit_count, SUM(b.total) as total_spent 
        FROM customers c 
        JOIN bills b ON c.id = b.customer_id 
        WHERE b.user_id = $1 
        GROUP BY c.id, c.name 
        ORDER BY total_spent DESC 
        LIMIT 10
      `, [req.user.id])
    ]);

    const customerNames = customersRes.rows.map(r => r.name).join(', ');
    const productNames = productsRes.rows.map(r => `${r.name} (${r.stock} left)`).join(', ');
    const creditNames = creditNamesRes.rows.map(r => `${r.name} (₹${r.owed})`).join(', ');
    const lowStockNames = lowStockRes.rows.map(r => `${r.name} (${r.stock} left)`).join(', ');
    const recentExpenses = expensesRes.rows.map(r => `${r.category}: ₹${r.amount}`).join(', ');
    const topProducts = topProductsRes.rows.map(r => `${r.name} (${r.qty_sold} sold)`).join(', ');
    const topCustomers = topCustomersRes.rows.map(r => `${r.name} (₹${r.total_spent} spent)`).join(', ');

    let prompt = `
      You are DukaanMitra AI, an incredibly smart, respectful, and helpful virtual assistant for an Indian Kirana (grocery) store owner.
      You are directly connected to their live PostgreSQL database.
      
      Live Store Context:
      - Total All-Time Sales: ₹${stats.total_sales} (from ${stats.total_bills} bills)
      - Sales: Today: ₹${stats.sales_today} | Yesterday: ₹${stats.sales_yesterday} | Week: ₹${stats.sales_week} | Month: ₹${stats.sales_month} | Year: ₹${stats.sales_year}
      - Expenses: Today: ₹${stats.exp_today} | Yesterday: ₹${stats.exp_yesterday} | Week: ₹${stats.exp_week}
      - Recent Expenses List: ${recentExpenses || 'None recorded yet'}
      - Payments: Cash: ₹${stats.total_cash} | UPI: ₹${stats.total_upi} | Card: ₹${stats.total_card}
      - Total Pending Udhaar/Credit: ₹${stats.total_credit}
      - Customers Owe Credit: ${creditNames || 'None'}
      - Items Running Out of Stock: ${stats.low_stock_items} items (${lowStockNames || 'None'})
      - Total Distinct Products: ${stats.total_products}
      - Top Best-Selling Products: ${topProducts || 'None yet'}
      - Top Regular Customers (By Spend): ${topCustomers || 'None yet'}
      - Total Registered Customers: ${stats.total_customers}
      - All Registered Customers: ${customerNames || 'None yet'}
      - All Inventory Products (Real Data): ${productNames || 'None yet'}
      
      The store owner just asked you: "${message}"
      
      Kirana Vocabulary & Context Guide (Use this to understand their domain):
      - Grocery/Products: rice (biyyam), sugar (panchadara), salt (uppu), oil (noone), atta (godhuma pindi), maida, rava (sooji), poha (atukulu).
      - Dals: dal (pappu), toor dal (kandi pappu), moong dal (pesara pappu), urad dal (minapappu), chana dal (senaga pappu).
      - Spices: spices (masala), turmeric (pasupu), mirchi powder (karam), jeera, coriander (dhaniyalu).
      - Drinks/Snacks: milk (paalu), curd (perugu), buttermilk, tea powder, coffee, soft drinks, juice, water bottle, biscuits, chips, chocolate, namkeen, noodles, bread.
      - Household: soap, shampoo, detergent, toothpaste, toothbrush, washing powder, dishwash, phenyl.
      - Stock/Supply: stock (samanlu, maal), inventory (samanla list), available (undha, unnaya), out of stock (aipoyindi, ledu, stock ledu), low stock (takkuva undi, almost aipoyindi), reorder (malli konali, order pettali), supplier (wholesaler, distributor).
      - Sales/Finance: sales (business, ammakalu, ammindi, ammam), purchase (konugolu, konnavi), profit (labham), loss (nashtam), expense (kharchu), price (rate, dhara), quantity (entha, enni).
      - Payments/Credit: payment (dabbu, pay), cash (nagadu), credit (udhaar, appu, pending), balance (migilindi), credit sale (udhaar sale, appu ki ichina), customer (grahakudu, buyer).
      - Analytics/Time: best selling, slow selling, highest sales, lowest sales, prediction, today, yesterday, tomorrow, this week, this month.
      
      CRITICAL Example Interactions — You MUST match the user's question to the correct data topic:
      
      STOCK / INVENTORY questions (check 'All Inventory Products' list):
      - "naa daggara stock entha?" / "stock entha undi?" / "నా దగ్గర స్టాక్ ఎంత?" → Reply with inventory/stock info, NOT sales.
      - "rice undha?" / "rice stock entha undi?" / "rice ledu?" → Check the product list and reply stock count.
      - "emem stock takkuva ga undi?" / "low stock emi undi?" → List low stock items from context.
      - "total stock value entha?" / "inventory viluva entha?" → Reply with total_stock_value.
      AI (stock > 0): "అవును, మీ దగ్గర [X] [Product] స్టాక్ ఉంది."
      AI (stock = 0): "లేదు, [Product] ప్రస్తుతం అయిపోయింది."
      
      SALES questions:
      - "ivala sales entha?" / "today ammakam entha?" / "ఈరోజు విక్రయాలు?" → Reply with sales_today.
      - "this week sales?" / "nela ammakalu?" → Reply with sales_week or sales_month.
      AI: "ఈరోజు మీ అమ్మకాలు ₹[X]."
      
      UDHAAR / CREDIT questions:
      - "Ramesh ki entha udhaar undi?" / "total udhaar entha?" → Reply with credit info.
      - "evaru baaki ivvali?" / "pending credit list" → List customers who owe money.
      AI: "రమేష్ మీకు ₹[X] బాకీ ఉన్నారు."
      
      EXPENSE questions:
      - "ikkade expenses entha?" / "ఈరోజు ఖర్చు?" → Reply with expense data.
      
      CUSTOMER questions (use 'All Registered Customers' and 'Top Regular Customers' from context):
      - "na customers evaru?" / "naa customers list cheppu" / "మీ కస్టమర్లు ఎవరు?" → List registered customers.
      - "regular customers evaru?" / "ela customers vastaaru?" / "ela vastuntaaru?" / "most visited customers?" / "ఎక్కువ వచ్చే customers?" → List top regular customers by visit count / spend from 'Top Regular Customers (By Spend)' context.
      - "[Name] ki details cheppu" / "[Name] gurinchi cheppu" → If customer found in list, tell their visit count and total spend. If not found, say so.
      AI (customer query): "మీ టాప్ కస్టమర్లు: [Names with spend]. వీరు మీకు చాలా విశ్వాసంగా వస్తారు!"
      
      LOW STOCK / REORDER questions (use 'Items Running Out of Stock' from context):
      - "emem stock takkuva undi?" / "low stock items emi?" / "స్టాక్ తక్కువగా ఉన్నవి?" / "emem order cheyyali?" / "reorder list" → List all items from 'Items Running Out of Stock' in context.
      AI (low stock): "ఈ వస్తువుల స్టాక్ తక్కువగా ఉంది: [List]. వాటిని వెంటనే తెప్పించుకోండి."
      
      PAYMENT questions:
      - "cash entha vachindi?" / "UPI collections?" → Reply with payment breakdown.
      
      Rules for your response:
      1. Be highly conversational, warm, and extremely respectful.
      2. Keep it concise (under 3 short sentences). No long paragraphs.
      3. CRITICAL TOPIC DETECTION: Read the user's question carefully. "stock entha", "naa daggara", "undha", "ledu", "undi" → these are STOCK questions. "sales", "ammakalu", "ammam" → these are SALES questions. NEVER give a sales answer to a stock question.
      4. CRITICAL: NEVER hallucinate or assume. If asked about stock, FIRST check the 'All Inventory Products' list. If stock > 0, say YES and give the number. If stock is 0 or the item is not in the list, you MUST say NO / OUT OF STOCK.
      5. Never mention the "PostgreSQL database" or "Live Store Context" directly. Just speak naturally.
      6. IMPORTANT: You are an internal assistant for the SHOPKEEPER ONLY. Do not act like a customer-facing chatbot. 
      7. Adapt your language exactly to the user's selected language (Telugu, English, or Tanglish) as instructed below.
    `;

    if (language === 'te') {
      prompt += `\nCRITICAL LANGUAGE INSTRUCTION: మీరు పూర్తిగా తెలుగు లిపిలో (Telugu script) సమాధానం ఇవ్వాలి.
      - అన్ని సమాధానాలూ తెలుగులోనే ఉండాలి — చాలా గౌరవంగా మరియు వినయంగా మాట్లాడాలి.
      - Business figures (₹ amounts, product names, customer names) ని అలాగే ఉంచండి — వాటిని translate చేయవద్దు.
      - Example (Sales): "ఈరోజు మీ అమ్మకాలు ₹${stats.sales_today}. చాలా బాగుంది!"
      - Example (Stock): "అవును, మీ దగ్గర [X] [Product] స్టాక్ ఉంది."
      - Example (Low Stock): "స్టాక్ తక్కువగా ఉన్న వస్తువులు: [Items]. వీటిని వెంటనే తెప్పించుకోండి."
      - Example (Top Customers): "మీ టాప్ కస్టమర్లు: [Names with ₹ spent]. వీరు మీకు చాలా విశ్వాసంగా వస్తారు!"
      - Example (Customer Details): "[Name] మీ దుకాణానికి [N] సార్లు వచ్చారు మరియు మొత్తం ₹[X] ఖర్చు చేశారు."
      - Example (All Customers): "మీ నమోదైన కస్టమర్లు: [Names]."
      - Example (Credit): "మీకు మొత్తం ₹${stats.total_credit} అప్పు పెండింగ్‌లో ఉంది."
      - Rule: NEVER hallucinate numbers. Only use data from the Live Store Context above.
      - Rule: Keep it short — 1 to 3 sentences max. No long essays.
      - Rule: Be warm, helpful, and extremely polite — address the owner as 'మీరు'.
      - Rule: For customer/low-stock questions, always read from the provided context lists — do NOT say 'no data' if the lists are populated.`;
    } else if (language === 'bi') {
      prompt += `\nCRITICAL LANGUAGE INSTRUCTION: You MUST reply in a highly natural "Tanglish" mix (Telugu script + English words). 
      - Use Telugu script for grammar and structure, but write business words in English.
      - Example: "మీ store sales ఈరోజు చాలా బాగున్నాయి! మీకు ${stats.low_stock_items} products కి low stock ఉంది. వాటిని వెంటనే restock చేసుకోండి."
      - Do NOT use 100% pure Telugu. Real Indian shop owners mix English business words (sales, stock, customers, profit, products) into their Telugu sentences.`;
    } else {
      prompt += `\nCRITICAL LANGUAGE INSTRUCTION: You MUST reply in fluent English. Be highly respectful.`;
    }

    if (process.env.GROQ_API_KEY) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
      });
      const text = chatCompletion.choices[0]?.message?.content || "";
      return res.json({ success: true, data: text });
    } else {
      throw new Error("No API Key");
    }

  } catch (error) {
    console.error("Chat API Error:", error.message);
    const { language, message: userMsg } = req.body;
    const msgLower = (userMsg || '').toLowerCase();

    // Fallback if stats were not fetched properly
    // (If the error was Groq, we actually lost access to the block scoped `stats` variables here.
    // Ideally they should be declared outside `try`, but for now we'll just query them again or use 0s if DB fails)
    let fbStats = { total_sales: 0, sales_today: 0, sales_yesterday: 0, sales_week: 0, sales_month: 0, sales_year: 0, exp_today: 0, exp_yesterday: 0, exp_week: 0, low_stock_items: 0, total_products: 0, total_customers: 0, total_credit: 0, total_bills: 0, total_stock_value: 0 };
    let pNames = '', cNames = '', lsNames = '', globalTcNames = '';
    let cResRows = [];
    let pResRows = [];

    try {
      const statsRes = await db.query(`
        WITH b AS (SELECT * FROM bills WHERE user_id = $1), e AS (SELECT * FROM expenses WHERE user_id = $1)
        SELECT 
          (SELECT COALESCE(SUM(total), 0) FROM b) AS total_sales,
          (SELECT COUNT(*) FROM b) AS total_bills,
          (SELECT COALESCE(SUM(total), 0) FROM b WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata')) AS sales_today,
          (SELECT COALESCE(SUM(total), 0) FROM b WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('day', (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day') AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') < DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata')) AS sales_yesterday,
          (SELECT COALESCE(SUM(total), 0) FROM b WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '7 days') AS sales_week,
          (SELECT COALESCE(SUM(total), 0) FROM b WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')) AS sales_month,
          (SELECT COALESCE(SUM(total), 0) FROM b WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= DATE_TRUNC('year', NOW() AT TIME ZONE 'Asia/Kolkata')) AS sales_year,
          (SELECT COALESCE(SUM(amount), 0) FROM e WHERE date >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Kolkata')::DATE) AS exp_today,
          (SELECT COALESCE(SUM(amount), 0) FROM e WHERE date = (DATE_TRUNC('day', (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day'))::DATE) AS exp_yesterday,
          (SELECT COALESCE(SUM(amount), 0) FROM e WHERE date >= ((NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '7 days')::DATE) AS exp_week,
          (SELECT COUNT(*) FROM products WHERE user_id = $1 AND stock <= min_stock) AS low_stock_items,
          (SELECT COALESCE(SUM(total - amount_paid), 0) FROM b WHERE payment_method = 'credit' AND total > amount_paid) AS total_credit,
          (SELECT COALESCE(SUM(total), 0) FROM b WHERE payment_method = 'cash') AS total_cash,
          (SELECT COALESCE(SUM(total), 0) FROM b WHERE payment_method IN ('upi', 'phonepe', 'gpay', 'paytm')) AS total_upi,
          (SELECT COALESCE(SUM(total), 0) FROM b WHERE payment_method = 'card') AS total_card,
          (SELECT COALESCE(SUM(stock * sell_price), 0) FROM products WHERE user_id = $1 AND stock > 0) AS total_stock_value
      `, [req.user.id]);
      fbStats = statsRes.rows[0];

      const [cRes, pRes, lRes, tcRes] = await Promise.all([
        db.query(`SELECT c.name, SUM(b.total - b.amount_paid) as owed FROM bills b JOIN customers c ON c.id = b.customer_id WHERE b.user_id = $1 AND b.payment_method = 'credit' AND b.total > b.amount_paid GROUP BY c.id, c.name ORDER BY owed DESC LIMIT 20`, [req.user.id]),
        db.query(`SELECT name, stock FROM products WHERE user_id = $1 LIMIT 100`, [req.user.id]),
        db.query(`SELECT name, stock FROM products WHERE user_id = $1 AND stock <= min_stock LIMIT 20`, [req.user.id]),
        db.query(`SELECT c.name, SUM(b.total) as total_spent FROM customers c JOIN bills b ON c.id = b.customer_id WHERE b.user_id = $1 GROUP BY c.id, c.name ORDER BY total_spent DESC LIMIT 10`, [req.user.id])
      ]);
      cResRows = cRes.rows;
      pResRows = pRes.rows;
      cNames = cRes.rows.map(r => `${r.name} (₹${r.owed})`).join(', ');
      pNames = pRes.rows.map(r => `${r.name} (${r.stock})`).join(', ');
      lsNames = lRes.rows.map(r => `${r.name} (${r.stock})`).join(', ');
      let tcNames = tcRes.rows.map(r => `${r.name} (₹${r.total_spent} spent)`).join(', ');
      globalTcNames = tcNames; // Save for fallback logic use
    } catch (e) {
      globalTcNames = '';
    }

    let enResponse = `Based on your store data, your total all-time sales are ₹${fbStats.total_sales}. Keep up the great work!`;
    let teResponse = `మీ స్టోర్ డేటా ఆధారంగా, మీ మొత్తం విక్రయాలు ₹${fbStats.total_sales}. ఇలాగే మంచి పనిని కొనసాగించండి!`;
    let biResponse = `మీ store data ప్రకారం, మీ total sales ₹${fbStats.total_sales}. Keep it up!`;

    // 1. Udhaar / Credit logic
    let mentionedCustomer = null;
    let mentionedProduct = null;
    if (cResRows.length > 0) {
      mentionedCustomer = cResRows.find(c => c.name && msgLower.includes(c.name.toLowerCase()));
    }
    if (pResRows.length > 0) {
      mentionedProduct = pResRows.find(p => p.name && msgLower.includes(p.name.toLowerCase()));
    }

    if (msgLower.includes('udhar') || msgLower.includes('udhaar') || msgLower.includes('credit') || msgLower.includes('pending') || msgLower.includes('అప్పు') || msgLower.includes('బాకీ') || msgLower.includes('katha') || msgLower.includes('balance') || msgLower.includes('ivvali') || msgLower.includes('due')) {
      if (mentionedCustomer) {
        enResponse = `${mentionedCustomer.name} owes you ₹${mentionedCustomer.owed}.`;
        teResponse = `${mentionedCustomer.name} మీకు ₹${mentionedCustomer.owed} బాకీ ఉన్నారు.`;
        biResponse = `${mentionedCustomer.name} కు ₹${mentionedCustomer.owed} pending ఉంది.`;
      } else {
        enResponse = `You have a total of ₹${fbStats.total_credit} in pending credit/udhaar. ${cNames ? `Customers who owe you include: ${cNames}.` : 'No customers currently owe you.'}`;
        teResponse = `మీకు మొత్తం ₹${fbStats.total_credit} అప్పు/బాకీ పెండింగ్‌లో ఉంది. ${cNames ? `మీకు అప్పు ఉన్న కస్టమర్లు: ${cNames}.` : 'ప్రస్తుతం మీకు ఎవరూ అప్పు లేరు.'}`;
        biResponse = `మీకు total ₹${fbStats.total_credit} credit/udhaar pending లో ఉంది. ${cNames ? `మీకు pending ఉన్న customers: ${cNames}.` : 'ప్రస్తుతం customers ఎవరూ credit లో లేరు.'}`;
      }

      // 1b. Customer List logic
    } else if (msgLower.includes('customer') || msgLower.includes('regular') || mentionedCustomer) {
      if (mentionedCustomer) {
        enResponse = `You asked about ${mentionedCustomer.name}. They currently owe you ₹${mentionedCustomer.owed}.`;
        teResponse = `మీరు ${mentionedCustomer.name} గురించి అడిగారు. వారు మీకు ₹${mentionedCustomer.owed} బాకీ ఉన్నారు.`;
        biResponse = `మీరు ${mentionedCustomer.name} గురించి అడిగారు. వారికి ₹${mentionedCustomer.owed} pending ఉంది.`;
      } else {
        enResponse = `Your regular top customers include: ${globalTcNames || 'No registered customers yet'}.`;
        teResponse = `మీ రెగ్యులర్ టాప్ కస్టమర్లు: ${globalTcNames || 'ఇంకా ఎవరూ లేరు'}.`;
        biResponse = `మీ regular top customers list: ${globalTcNames || 'No customers yet'}.`;
      }

      // 1c. Stock/Product logic
    } else if (msgLower.includes('available') || msgLower.includes('stock') || msgLower.includes('undha') || msgLower.includes('unnaya') || msgLower.includes('ledu') || mentionedProduct) {
      if (mentionedProduct) {
        if (mentionedProduct.stock > 0) {
          enResponse = `Yes, ${mentionedProduct.name} is available. You have ${mentionedProduct.stock} left in stock.`;
          teResponse = `అవును, ${mentionedProduct.name} అందుబాటులో ఉంది. మీ వద్ద ${mentionedProduct.stock} స్టాక్ ఉంది.`;
          biResponse = `Yes, ${mentionedProduct.name} available గా ఉంది. మీ దగ్గర ${mentionedProduct.stock} stock ఉంది.`;
        } else {
          enResponse = `No, ${mentionedProduct.name} is currently out of stock.`;
          teResponse = `లేదు, ${mentionedProduct.name} ప్రస్తుతం స్టాక్ లేదు.`;
          biResponse = `No, ${mentionedProduct.name} ప్రస్తుతం out of stock అయిపోయింది.`;
        }
      } else {
        enResponse = `Here is your current inventory: ${pNames || 'No items in stock yet'}.`;
        teResponse = `మీ ప్రస్తుత ఇన్వెంటరీ ఇక్కడ ఉంది: ${pNames || 'ఇంకా స్టాక్ లేదు'}.`;
        biResponse = `మీ current inventory: ${pNames || 'No items yet'}.`;
      }

      // 2. Expenses Logic
    } else if (msgLower.includes('expense') || msgLower.includes('karchu') || msgLower.includes('ఖర్చు') || msgLower.includes('supplier')) {
      if (msgLower.includes('today') || msgLower.includes('ఈరోజు') || msgLower.includes('eroju') || msgLower.includes('aaj') || msgLower.includes('ivala')) {
        enResponse = `Your expenses for today are ₹${fbStats.exp_today}.`;
        teResponse = `ఈరోజు మీ ఖర్చులు ₹${fbStats.exp_today}.`;
        biResponse = `ఈరోజు మీ expenses ₹${fbStats.exp_today}.`;
      } else if (msgLower.includes('yesterday') || msgLower.includes('నిన్న') || msgLower.includes('ninna')) {
        enResponse = `Your expenses for yesterday were ₹${fbStats.exp_yesterday}.`;
        teResponse = `నిన్నటి మీ ఖర్చులు ₹${fbStats.exp_yesterday}.`;
        biResponse = `నిన్న మీ expenses ₹${fbStats.exp_yesterday}.`;
      } else if (msgLower.includes('week') || msgLower.includes('వారం') || msgLower.includes('varam')) {
        enResponse = `Your expenses for the past 7 days are ₹${fbStats.exp_week}.`;
        teResponse = `గత 7 రోజుల మీ ఖర్చులు ₹${fbStats.exp_week}.`;
        biResponse = `గత 7 రోజుల్లో మీ weekly expenses ₹${fbStats.exp_week}.`;
      } else {
        enResponse = `Your expenses today are ₹${fbStats.exp_today} and ₹${fbStats.exp_week} this week.`;
        teResponse = `ఈరోజు మీ ఖర్చులు ₹${fbStats.exp_today} మరియు ఈ వారం ₹${fbStats.exp_week}.`;
        biResponse = `ఈరోజు మీ expenses ₹${fbStats.exp_today} మరియు ఈ week ₹${fbStats.exp_week}.`;
      }

      // 3. Sales Logic (Date ranges)
    } else if (msgLower.includes('sales') || msgLower.includes('profit') || msgLower.includes('అమ్మకాలు') || msgLower.includes('ammalu') || msgLower.includes('ammakam') || msgLower.includes('ammudainadi') || msgLower.includes('selling') || msgLower.includes('business') || msgLower.includes('ammam')) {
      if (msgLower.includes('today') || msgLower.includes('ఈరోజు') || msgLower.includes('eroju') || msgLower.includes('eeroju') || msgLower.includes('aaj') || msgLower.includes('ivala') || msgLower.includes('ivvala')) {
        enResponse = `Your sales for today are ₹${fbStats.sales_today}. Great job!`;
        teResponse = `ఈరోజు మీ అమ్మకాలు ₹${fbStats.sales_today}. చాలా బాగుంది!`;
        biResponse = `ఈరోజు మీ sales ₹${fbStats.sales_today}. సూపర్!`;
      } else if (msgLower.includes('yesterday') || msgLower.includes('నిన్న') || msgLower.includes('ninna')) {
        enResponse = `Your sales for yesterday were ₹${fbStats.sales_yesterday}.`;
        teResponse = `నిన్నటి మీ అమ్మకాలు ₹${fbStats.sales_yesterday}.`;
        biResponse = `నిన్న మీ sales ₹${fbStats.sales_yesterday}.`;
      } else if (msgLower.includes('week') || msgLower.includes('వారం') || msgLower.includes('varam')) {
        enResponse = `Your sales for the past 7 days are ₹${fbStats.sales_week}.`;
        teResponse = `గత 7 రోజుల మీ అమ్మకాలు ₹${fbStats.sales_week}.`;
        biResponse = `గత 7 రోజుల్లో మీ weekly sales ₹${fbStats.sales_week}.`;
      } else if (msgLower.includes('month') || msgLower.includes('నెల') || msgLower.includes('nela')) {
        enResponse = `Your sales for this month are ₹${fbStats.sales_month}.`;
        teResponse = `ఈ నెల మీ అమ్మకాలు ₹${fbStats.sales_month}.`;
        biResponse = `ఈ నెల మీ sales ₹${fbStats.sales_month}.`;
      } else if (msgLower.includes('year') || msgLower.includes('సంవత్సరం') || msgLower.includes('samvatsaram')) {
        enResponse = `Your sales for this year are ₹${fbStats.sales_year}.`;
        teResponse = `ఈ సంవత్సరం మీ అమ్మకాలు ₹${fbStats.sales_year}.`;
        biResponse = `ఈ year మీ sales ₹${fbStats.sales_year}.`;
      } else {
        enResponse = `Your all-time total sales are ₹${fbStats.total_sales} from ${fbStats.total_bills} bills. Keep it up!`;
        teResponse = `మీ మొత్తం విక్రయాలు ₹${fbStats.total_sales} (${fbStats.total_bills} బిల్లుల నుండి). ఇలాగే కొనసాగించండి!`;
        biResponse = `మీ total sales ₹${fbStats.total_sales} (${fbStats.total_bills} bills నుండి). Keep it up!`;
      }

      // 4. Products / Low Stock Name Listing
    } else if ((msgLower.includes('name') || msgLower.includes('what') || msgLower.includes('ఏమిటి') || msgLower.includes('పేరు') || msgLower.includes('ye') || msgLower.includes('e') || msgLower.includes('enti')) && (msgLower.includes('stock') || msgLower.includes('product') || msgLower.includes('item') || msgLower.includes('సరుకులు') || msgLower.includes('వస్తువులు'))) {
      if (msgLower.includes('low') || msgLower.includes('empty') || msgLower.includes('తక్కువ') || msgLower.includes('takkuva') || msgLower.includes('aipoyina') || msgLower.includes('reorder')) {
        enResponse = `You have ${fbStats.low_stock_items} items low on stock. They are: ${lsNames || 'None'}.`;
        teResponse = `మీకు ${fbStats.low_stock_items} వస్తువుల స్టాక్ తక్కువగా ఉంది. అవి: ${lsNames || 'ఏమీ లేవు'}.`;
        biResponse = `మీకు ${fbStats.low_stock_items} items low stock లో ఉన్నాయి. అవి: ${lsNames || 'ఏమీ లేవు'}.`;
      } else {
        enResponse = `Here are some products in your inventory: ${pNames || 'None'}.`;
        teResponse = `మీ ఇన్వెంటరీలోని కొన్ని ఉత్పత్తులు: ${pNames || 'ఏమీ లేవు'}.`;
        biResponse = `మీ inventory లోని కొన్ని products: ${pNames || 'ఏమీ లేవు'}.`;
      }

      // 5. Generic Low Stock Alert
    } else if (msgLower.includes('stock') || msgLower.includes('inventory') || msgLower.includes('స్టాక్') || msgLower.includes('entha') || msgLower.includes('undha') || msgLower.includes('undi') || mentionedProduct) {
      if (mentionedProduct) {
        enResponse = `You have ${mentionedProduct.stock} left of ${mentionedProduct.name}.`;
        teResponse = `మీ దగ్గర ${mentionedProduct.stock} ${mentionedProduct.name} స్టాక్ ఉంది.`;
        biResponse = `మీ దగ్గర ${mentionedProduct.stock} ${mentionedProduct.name} stock ఉంది.`;
      } else if (msgLower.includes('value') || msgLower.includes('worth') || msgLower.includes('amount') || msgLower.includes('entha') || msgLower.includes('viluva')) {
        enResponse = `The total estimated value of your current stock is ₹${fbStats.total_stock_value}.`;
        teResponse = `మీ ప్రస్తుత స్టాక్ మొత్తం అంచనా విలువ ₹${fbStats.total_stock_value}.`;
        biResponse = `మీ current stock మొత్తం value ₹${fbStats.total_stock_value}.`;
      } else {
        const lsText = lsNames ? ` (including: ${lsNames})` : '';
        enResponse = `You currently have ${fbStats.low_stock_items} items running low on stock${lsText}. Your total inventory is worth ₹${fbStats.total_stock_value}.`;
        teResponse = `ప్రస్తుతం మీ స్టోర్‌లో ${fbStats.low_stock_items} వస్తువుల స్టాక్ తక్కువగా ఉంది${lsText}. మీ మొత్తం స్టాక్ విలువ ₹${fbStats.total_stock_value}.`;
        biResponse = `ప్రస్తుతం మీ store లో ${fbStats.low_stock_items} items కు low stock ఉంది${lsText}. మీ total inventory value ₹${fbStats.total_stock_value}.`;
      }

      // 5b. Payment Types
    } else if (msgLower.includes('payment') || msgLower.includes('cash') || msgLower.includes('upi') || msgLower.includes('card') || msgLower.includes('చెల్లింపు') || msgLower.includes('డబ్బు')) {
      enResponse = `Your payment breakdown is: Cash ₹${fbStats.total_cash}, UPI ₹${fbStats.total_upi}, Card ₹${fbStats.total_card}.`;
      teResponse = `మీ చెల్లింపుల వివరాలు: నగదు ₹${fbStats.total_cash}, UPI ₹${fbStats.total_upi}, కార్డ్ ₹${fbStats.total_card}.`;
      biResponse = `మీ payment వివరాలు: Cash ₹${fbStats.total_cash}, UPI ₹${fbStats.total_upi}, Card ₹${fbStats.total_card}.`;

      // 6. Bills
    } else if (msgLower.includes('bills') || msgLower.includes('బిల్లులు')) {
      enResponse = `You have generated a total of ${fbStats.total_bills} bills all-time!`;
      teResponse = `మీరు మొత్తంగా ${fbStats.total_bills} బిల్లులను సృష్టించారు!`;
      biResponse = `మీరు total గా ${fbStats.total_bills} bills generate చేసారు!`;

      // 7. Greeting Fallback
    } else if (msgLower.match(/\b(hi|hello|hey|నమస్తే|హలో|namaste|namasthe|namaskaram)\b/)) {
      enResponse = "Hello! How can I help you manage your Kirana store today?";
      teResponse = "నమస్తే! ఈరోజు మీ కిరాణా స్టోర్‌ను నిర్వహించడంలో నేను మీకు ఎలా సహాయపడగలను?";
      biResponse = "హలో! ఈరోజు మీ kirana store manage చేయడానికి నేను ఎలా help చేయగలను?";
    }

    const finalResponse = language === 'te' ? teResponse : language === 'bi' ? biResponse : enResponse;
    res.json({ success: true, data: finalResponse });
  }
};

exports.parseBilling = async (req, res, next) => {
  const fallbackParse = (text) => {
    let clean = text.toLowerCase();
    const stop = ["to the cart", "in the cart", "to cart", "in cart", "cart lo", "cart ki", "add chey", "add cheyyi", "veyi", "vey", "kottu", "please", "ivvu", "ivandi", "kavali", "add", "bill lo", "esey"];
    for (const p of stop) clean = clean.replace(new RegExp(`\\b${p}\\b`, 'gi'), ' ');

    const nums = { 'one': 1, 'oka': 1, 'okati': 1, 'two': 2, 'rendu': 2, 'three': 3, 'moodu': 3, 'four': 4, 'naalugu': 4, 'five': 5, 'aidu': 5, 'six': 6, 'aaru': 6, 'seven': 7, 'edu': 7, 'eight': 8, 'enimidi': 8, 'nine': 9, 'tommidi': 9, 'ten': 10, 'padi': 10 };
    Object.keys(nums).forEach(w => clean = clean.replace(new RegExp(`\\b${w}\\b`, 'gi'), nums[w].toString()));

    const qtyMatch = clean.match(/\b(\d+)\b/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    const units = ["add", "put", "give", "me", "want", "need", "packets", "packet", "kg", "kilos", "kilo", "liters", "liter", "grams", "gram", "pockets", "pocket", "lu", "kavalu", "kavali", "ivi"];
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
      model: 'llama3-8b-8192',
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

const fallbackParseExpense = (transcript) => {
  const numMatch = transcript.match(/\b(\d+)\b/);
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
    const prompt = `
      You are an expert AI parser for a shop owner's expense tracker.
      The user speaks a voice command to log an expense. It may be in English, Telugu, or Tanglish.
      Extract the "amount", "category", and "description".
      Categories must be one of: "Inventory", "Salary", "Rent", "Utilities", "Electricity Bill", "Transport", "Purchase Cost", "Marketing", "Maintenance", "Other".
      Common expense contexts: electricity bill, rent, transport, purchase cost, supplies, vendor payments.
      Output ONLY a valid JSON object with keys "amount" (number), "category" (string), and "description" (string).
      Command: "${transcript}"
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
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
