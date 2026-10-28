const Review = require('../models/Review');
const Property = require('../models/Property');
const { optionalObjectId, optionalString } = require('../utils/validate');

// ==========================================
// PUBLIC REVIEW PROJECTION
// ==========================================
// Reviewer email and phone are personal data and are never returned on a
// public endpoint. They remain stored for the manager's own follow-up.
const PUBLIC_REVIEW_FIELDS = '_id property reviewerName rating text isApproved createdAt updatedAt';

// GET /api/reviews?propertyId=xxx  — public
const getReviews = async (req, res) => {
    try {
        const filter = { isApproved: true };

        if (req.query.propertyId !== undefined) {
            const propertyId = optionalObjectId(req.query.propertyId);
            if (!propertyId) {
                return res.status(400).json({ message: 'Invalid property ID' });
            }
            filter.property = propertyId;
        }

        const reviews = await Review.find(filter)
            .select(PUBLIC_REVIEW_FIELDS)
            .populate('property', 'name type')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.json(reviews);
    } catch (err) {
        console.error('[ REVIEW ] list failed:', err.message);
        return res.status(500).json({ message: 'Unable to load reviews' });
    }
};

// GET /api/reviews/:propertyId  — public, by property
const getReviewsByProperty = async (req, res) => {
    try {
        const propertyId = optionalObjectId(req.params.propertyId);
        if (!propertyId) {
            return res.status(400).json({ message: 'Invalid property ID' });
        }

        const reviews = await Review.find({ property: propertyId, isApproved: true })
            .select(PUBLIC_REVIEW_FIELDS)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.json(reviews);
    } catch (err) {
        console.error('[ REVIEW ] by-property failed:', err.message);
        return res.status(500).json({ message: 'Unable to load reviews' });
    }
};

// POST /api/reviews  — public (rate-limited at server level)
const createReview = async (req, res) => {
    try {
        const { property, rating } = req.body;
        const reviewerName = optionalString(req.body.reviewerName, 80);
        const text = optionalString(req.body.text, 1000);
        const reviewerEmail = optionalString(req.body.reviewerEmail, 254);
        const reviewerPhone = optionalString(req.body.reviewerPhone, 20);

        if (!property || !reviewerName || !rating || !text) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (reviewerName.length < 2) {
            return res.status(400).json({ message: 'Reviewer name must be at least 2 characters' });
        }

        const numericRating = Number(rating);
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
        }

        if (text.length < 10) {
            return res.status(400).json({ message: 'Review text must be between 10 and 1000 characters' });
        }

        // Validate property exists (handle invalid ObjectIds gracefully)
        const propertyId = optionalObjectId(property);
        if (!propertyId) {
            return res.status(400).json({ message: 'Invalid property ID' });
        }

        const exists = await Property.findById(propertyId).select('_id').lean();
        if (!exists) return res.status(404).json({ message: 'Property not found' });

        const review = await Review.create({
            property: propertyId,
            reviewerName,
            rating: numericRating,
            text,
            reviewerEmail: reviewerEmail || undefined,
            reviewerPhone: reviewerPhone || undefined
        });

        // Return only the public projection — never echo contact details back.
        return res.status(201).json({
            _id: review._id,
            property: review.property,
            reviewerName: review.reviewerName,
            rating: review.rating,
            text: review.text,
            isApproved: review.isApproved,
            createdAt: review.createdAt
        });
    } catch (err) {
        console.error('[ REVIEW ] create failed:', err.message);
        return res.status(500).json({ message: 'Unable to submit the review' });
    }
};

// DELETE /api/reviews/:id  — manager only
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });
        
        // Recalculate if it was an approved review
        if (review.isApproved) {
            await Review.calculateAverageRating(review.property);
        }
        
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('[ REVIEW ] request failed:', err.message);
        return res.status(500).json({ message: 'Unable to process the review request' });
    }
};

// GET /api/reviews/pending  — manager only (unapproved reviews)
const getPendingReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ isApproved: false })
            .populate('property', 'name type')
            .sort({ createdAt: -1 })
            .lean();
        res.json(reviews);
    } catch (err) {
        console.error('[ REVIEW ] request failed:', err.message);
        return res.status(500).json({ message: 'Unable to process the review request' });
    }
};

// PATCH /api/reviews/:id/approve  — manager only
const approveReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            { isApproved: true },
            { new: true }
        ).populate('property', 'name type');

        if (!review) return res.status(404).json({ message: 'Review not found' });
        
        // Recalculate property average rating
        await Review.calculateAverageRating(review.property._id);

        res.json(review);
    } catch (err) {
        console.error('[ REVIEW ] request failed:', err.message);
        return res.status(500).json({ message: 'Unable to process the review request' });
    }
};

module.exports = { getReviews, getReviewsByProperty, createReview, deleteReview, getPendingReviews, approveReview };

