const express = require('express');
const { addReview, listReviews } = require('../controllers/reviewController');
const router = express.Router();

router.get('/', listReviews);
router.post('/', addReview);

module.exports = router;
