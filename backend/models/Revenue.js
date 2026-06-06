const mongoose = require('mongoose');

// ==========================================
// REVENUE SCHEMA DEFINITION
// ==========================================
// Phase 3: Revenue model for manually tracking commission income per property.
// Manager enters revenue entries; these power financial analytics.
// ==========================================

const revenueSchema = new mongoose.Schema({

    // ---- PROPERTY REFERENCE ----
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: [true, 'Property is required for a revenue entry']
    },

    // ---- BOOKING REFERENCE (optional) ----
    // Links this revenue entry to a specific booking if applicable.
    // null = manual/offline income not tied to a tracked booking
    bookingRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },

    // ---- FINANCIAL DATA ----
    amount: {
        type: Number,
        required: [true, 'Revenue amount is required'],
        min: [0, 'Amount cannot be negative']
        // Total revenue received from the property for this entry
    },
    commission: {
        type: Number,
        required: [true, 'Commission amount is required'],
        min: [0, 'Commission cannot be negative']
        // Manager's cut from this revenue entry
    },

    // ---- DATE ----
    date: {
        type: Date,
        required: [true, 'Date is required'],
        index: true  // Fast date-range queries for analytics
    },


    // ---- NOTES ----
    notes: {
        type: String,
        default: '',
        trim: true
        // Any additional context (e.g., "Advance for July booking", "Weekend package")
    },

    // ---- AUDIT ----
    // Tracks which manager entered this revenue record
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'addedBy (manager user ID) is required']
    }

}, {
    timestamps: true
});

// ==========================================
// COMPOUND INDEXES FOR ANALYTICS QUERIES
// ==========================================

// Fast lookup: revenue for a specific property within a date range
revenueSchema.index({ property: 1, date: -1 });

// Fast lookup: all revenue within a date range (global analytics)
revenueSchema.index({ date: -1 });


module.exports = mongoose.model('Revenue', revenueSchema);
