const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '..', 'uploads', 'property-images');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadRoot,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype?.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }

  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
