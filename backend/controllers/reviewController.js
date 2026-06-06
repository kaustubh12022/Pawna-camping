const Review = require('../models/Review');
const Property = require('../models/Property');

// GET /api/reviews?propertyId=xxx  — public
const getReviews = async (req, res) => {
    try {
        const filter = { isApproved: true };
        if (req.query.propertyId) filter.property = req.query.propertyId;

        const reviews = await Review.find(filter)
            .populate('property', 'name type')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/reviews/:propertyId  — public, by property
const getReviewsByProperty = async (req, res) => {
    try {
        const reviews = await Review.find({ property: req.params.propertyId, isApproved: true })
            .sort({ createdAt: -1 })
            .lean();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/reviews  — public (rate-limited at server level)
const createReview = async (req, res) => {
    try {
        const { property, reviewerName, rating, text, reviewerEmail, reviewerPhone } = req.body;
        if (!property || !reviewerName || !rating || !text) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        // Validate property exists
        const exists = await Property.findById(property).select('_id').lean();
        if (!exists) return res.status(404).json({ message: 'Property not found' });

        const review = await Review.create({ property, reviewerName, rating, text, reviewerEmail, reviewerPhone });
        res.status(201).json(review);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/reviews/:id  — manager only
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getReviews, getReviewsByProperty, createReview, deleteReview };
