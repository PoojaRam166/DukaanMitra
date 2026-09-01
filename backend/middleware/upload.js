const multer = require('multer');

// Files are held in memory only, then streamed straight to Cloudinary in
// the controller — nothing is written to local disk. This matters because
// most hosts (Render, Railway, Vercel) have an ephemeral filesystem, so a
// disk-based upload would vanish on the next restart/redeploy.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
  }
};

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB, matches "JPG or PNG, max 2MB" shown in UI
});

module.exports = uploadAvatar;
