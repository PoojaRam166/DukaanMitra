const express = require('express');
const router = express.Router();
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController');
const protect = require('../middleware/auth');

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.get('/vapid-public-key', require('../controllers/notificationController').getVapidPublicKey);
router.post('/subscribe', require('../controllers/notificationController').subscribePush);

module.exports = router;
