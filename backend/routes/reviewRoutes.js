const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getReviews, getReviewsByProperty, createReview, deleteReview } = require('../controllers/reviewController');

// Rate limit review submissions: 3 per IP per hour
const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { message: 'Too many reviews submitted. Please try again in an hour.' }
});

router.get('/', getReviews);
router.get('/:propertyId', getReviewsByProperty);
router.post('/', reviewLimiter, createReview);
router.delete('/:id', protect, authorize('manager'), deleteReview);

module.exports = router;
