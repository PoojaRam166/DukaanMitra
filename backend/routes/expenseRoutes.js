const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, getExpenses);
router.post('/', authenticate, createExpense);
router.put('/:id', authenticate, updateExpense);
router.delete('/:id', authenticate, deleteExpense);

module.exports = router;
