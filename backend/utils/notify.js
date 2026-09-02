const db = require('../config/db');

// Human-friendly "x minutes/hours ago" isn't computed here — the frontend
// just displays whatever string is in `time`. We store a relative label at
// creation time since this app has no background job to keep it fresh.
function timeLabel() {
  return 'Just now';
}

/**
 * Look up this shop's notification preferences (shop_settings.notify_*).
 * Falls back to all-on if no settings row exists yet for the user.
 */
async function getPrefs(userId) {
  const result = await db.query('SELECT * FROM shop_settings WHERE user_id = $1', [userId]);
  return result.rows[0] || {
    notify_low_stock: true,
    notify_out_of_stock: true,
    notify_daily_sales: true,
    notify_large_bills: false,
    notify_new_customer: false,
    notify_monthly_reports: true,
  };
}

/**
 * Insert a notification row.
 *  - `dedupeWithinHours`: skip insert if an *unread* notification with the
 *    same title already exists within that time window (e.g. don't spam a
 *    "X is out of stock" notification on every single sale).
 *  - `dedupeExact`: skip insert if a notification with this exact title
 *    already exists at all (read or unread) — used for once-per-day /
 *    once-per-month summaries where the title embeds the date, so it
 *    should never be posted twice no matter how many times it's checked.
 */
async function createNotification({ title, description, priority = 'normal', icon = 'info', dedupeWithinHours = null, dedupeExact = false, user_id }) {
  try {
    if (dedupeExact) {
      const existing = await db.query('SELECT id FROM notifications WHERE title = $1 AND user_id = $2 LIMIT 1', [title, user_id]);
      if (existing.rows.length > 0) return null;
    } else if (dedupeWithinHours) {
      const existing = await db.query(
        `SELECT id FROM notifications
         WHERE title = $1 AND user_id = $2 AND read = false AND created_at >= NOW() - ($3 || ' hours')::interval
         LIMIT 1`,
        [title, user_id, String(dedupeWithinHours)]
      );
      if (existing.rows.length > 0) return null;
    }
    const result = await db.query(
      'INSERT INTO notifications (user_id, title, description, time, priority, icon) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [user_id, title, description, timeLabel(), priority, icon]
    );
    
    // trigger web push
    try {
      const webpush = require('web-push');
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          'mailto:admin@example.com',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        const subs = await db.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [user_id]);
        const payload = JSON.stringify({ title, body: description });
        for (const sub of subs.rows) {
          webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, payload).catch(err => {
            if (err.statusCode === 410 || err.statusCode === 404) {
               db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]).catch(()=>{});
            }
          });
        }
      }
    } catch(e) {}

    return result.rows[0];
  } catch (err) {
    // Notifications are a nice-to-have — never let a failure here break
    // the calling request (bill creation, product save, etc.)
    console.error('createNotification failed:', err.message);
    return null;
  }
}

module.exports = { getPrefs, createNotification };
