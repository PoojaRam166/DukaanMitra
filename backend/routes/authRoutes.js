const express = require('express');
const router = express.Router();
const { register, login, googleAuth, getMe, logout } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
