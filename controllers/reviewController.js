const Review = require('../models/Review');

exports.listReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name profilePicture')
      .populate('property', 'title')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reviews });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to list reviews', error: error.message });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, comment, property, user } = req.body || {};

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
    }

    if (!property || !user) {
      return res.status(400).json({ message: 'Property ID and User ID are required' });
    }

    const review = await Review.create({ rating, comment: comment?.trim(), property, user });
    
    const populatedReview = await Review.findById(review._id)
      .populate('user', 'name profilePicture')
      .populate('property', 'title')
      .lean();

    return res.status(201).json({ review: populatedReview, message: 'Review added successfully' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unable to add review', error: error.message });
  }
};
