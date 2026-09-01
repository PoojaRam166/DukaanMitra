const db = require('../config/db');

// GET /api/expenses
const getExpenses = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses
const createExpense = async (req, res, next) => {
  try {
    const { date, category, description, amount } = req.body;
    if (!category || !amount) {
      return res.status(400).json({ success: false, message: 'Category and amount are required' });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const result = await db.query(
      'INSERT INTO expenses (date, category, description, amount) VALUES ($1,$2,$3,$4) RETURNING *',
      [date || new Date().toISOString().split('T')[0], category, description || '', parseFloat(amount)]
    );
    res.status(201).json({ success: true, message: 'Expense added', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/expenses/:id
const updateExpense = async (req, res, next) => {
  try {
    const { date, category, description, amount } = req.body;
    const result = await db.query(
      'UPDATE expenses SET date=$1, category=$2, description=$3, amount=$4 WHERE id=$5 RETURNING *',
      [date, category, description, parseFloat(amount), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense updated', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense };
