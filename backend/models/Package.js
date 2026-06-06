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
        type: Number, // Useful for sorting/calculations
        default: 0
    },
    maxCapacity: {
        type: Number,
        required: true,
        default: 10
    },
    image: {
        type: String,
        required: true
    },
    // PHASE 2: Property linkage (optional — null for legacy packages)
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        default: null,
        index: true   // Fast lookup of packages by property
        // null = legacy package (belongs to the original single campsite)
    }
}, {
    timestamps: true
});

// Compound index: get packages for a specific property sorted by price
packageSchema.index({ property: 1, priceValue: 1 });

module.exports = mongoose.model('Package', packageSchema);

