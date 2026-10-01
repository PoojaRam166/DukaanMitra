const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

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
      'INSERT INTO shop_settings (user_id, shop_name, address) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING',
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

// POST /api/auth/forgotpassword
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email address is required' });

    const userRes = await db.query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with this email address' });
    }
    
    const user = userRes.rows[0];

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.query(
      'UPDATE users SET reset_otp = $1, reset_otp_expires = $2 WHERE email = $3',
      [otp, expires, user.email]
    );

    try {
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'DukaanMitra <onboarding@resend.dev>', // free tier requires onboarding domain
          to: user.email,
          subject: 'Password Reset OTP - DukaanMitra',
          html: `<p>Your DukaanMitra password reset OTP is <strong>${otp}</strong>. It expires in 15 minutes.</p>`,
        });
      } else {
        console.log(`\n=========================================`);
        console.log(`📧 [EMAIL GATEWAY SIMULATOR]`);
        console.log(`✉️ To: ${user.email}`);
        console.log(`📝 Message: Your DukaanMitra password reset OTP is ${otp}. It expires in 15 minutes.`);
        console.log(`=========================================\n`);
      }
    } catch (emailErr) {
      console.error("Resend API Error:", emailErr);
    }

    res.json({ 
      success: true, 
      message: 'OTP sent successfully to your registered email'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resetpassword
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    const userRes = await db.query(
      'SELECT id, reset_otp, reset_otp_expires FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
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
      'UPDATE users SET password_hash = $1, reset_otp = NULL, reset_otp_expires = NULL WHERE id = $2',
      [password_hash, user.id]
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
