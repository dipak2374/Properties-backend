const express = require('express');
const { getProfile, listUsers, updateUserProfilePicture } = require('../controllers/userController');
const router = express.Router();

router.get('/', listUsers);
router.get('/me', getProfile);
router.patch('/:id/profile-picture', updateUserProfilePicture);

module.exports = router;
