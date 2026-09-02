const express = require('express');
const router = express.Router();
const { createBill, getBills, getBillById, payCredit } = require('../controllers/billController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, getBills);
router.get('/:id', authenticate, getBillById);
router.post('/', authenticate, createBill);
router.patch('/:id/pay', authenticate, payCredit);

module.exports = router;
