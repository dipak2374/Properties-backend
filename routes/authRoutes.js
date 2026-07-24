const express = require('express');
const { login, register, startGoogleOAuth, googleCallback, startFacebookOAuth, facebookCallback, startAppleOAuth, appleCallback } = require('../controllers/authController');
const upload = require('../middleware/upload');
const router = express.Router();

router.post('/login', login);
router.post('/register', upload.single('profilePicture'), register);
router.get('/google/login', startGoogleOAuth);
router.get('/google/callback', googleCallback);
router.get('/facebook/login', startFacebookOAuth);
router.get('/facebook/callback', facebookCallback);
router.get('/apple/login', startAppleOAuth);
router.get('/apple/callback', appleCallback);
router.post('/apple/callback', appleCallback);

module.exports = router;
