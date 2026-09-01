const db = require('../config/db');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');

// GET /api/settings
const getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user profile
    const user = await db.query('SELECT id, name, email, role, avatar_url FROM users WHERE id = $1', [userId]);
    
    // Get shop settings
    const settings = await db.query('SELECT * FROM shop_settings WHERE user_id = $1', [userId]);
    
    let shopSettings = settings.rows[0];
    
    // If no settings exist for user, create default ones
    if (!shopSettings) {
      const newSettings = await db.query(
        'INSERT INTO shop_settings (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
      shopSettings = newSettings.rows[0];
    }

    res.json({
      success: true,
      data: {
        profile: user.rows[0],
        settings: shopSettings
      }
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings
const updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      shop_name, phone, gst_number, address, upi_id,
      language, currency, theme, date_format,
      notify_low_stock, notify_out_of_stock, notify_daily_sales,
      notify_large_bills, notify_new_customer, notify_monthly_reports
    } = req.body;

    const result = await db.query(`
      UPDATE shop_settings SET 
        shop_name = COALESCE($1, shop_name),
        phone = COALESCE($2, phone),
        gst_number = COALESCE($3, gst_number),
        address = COALESCE($4, address),
        upi_id = COALESCE($5, upi_id),
        language = COALESCE($6, language),
        currency = COALESCE($7, currency),
        theme = COALESCE($8, theme),
        date_format = COALESCE($9, date_format),
        notify_low_stock = COALESCE($10, notify_low_stock),
        notify_out_of_stock = COALESCE($11, notify_out_of_stock),
        notify_daily_sales = COALESCE($12, notify_daily_sales),
        notify_large_bills = COALESCE($13, notify_large_bills),
        notify_new_customer = COALESCE($14, notify_new_customer),
        notify_monthly_reports = COALESCE($15, notify_monthly_reports)
      WHERE user_id = $16
      RETURNING *
    `, [
      shop_name, phone, gst_number, address, upi_id,
      language, currency, theme, date_format,
      notify_low_stock, notify_out_of_stock, notify_daily_sales,
      notify_large_bills, notify_new_customer, notify_monthly_reports,
      userId
    ]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings/profile
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    const result = await db.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, avatar_url',
      [name, email, userId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/settings/avatar
const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    // A stable public_id per user means each new upload overwrites the
    // previous one on Cloudinary — no orphaned images to clean up, and no
    // separate delete step needed.
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'dukaanmitra/avatars',
          public_id: `user-${userId}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const avatarUrl = uploadResult.secure_url;

    const result = await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, name, email, role, avatar_url',
      [avatarUrl, userId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings/password
const updatePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const isValid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSettings, updateSettings, updateProfile, updatePassword, uploadAvatar };
