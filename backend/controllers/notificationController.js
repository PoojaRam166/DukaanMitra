const db = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET read = true WHERE read = false AND user_id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/notifications/subscribe
const subscribePush = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }
    // Upsert subscription (using endpoint as unique key, handled by ON CONFLICT if endpoint is UNIQUE, or we do a simple query)
    const existing = await db.query('SELECT * FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, req.user.id]);
    if (existing.rows.length === 0) {
      await db.query('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)', [req.user.id, endpoint, keys.p256dh, keys.auth]);
    } else {
      await db.query('UPDATE push_subscriptions SET p256dh = $1, auth = $2 WHERE endpoint = $3 AND user_id = $4', [keys.p256dh, keys.auth, endpoint, req.user.id]);
    }
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications/vapid-public-key
const getVapidPublicKey = (req, res) => {
  res.json({
    success: true,
    data: process.env.VAPID_PUBLIC_KEY || ''
  });
};

module.exports = { getNotifications, markRead, markAllRead, subscribePush, getVapidPublicKey };
