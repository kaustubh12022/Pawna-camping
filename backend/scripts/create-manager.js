#!/usr/bin/env node
// ============================================================================
// CREATE THE FIRST MANAGER ACCOUNT
// ============================================================================
// Usage:
//   node backend/scripts/create-manager.js <email> <password> ["Full Name"]
//
// The password is validated with the same policy as the API, hashed by the
// User model's pre-save hook (bcrypt cost 12), and never written to disk or
// logged. Safe to re-run: it refuses to overwrite an existing account.
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { validatePassword } = require('../utils/validate');

const main = async () => {
    const [, , email, password, name] = process.argv;

    if (!email || !password) {
        console.error('Usage: node backend/scripts/create-manager.js <email> <password> ["Full Name"]');
        process.exit(1);
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        console.error('Please provide a valid email address.');
        process.exit(1);
    }

    const check = validatePassword(password, { email: normalizedEmail });
    if (!check.ok) {
        console.error(`Weak password: ${check.message}`);
        process.exit(1);
    }

    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not set. Add it to backend/.env first.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await User.findOne({ email: normalizedEmail }).select('_id');
    if (existing) {
        console.error('A user with that email already exists. No changes made.');
        await mongoose.disconnect();
        process.exit(1);
    }

    const user = await User.create({
        name: name || 'Manager',
        email: normalizedEmail,
        password, // hashed by the model pre-save hook
        role: 'manager'
    });

    console.log(`Manager created: ${user.email} (${user._id})`);
    console.log('Sign in at /manager/login. Never commit this password anywhere.');

    await mongoose.disconnect();
    process.exit(0);
};

main().catch(async (error) => {
    console.error('Failed:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
