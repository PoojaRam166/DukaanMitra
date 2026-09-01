const express = require('express');
const router = express.Router();
const { getSalesData } = require('../controllers/salesController');
const protect = require('../middleware/auth');

router.use(protect);

router.get('/', getSalesData);

module.exports = router;
