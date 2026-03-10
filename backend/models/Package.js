const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    features: {
        type: [String],
        required: true
    },
    price: {
        type: String, // E.g., '₹1,200'
        required: true
    },
    priceValue: {
        type: Number, // Useful for sorting/calculations if needed later
        default: 0
    },
    maxCapacity: {
        type: Number,
        required: true,
        default: 10 // Very high limit or 0 for unlimited tents
    },
    image: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Package', packageSchema);
