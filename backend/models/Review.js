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
        default: false  // Requires manager approval before being publicly visible
    }
}, { timestamps: true });

reviewSchema.statics.calculateAverageRating = async function(propertyId) {
    const stats = await this.aggregate([
        {
            $match: { property: propertyId, isApproved: true }
        },
        {
            $group: {
                _id: '$property',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);

    try {
        if (stats.length > 0) {
            await mongoose.model('Property').findByIdAndUpdate(propertyId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                reviewCount: stats[0].reviewCount
            });
        } else {
            await mongoose.model('Property').findByIdAndUpdate(propertyId, {
                averageRating: 0,
                reviewCount: 0
            });
        }
    } catch (err) {
        console.error('Error calculating average rating', err);
    }
};

module.exports = mongoose.model('Review', reviewSchema);
