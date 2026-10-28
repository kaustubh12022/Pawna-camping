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
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        select: false // Never returned by default — must be requested explicitly
    },
    role: {
        type: String,
        enum: ['manager', 'owner'],
        default: 'manager',
        index: true // Fast filtering by role
    },
    // SECURITY: Passwords are NEVER stored in plaintext.
    // The only persisted secret is the bcrypt hash in `password` above.
    // When a manager creates or resets an owner account the server generates a
    // random one-time temporary password, stores ONLY its bcrypt hash, and
    // returns the plaintext to the manager exactly once (in that response).
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
    // Flagged when the account still runs on a manager-issued password.
    // Set to true on owner create / password reset, cleared once the owner
    // changes the password themselves (see authController.updatePassword).
    mustChangePassword: {
        type: Boolean,
        default: false
    },
    // PHASE 3: Notification System
    lastSeenBookingAt: {
        type: Date,
        default: Date.now
    },
    pushSubscription: {
        type: Object, // Stores VAPID subscription object (endpoint, keys)
        default: null
    },

    // ==========================================
    // SESSION INVALIDATION
    // ==========================================
    // Every JWT embeds the tokenVersion it was issued against. `protect`
    // rejects any token whose version no longer matches this field, so
    // changing a password (or "log out everywhere") instantly kills every
    // previously issued token for that account.
    tokenVersion: {
        type: Number,
        default: 0,
        select: false
    },

    // ==========================================
    // ACCOUNT LOCKOUT (per-account, not per-IP)
    // ==========================================
    // IP-based rate limiting alone lets an attacker rotate IPs. These fields
    // add a per-account brake that is independent of the source address.
    failedLoginAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    lockUntil: {
        type: Date,
        default: null,
        select: false
    },
    lastLoginAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // THIS AUTOMATICALLY CREATES createdAt AND updatedAt FIELDS
});

// HASH PASSWORD BEFORE SAVING THE USER TO THE DATABASE
// Using promise-based async style (no `next` param) — correct for Mongoose 6+.
// Cost factor 12 (~250-400ms) is the current OWASP-recommended floor for
// bcrypt and is only paid on login/password change, never per request.
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return; // Skip hashing if password not changed
    }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// MATCH ENTERED PASSWORD TO HASHED PASSWORD IN DATABASE
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (typeof enteredPassword !== 'string' || !this.password) return false;
    return bcrypt.compare(enteredPassword, this.password);
};

// TRUE WHEN THE ACCOUNT IS TEMPORARILY LOCKED OUT
userSchema.methods.isLocked = function () {
    return Boolean(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

// ==========================================
// RESPONSE SANITISATION
// ==========================================
// Mongoose keeps fields that exist in the database but are no longer declared
// in the schema (verified against mongoose 9: `User.hydrate({ plainPassword })`
// still exposes the key through toObject/toJSON). The legacy `plainPassword`
// field therefore survives in old documents even after it was removed from
// this schema, and would be serialised straight to the client.
//
// This transform is the last line of defence: no route can leak a password
// hash, the legacy plaintext field, or authentication bookkeeping, even if a
// future controller forgets an explicit projection.
const stripSensitiveUserFields = (doc, ret) => {
    delete ret.password;
    delete ret.plainPassword;
    delete ret.tokenVersion;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.__v;
    return ret;
};

userSchema.set('toJSON', { transform: stripSensitiveUserFields, virtuals: false });
userSchema.set('toObject', { transform: stripSensitiveUserFields, virtuals: false });

module.exports = mongoose.model('User', userSchema);
