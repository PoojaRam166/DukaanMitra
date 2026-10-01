const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/auth');

router.post('/', authenticate, chatController.sendMessage);
router.post('/parse-billing', authenticate, chatController.parseBilling);
router.post('/parse-expense', authenticate, chatController.parseExpenseVoice);

module.exports = router;
