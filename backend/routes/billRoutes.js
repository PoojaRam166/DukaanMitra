const express = require('express');
const router = express.Router();
const { createBill, getBills, getBillById } = require('../controllers/billController');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, getBills);
router.get('/:id', authenticate, getBillById);
router.post('/', authenticate, createBill);

module.exports = router;
