const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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
    const { name, phone, email, password, shopName, address } = req.body;
    if (!name || !phone || !password || !shopName) {
      return res.status(400).json({ success: false, message: 'Name, phone, password, and shop name are required' });
    }

    const existing = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (validPassword) {
        // Seamlessly log them in instead of throwing a "already registered" error
        const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const { password_hash, reset_otp, reset_otp_expires, ...userWithoutHash } = user;
        res.cookie('token', token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.status(200).json({ success: true, message: 'Account found. Logged in successfully.', data: { user: userWithoutHash } });
      } else {
        return res.status(401).json({ success: false, message: 'This mobile number is already registered. Please use your correct password to log in.' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, phone, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, phone, email, role, avatar_url, created_at',
      [name, phone, email || null, password_hash]
    );
    const user = result.rows[0];

    // Create default shop settings for the new user
    await db.query(
      'INSERT INTO shop_settings (user_id, shop_name, address) VALUES ($1, $2, $3)',
      [user.id, shopName, address || null]
    );

    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.status(201).json({ success: true, message: 'User registered successfully', data: { user } });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      return res.status(409).json({ success: false, message: 'This email is already in use by another account' });
    }
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

// POST /api/auth/google
const googleAuth = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    
    let userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;
    
    if (userRes.rows.length === 0) {
      // Create user if they don't exist
      const dummyPhone = 'G-' + Math.random().toString().slice(2, 12);
      const password_hash = await bcrypt.hash(Math.random().toString(36), 10);
      
      const insertRes = await db.query(
        'INSERT INTO users (name, phone, email, password_hash, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, phone, email, role, avatar_url, created_at',
        [name, dummyPhone, email, password_hash, picture]
      );
      user = insertRes.rows[0];
      
      await db.query(
        'INSERT INTO shop_settings (user_id, shop_name) VALUES ($1, $2)',
        [user.id, `${name}'s Shop`]
      );
    } else {
      user = userRes.rows[0];
    }
    
    const jwtToken = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, reset_otp, reset_otp_expires, ...userWithoutHash } = user;
    
    res.cookie('token', jwtToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ success: true, message: 'Google Login successful', data: { user: userWithoutHash } });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ success: false, message: 'Invalid Google token' });
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

module.exports = { register, login, googleAuth, getMe, logout };
