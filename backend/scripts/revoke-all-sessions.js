#!/usr/bin/env node
// ============================================================================
// REVOKE EVERY SESSION
// ============================================================================
// Usage:
//   node backend/scripts/revoke-all-sessions.js [email]
//
// Increments tokenVersion on every user (or on a single email). Every JWT that
// was issued before this command becomes invalid immediately, without changing
// anyone's password.
//
// Run this after any suspected token exposure — for example if a token was
// pasted into a chat, a log or a screenshot. Safe to re-run.
// ============================================================================

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const main = async () => {
    const email = process.argv[2];

    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not set. Add it to backend/.env first.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const filter = email ? { email: email.trim().toLowerCase() } : {};
    const result = await User.updateMany(filter, { $inc: { tokenVersion: 1 } });

    console.log(`Matched: ${result.matchedCount}, sessions revoked: ${result.modifiedCount}`);
    if (email) console.log(`Scope: ${email}`);
    else console.log('Scope: every account');

    await mongoose.disconnect();
    process.exit(0);
};

main().catch(async (error) => {
    console.error('Failed:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
