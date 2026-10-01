const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const authenticate = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user actually still exists in DB (protects against deleted accounts / wiped DBs)
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [decoded.id]);
    if (userCheck.rows.length === 0) {
      res.clearCookie('token');
      return res.status(401).json({ success: false, message: 'User account no longer exists. Please log in again.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
