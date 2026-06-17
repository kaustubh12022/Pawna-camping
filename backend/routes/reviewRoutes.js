const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getReviews, getReviewsByProperty, createReview, deleteReview, getPendingReviews, approveReview } = require('../controllers/reviewController');

// Rate limit review submissions: 3 per IP per hour
const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { message: 'Too many reviews submitted. Please try again in an hour.' }
});

// PUBLIC ROUTES
router.get('/', getReviews);
router.post('/', reviewLimiter, createReview);

// MANAGER-ONLY ROUTES (must come before /:propertyId to avoid route conflict)
router.get('/pending', protect, authorize('manager'), getPendingReviews);
router.patch('/:id/approve', protect, authorize('manager'), approveReview);
router.delete('/:id', protect, authorize('manager'), deleteReview);

// PUBLIC: Get reviews by property (must be last — `:propertyId` is a catch-all param)
router.get('/:propertyId', getReviewsByProperty);

module.exports = router;

