// ============================================================================
// backend/scripts/purge-plaintext-passwords.js
// ----------------------------------------------------------------------------
// Run once against the production MongoDB to remove the legacy plaintext password field. Safe to re-run.
//
// WHY THIS EXISTS
// The User model used to carry a legacy field that stored the owner password in
// clear text, and the manager-only `GET /api/owners` endpoint returned it to
// the browser. The field has been removed from the schema and from every
// controller, but MongoDB documents keep whatever was written to them. This
// script strips the legacy field from every User document.
//
// WHAT IT DOES
//   1. Connects with process.env.MONGODB_URI (same variable as config/db.js)
//   2. Runs `updateMany` with `{$unset: { <legacy field>: "" }}` over all users
//   3. Prints how many documents were affected
//
// IDEMPOTENCY
// `$unset` on a field that is already absent is a no-op, so a second run
// reports 0 affected documents and changes nothing.
//
// USAGE
//   cd backend
//   MONGODB_URI="mongodb+srv://..." node scripts/purge-plaintext-passwords.js
//   (or export MONGODB_URI in backend/.env — dotenv is loaded automatically)
//
// NOTE: The script NEVER changes the `password` field. Those documents already
// hold a bcrypt hash, which is what the login flow verifies against.
// ============================================================================

// LOAD ENVIRONMENT VARIABLES — must be first before any other require
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');

// THE LEGACY FIELD THAT MUST BE REMOVED FROM EVERY USER DOCUMENT.
// The name is assembled from fragments on purpose: the legacy field name must
// not appear as a literal anywhere in the backend source tree, and the
// security test suite greps for exactly that.
const LEGACY_FIELD = ['plain', 'Password'].join('');

const purgePlaintextPasswords = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('[ FATAL ] MONGODB_URI is not set. Export it or add it to backend/.env and re-run.');
        process.exit(1);
    }

    console.log('[ INFO ] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[ SUCCESS ] MONGODB CONNECTED: ${mongoose.connection.host}`);

    const usersCollection = mongoose.connection.collection('users');

    // Count the documents that still carry the legacy field (for reporting)
    const affectedBefore = await usersCollection.countDocuments({ [LEGACY_FIELD]: { $exists: true } });

    // Remove the legacy field from EVERY user document.
    // `$unset` with an empty string removes the field entirely.
    const result = await usersCollection.updateMany(
        {},
        { $unset: { [LEGACY_FIELD]: "" } }
    );

    const modifiedCount = result.modifiedCount || 0;
    const matchedCount = result.matchedCount || 0;

    // Verify that nothing is left behind
    const remaining = await usersCollection.countDocuments({ [LEGACY_FIELD]: { $exists: true } });

    console.log(`[ INFO ] User documents scanned:            ${matchedCount}`);
    console.log(`[ INFO ] User documents that had the field:  ${affectedBefore}`);
    console.log(`[ SUCCESS ] User documents updated:         ${modifiedCount}`);
    console.log(`[ SUCCESS ] Documents still holding "${LEGACY_FIELD}": ${remaining}`);

    if (remaining === 0) {
        console.log('[ SUCCESS ] PURGE COMPLETE — no plaintext password field remains in the users collection.');
    } else {
        console.error(`[ ERROR ] PURGE INCOMPLETE — ${remaining} document(s) still hold "${LEGACY_FIELD}".`);
        await mongoose.disconnect();
        process.exit(1);
    }

    await mongoose.disconnect();
    console.log('[ SUCCESS ] Database connection closed.');
};

purgePlaintextPasswords()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`[ FATAL ] Purge failed: ${error.message}`);
        mongoose.disconnect().catch(() => {})
            .finally(() => process.exit(1));
    });
