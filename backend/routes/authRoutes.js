const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, resetPassword, getMe, logout } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
