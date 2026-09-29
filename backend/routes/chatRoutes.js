const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/auth');

router.post('/', authenticate, chatController.sendMessage);

module.exports = router;
