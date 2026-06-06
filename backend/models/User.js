const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// USER SCHEMA DEFINITION
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password']
    },
    role: {
        type: String,
        enum: ['manager', 'owner'],
        default: 'manager',
        index: true // Fast filtering by role
    },
    // PHASE 2: Property ownership mapping
    // For owners: list of properties they own/manage
    // For managers: empty array (managers see all properties)
    properties: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property'
    }],
    // Optional phone for contact
    phone: {
        type: String,
        default: ''
    },
    // PHASE 3: Notification System
    lastSeenBookingAt: {
        type: Date,
        default: Date.now
    },
    pushSubscription: {
        type: Object, // Stores VAPID subscription object (endpoint, keys)
        default: null
    }
}, {
    timestamps: true // THIS AUTOMATICALLY CREATES createdAt AND updatedAt FIELDS
});

// HASH PASSWORD BEFORE SAVING THE USER TO THE DATABASE
// Using promise-based async style (no `next` param) — correct for Mongoose 6+
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return; // Skip hashing if password not changed
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// MATCH ENTERED PASSWORD TO HASHED PASSWORD IN DATABASE
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
