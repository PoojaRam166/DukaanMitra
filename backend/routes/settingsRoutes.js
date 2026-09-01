const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, updateProfile, updatePassword, uploadAvatar } = require('../controllers/settingsController');
const protect = require('../middleware/auth');
const uploadAvatarMiddleware = require('../middleware/upload');

router.use(protect);

router.get('/', getSettings);
router.put('/', updateSettings);
router.put('/profile', updateProfile);
router.put('/password', updatePassword);
router.post('/avatar', uploadAvatarMiddleware.single('avatar'), uploadAvatar);

module.exports = router;
