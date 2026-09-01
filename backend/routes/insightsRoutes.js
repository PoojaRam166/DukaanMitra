const express = require('express');
const router = express.Router();
const { getInsightsData } = require('../controllers/insightsController');
const protect = require('../middleware/auth');

router.use(protect);

router.get('/', getInsightsData);

module.exports = router;
