const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true
    },
    reviewerName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    reviewerEmail: {
        type: String,
        trim: true
    },
    reviewerPhone: {
        type: String,
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    isApproved: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
