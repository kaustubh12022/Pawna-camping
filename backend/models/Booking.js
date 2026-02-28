const mongoose = require('mongoose');

// NEW BOOKING SCHEMA
const bookingSchema = new mongoose.Schema({
    packageType: {
        type: String,
        enum: ['Normal Tent', 'Cottage', 'Luxury Cottage'],
        required: [true, 'Please select a package type']
    },
    checkIn: {
        type: Date,
        required: [true, 'Check-in date is required']
    },
    checkOut: {
        type: Date,
        required: [true, 'Check-out date is required']
    },
    nights: {
        type: Number,
        required: true
    },
    guests: {
        type: Number,
        required: [true, 'Number of guests is required'],
        min: [1, 'At least 1 guest is required']
    },
    vegGuests: {
        type: Number,
        default: 0
    },
    nonVegGuests: {
        type: Number,
        default: 0
    },
    foodPreference: {
        type: String,
        enum: ['Veg', 'Non-Veg'],
        required: false // Relaxed for legacy compatibility
    },
    customerName: {
        type: String,
        required: [true, 'Customer name is required']
    },
    customerPhone: {
        type: String,
        required: [true, 'Customer phone is required']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // NOT REQUIRED SO PUBLIC WEBSITE CAN CREATE ANONYMOUS BOOKING REQUESTS
    }
}, {
    timestamps: true
});

// PRE-VALIDATE HOOK FOR DATE LOGIC AND NIGHTS CALCULATION
bookingSchema.pre('validate', function () {
    if (this.checkIn && this.checkOut) {
        // ENSURE CHECK-OUT IS AFTER CHECK-IN
        if (this.checkOut <= this.checkIn) {
            this.invalidate('checkOut', 'Check-out date must be strictly after the check-in date');
        } else {
            // AUTOMATICALLY CALCULATE NIGHTS
            const diffTime = Math.abs(this.checkOut - this.checkIn);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            this.nights = diffDays;
        }
    }
});

module.exports = mongoose.model('Booking', bookingSchema);
