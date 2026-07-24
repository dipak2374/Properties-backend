const express = require('express');
const { sendMessage, listMessages } = require('../controllers/messageController');
const router = express.Router();

router.get('/', listMessages);
router.post('/', sendMessage);

module.exports = router;
