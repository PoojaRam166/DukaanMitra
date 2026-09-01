const db = require('../config/db');
const { getPrefs, createNotification } = require('../utils/notify');

// GET /api/products?search=&category=
const getProducts = async (req, res, next) => {
  try {
    const { search = '', category = '', stock = '' } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR sku ILIKE $${params.length})`;
    }
    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (stock && stock !== 'All') {
      if (stock === 'out') {
        query += ` AND stock = 0`;
      } else if (stock === 'in') {
        query += ` AND stock > min_stock`;
      } else if (stock === 'low') {
        query += ` AND stock > 0 AND stock <= min_stock`;
      } else if (stock === 'critical') {
        query += ` AND stock > 0 AND stock <= (min_stock / 2)`;
      } else if (stock === 'attention') {
        // Used by the app-wide low-stock banner in the top bar — covers
        // both out-of-stock (0) and low-stock items in one call, most
        // urgent (lowest stock) first.
        query += ` AND stock <= min_stock`;
      }
    }
    query += stock === 'attention' ? ' ORDER BY stock ASC' : ' ORDER BY created_at DESC';

    // Compute stats for all products matching search/category (ignoring stock filter)
    let statsQuery = 'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE stock > min_stock) as in_stock, COUNT(*) FILTER (WHERE stock > 0 AND stock <= min_stock) as low_stock, COUNT(*) FILTER (WHERE stock = 0) as out_of_stock FROM products WHERE 1=1';
    if (search) statsQuery += ` AND (name ILIKE $1 OR sku ILIKE $1)`;
    if (category && category !== 'All') statsQuery += ` AND category = $${search ? 2 : 1}`;
    
    const statsResult = await db.query(statsQuery, params.slice(0, search && category && category !== 'All' ? 2 : (search || category && category !== 'All' ? 1 : 0)));

    const result = await db.query(query, params);
    // Compute stock status dynamically
    const products = result.rows.map(p => ({
      ...p,
      status: p.stock === 0 ? 'out' : p.stock <= p.min_stock / 2 ? 'critical' : p.stock < p.min_stock ? 'low' : 'in'
    }));

    const stats = {
      total: parseInt(statsResult.rows[0].total) || 0,
      inStock: parseInt(statsResult.rows[0].in_stock) || 0,
      low: parseInt(statsResult.rows[0].low_stock) || 0,
      out: parseInt(statsResult.rows[0].out_of_stock) || 0,
    };

    res.json({ success: true, data: products, stats });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
const getProductById = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, category, buy_price, sell_price, stock, min_stock, unit } = req.body;
    if (!name || sell_price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and selling price are required' });
    }
    if (stock < 0) return res.status(400).json({ success: false, message: 'Stock cannot be negative' });

    const result = await db.query(
      'INSERT INTO products (name, sku, category, buy_price, sell_price, stock, min_stock, unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, sku || null, category || null, buy_price || 0, sell_price, stock || 0, min_stock || 0, unit || 'piece']
    );
    res.status(201).json({ success: true, message: 'Product created', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'SKU already exists' });
    next(err);
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const { name, sku, category, buy_price, sell_price, stock, min_stock, unit } = req.body;
    const result = await db.query(
      'UPDATE products SET name=$1, sku=$2, category=$3, buy_price=$4, sell_price=$5, stock=$6, min_stock=$7, unit=$8 WHERE id=$9 RETURNING *',
      [name, sku || null, category || null, buy_price || 0, sell_price, stock || 0, min_stock || 0, unit || 'piece', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });

    const p = result.rows[0];
    try {
      const prefs = await getPrefs(req.user.id);
      if (p.stock <= 0 && prefs.notify_out_of_stock) {
        await createNotification({
          title: `${p.name} is out of stock`,
          description: `${p.name} is currently out of stock. Restock it to keep taking orders.`,
          priority: 'critical',
          icon: 'alert',
          dedupeWithinHours: 24,
        });
      } else if (p.stock > 0 && p.stock <= p.min_stock && prefs.notify_low_stock) {
        await createNotification({
          title: `${p.name} is running low`,
          description: `Only ${p.stock} ${p.stock === 1 ? 'unit' : 'units'} left (reorder level: ${p.min_stock}).`,
          priority: 'high',
          icon: 'warning',
          dedupeWithinHours: 24,
        });
      }
    } catch (notifyErr) {
      console.error('Notification generation failed:', notifyErr.message);
    }

    res.json({ success: true, message: 'Product updated', data: p });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/categories
const getCategories = async (req, res, next) => {
  try {
    const result = await db.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
    res.json({ success: true, data: result.rows.map(r => r.category) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/products/:id/restock — increments stock by a given quantity (used by Insights restock suggestions)
const restockProduct = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Restock quantity must be a positive number' });
    }

    const result = await db.query(
      'UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING *',
      [qty, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });

    res.json({ success: true, message: `Added ${qty} units of stock`, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getCategories, restockProduct };
