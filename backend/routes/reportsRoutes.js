const express = require('express');
const router = express.Router();
const { getReportsData, getCustomReport } = require('../controllers/reportsController');
const protect = require('../middleware/auth');

router.use(protect);

router.get('/custom', getCustomReport);
router.get('/', getReportsData);

module.exports = router;
