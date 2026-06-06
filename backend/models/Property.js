const mongoose = require('mongoose');

// ==========================================
// PROPERTY SCHEMA DEFINITION
// ==========================================
const propertySchema = new mongoose.Schema({

    // ---- CORE IDENTITY ----
    name: {
        type: String,
        required: [true, 'Property name is required'],
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true   // Fast lookup by slug (public detail pages)
    },
    type: {
        type: String,
        enum: ['campsite', 'villa'],
        required: [true, 'Property type is required (campsite or villa)'],
        index: true   // Fast filtering: show only campsites or only villas
    },

    // ---- DESCRIPTIONS ----
    shortDescription: {
        type: String,
        default: '',
        trim: true
        // Used on listing cards (2-3 lines max)
    },
    description: {
        type: String,
        default: '',
        trim: true
        // Full rich description used on detail pages
    },

    // ---- LOCATION ----
    googleMapsLink: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        default: '',
        trim: true
        // Full address shown on detail page
    },

    // ---- MEDIA ----
    coverImage: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' }
    },
    images: [{
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        description: { type: String, default: '' },
        order: { type: Number, default: 0 }
    }],

    // ---- AMENITIES ----
    amenities: {
        type: [String],
        default: []
        // e.g., ['WiFi', 'BBQ', 'Campfire', 'Lake View', 'Private Pool']
    },

    // ---- PRICING ----
    pricing: {
        basePrice: {
            type: Number,
            default: 0
            // Numeric value for calculations and sorting
        },
        discountPrice: {
            type: Number,
            default: null
            // Sale price — null means no active discount
        },
        discountPercent: {
            type: Number,
            default: null
            // e.g., 20 means 20% off. Stored manually or computed.
        },
        priceDisplay: {
            type: String,
            default: ''
            // Human-readable: e.g., "₹2,500" or "₹4,000"
        },
        pricePer: {
            type: String,
            default: 'night'
            // e.g., "night", "person", "tent"
        }
    },

    // ---- CAPACITY ----
    maxGuests: {
        type: Number,
        default: 10
    },

    // ---- HOUSE RULES / TIMINGS ----
    checkInTime: {
        type: String,
        default: '2:00 PM'
    },
    checkOutTime: {
        type: String,
        default: '11:00 AM'
    },
    rules: {
        type: [String],
        default: []
        // e.g., ['No loud music after 10 PM', 'Pets not allowed']
    },

    // ---- CONTACT ----
    whatsappNumber: {
        type: String,
        default: ''
        // Per-property WhatsApp number (overrides global if set)
    },

    // ---- OWNERSHIP ----
    // NOTE: This field is here and optional for now.
    // It will be properly enforced and used in Phase 2 (User model expansion).
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
        // null means unassigned — manager manages it directly
    },

    // ---- STATUS ----
    isActive: {
        type: Boolean,
        default: true,
        index: true   // Fast filtering: show only active properties publicly
    },

    // ---- METADATA ----
    // Tracks which manager created the property
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }

}, {
    timestamps: true
});

// ==========================================
// COMPOUND INDEX: type + isActive
// Used by the public listing page to get "all active campsites" or "all active villas"
// ==========================================
propertySchema.index({ type: 1, isActive: 1 });

// ==========================================
// TEXT INDEX: for keyword search on name, location, shortDescription
// Supports the search bar on the listing page
// ==========================================
propertySchema.index(
    { name: 'text', location: 'text', shortDescription: 'text' },
    { name: 'property_text_search' }
);

module.exports = mongoose.model('Property', propertySchema);
