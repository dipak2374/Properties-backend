const express = require('express');
const upload = require('../middleware/uploadProperty');
const { uploadPropertyImage } = require('../controllers/uploadController');

const router = express.Router();

router.post('/property-image', upload.single('image'), uploadPropertyImage);

module.exports = router;
