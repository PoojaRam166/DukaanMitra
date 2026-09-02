const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Frontend and backend deployed on different domains (e.g. Vercel +
// Render) need sameSite: 'none' for the browser to send the cookie on
// cross-site fetch requests — which in turn requires secure: true (HTTPS).
// Locally (http://localhost) both are on the same site, so 'lax' + no
// secure flag is correct there.
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, phone, and password are required' });
    }

    const existing = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Phone number already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, phone, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, email, role, avatar_url, created_at',
      [name, phone, email || null, password_hash]
    );
    const user = result.rows[0];

    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.status(201).json({ success: true, message: 'User registered successfully', data: { user } });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid phone or password' });
    }

    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, reset_otp, reset_otp_expires, ...userWithoutHash } = user;
    res.cookie('token', token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ success: true, message: 'Login successful', data: { user: userWithoutHash } });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgotpassword
const forgotPassword = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    const userRes = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with this mobile number' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.query(
      'UPDATE users SET reset_otp = $1, reset_otp_expires = $2 WHERE phone = $3',
      [otp, expires, phone]
    );

    // In a real app, integrate an SMS gateway here (e.g. Twilio). 
    // For this portfolio demo, we return the OTP to the client to simulate SMS reception.
    res.json({ 
      success: true, 
      message: 'OTP sent successfully (Simulated)', 
      demo_otp: otp 
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resetpassword
const resetPassword = async (req, res, next) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Phone, OTP, and new password are required' });
    }

    const userRes = await db.query(
      'SELECT id, reset_otp, reset_otp_expires FROM users WHERE phone = $1',
      [phone]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRes.rows[0];
    if (user.reset_otp !== otp || new Date() > new Date(user.reset_otp_expires)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_otp = NULL, reset_otp_expires = NULL WHERE phone = $2',
      [password_hash, phone]
    );

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name, phone, email, role, avatar_url, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { register, login, forgotPassword, resetPassword, getMe, logout };
