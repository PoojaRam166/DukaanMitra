const db = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
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
    await db.query('UPDATE notifications SET read = true WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET read = true WHERE read = false');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead, markAllRead };
