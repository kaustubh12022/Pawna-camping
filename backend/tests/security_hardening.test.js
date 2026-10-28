// backend/tests/security_hardening.test.js
// ============================================================================
// Regression tests for the production-hardening pass.
//
// These are pure unit/integration tests: no database, no network, no server
// process. Run with:
//     node backend/tests/security_hardening.test.js
//
// Coverage:
//   1. CSV formula-injection neutralisation
//   2. Password policy
//   3. ObjectId / query-operator rejection
//   4. Error handler never leaks stack traces or framework messages
//   5. JWT carries a tokenVersion binding
// ============================================================================

const assert = require('assert');
const path = require('path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-long-enough-for-hs256-signing';
process.env.NODE_ENV = 'test';

let passed = 0;
let failed = 0;

const test = (name, fn) => {
    try {
        fn();
        passed++;
        console.log(`  [PASS] ${name}`);
    } catch (error) {
        failed++;
        console.error(`  [FAIL] ${name} -> ${error.message}`);
    }
};

// ---------------------------------------------------------------------------
// 1. CSV FORMULA INJECTION
// ---------------------------------------------------------------------------
const { sanitizeCsvCell } = require('../routes/bookingRoutes');

console.log('\n--- CSV formula injection ---');

test('prefixes a formula cell with an apostrophe', () => {
    const out = sanitizeCsvCell('=1+1');
    assert.ok(out.includes("'=1+1"), `expected apostrophe prefix, got ${out}`);
});

test('neutralises HYPERLINK payloads', () => {
    const out = sanitizeCsvCell('=HYPERLINK("http://evil.example","click")');
    assert.strictEqual(out, '"\'=HYPERLINK(""http://evil.example"",""click"")"');
});

test('neutralises +, - and @ prefixes', () => {
    ['+1', '-1', '@SUM(A1)'].forEach((value) => {
        assert.ok(sanitizeCsvCell(value).includes(`'${value}`), value);
    });
});

test('neutralises a leading tab or carriage return', () => {
    assert.ok(sanitizeCsvCell('\t=1+1').includes("'\t=1+1"));
    assert.ok(sanitizeCsvCell('\r=1+1').includes("'\r=1+1"));
});

test('always wraps cells in quotes and doubles internal quotes', () => {
    const out = sanitizeCsvCell('Kale, "Kaustubh"');
    assert.strictEqual(out, '"Kale, ""Kaustubh"""');
});

test('does not corrupt a normal name', () => {
    assert.strictEqual(sanitizeCsvCell('Kaustubh Kale'), '"Kaustubh Kale"');
});

test('strips NUL bytes', () => {
    assert.ok(!sanitizeCsvCell('abc\u0000def').includes('\u0000'));
});

// ---------------------------------------------------------------------------
// 2. PASSWORD POLICY
// ---------------------------------------------------------------------------
const { validatePassword, optionalObjectId, optionalInt } = require('../utils/validate');

console.log('\n--- Password policy ---');

test('rejects a short password', () => {
    assert.strictEqual(validatePassword('Ab1').ok, false);
});

test('rejects a password equal to the email', () => {
    assert.strictEqual(validatePassword('same@example.com', { email: 'same@example.com' }).ok, false);
});

test('rejects letters-only and digits-only passwords', () => {
    assert.strictEqual(validatePassword('abcdefghij').ok, false);
    assert.strictEqual(validatePassword('1234567890').ok, false);
});

test('accepts a passphrase with a letter and a number', () => {
    assert.strictEqual(validatePassword('correct horse 9 battery').ok, true);
});

test('rejects a non-string password', () => {
    assert.strictEqual(validatePassword({ $ne: null }).ok, false);
});

// ---------------------------------------------------------------------------
// 3. QUERY OPERATOR REJECTION
// ---------------------------------------------------------------------------
console.log('\n--- Query parameter typing ---');

test('rejects a NoSQL operator object as an ObjectId', () => {
    assert.strictEqual(optionalObjectId({ $ne: null }), null);
});

test('rejects an array of ObjectIds', () => {
    assert.strictEqual(optionalObjectId(['69a343d9c2065c641ff7b325']), null);
});

test('accepts a valid ObjectId string', () => {
    assert.strictEqual(optionalObjectId('69a343d9c2065c641ff7b325'), '69a343d9c2065c641ff7b325');
});

test('rejects object/boolean/float guest counts', () => {
    assert.strictEqual(optionalInt({ $gt: 0 }, { min: 1 }), null);
    assert.strictEqual(optionalInt(true, { min: 1 }), null);
    assert.strictEqual(optionalInt(2.5, { min: 1 }), null);
});

// ---------------------------------------------------------------------------
// 4. ERROR HANDLER
// ---------------------------------------------------------------------------
const { errorHandler } = require('../middleware/errorHandler');

console.log('\n--- Error handler ---');

const mockRes = () => {
    const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
    return res;
};

test('CastError becomes a 400 without internal detail', () => {
    const res = mockRes();
    const err = new Error('Cast to ObjectId failed for value "x" at path "propertyId" for model "Package"');
    err.name = 'CastError';
    errorHandler(err, { originalUrl: '/api/packages', method: 'GET' }, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, 'Invalid identifier format');
    assert.strictEqual(res.body.stack, undefined);
});

test('unknown 500 hides the message, stack and file paths', () => {
    // Simulate the previous behaviour: NODE_ENV unset on the host.
    const previous = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    const res = mockRes();
    const err = new Error('CORS: Origin https://attacker.example not allowed');
    errorHandler(err, { originalUrl: '/api/settings', method: 'GET' }, res, () => {});

    process.env.NODE_ENV = previous;

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body.message, 'Internal Server Error');
    assert.strictEqual(res.body.stack, undefined);
    assert.ok(!JSON.stringify(res.body).includes('/opt/render'));
});

test('malformed JSON becomes a 400', () => {
    const res = mockRes();
    const err = new Error('Unexpected token');
    err.type = 'entity.parse.failed';
    errorHandler(err, { originalUrl: '/api/bookings', method: 'POST' }, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, 'Malformed JSON in request body');
});

test('duplicate key becomes a 409', () => {
    const res = mockRes();
    const err = new Error('E11000 duplicate key');
    err.code = 11000;
    errorHandler(err, { originalUrl: '/api/owners', method: 'POST' }, res, () => {});
    assert.strictEqual(res.statusCode, 409);
});

// ---------------------------------------------------------------------------
// 5. USER SERIALISATION (legacy plaintext field)
// ---------------------------------------------------------------------------
const mongoose = require('mongoose');
const User = require('../models/User');

console.log('\n--- User serialisation ---');

test('strips password, legacy plaintext and auth bookkeeping from JSON', () => {
    const doc = User.hydrate({
        _id: new mongoose.Types.ObjectId(),
        name: 'Owner',
        email: 'owner@example.com',
        role: 'owner',
        password: 'bcrypt-hash',
        plainPassword: 'legacy-secret',
        tokenVersion: 4,
        failedLoginAttempts: 2,
        lockUntil: new Date()
    });

    const json = doc.toJSON();
    assert.strictEqual(json.plainPassword, undefined);
    assert.strictEqual(json.password, undefined);
    assert.strictEqual(json.tokenVersion, undefined);
    assert.strictEqual(json.failedLoginAttempts, undefined);
    assert.strictEqual(json.lockUntil, undefined);
    assert.strictEqual(json.name, 'Owner');
});

test('strips the same fields through toObject (used by listOwners)', () => {
    const doc = User.hydrate({
        _id: new mongoose.Types.ObjectId(),
        name: 'Owner',
        email: 'owner@example.com',
        role: 'owner',
        password: 'bcrypt-hash',
        plainPassword: 'legacy-secret'
    });

    const obj = doc.toObject();
    assert.strictEqual(obj.plainPassword, undefined);
    assert.strictEqual(obj.password, undefined);
});

// ---------------------------------------------------------------------------
// 6. JWT TOKEN VERSION BINDING
// ---------------------------------------------------------------------------
const jwt = require('jsonwebtoken');
const { generateToken } = require('../controllers/authController');

console.log('\n--- Session revocation ---');

test('issued tokens embed the account tokenVersion', () => {
    const token = generateToken({ _id: '69a343d9c2065c641ff7b325', role: 'manager', tokenVersion: 3 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.tv, 3);
    assert.strictEqual(decoded.role, 'manager');
    assert.strictEqual(decoded.id, '69a343d9c2065c641ff7b325');
});

test('a missing tokenVersion is normalised to 0', () => {
    const token = generateToken({ _id: '69a343d9c2065c641ff7b325', role: 'owner' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.tv, 0);
});

// ---------------------------------------------------------------------------
// 7. ALLOW-LISTS
// ---------------------------------------------------------------------------
const fs = require('fs');
const { optionalHttpUrl } = require('../utils/validate');

console.log('\n--- Allow-lists ---');

test('accepts only absolute http(s) URLs for stored links', () => {
    assert.strictEqual(optionalHttpUrl('https://maps.app.goo.gl/abc'), 'https://maps.app.goo.gl/abc');
    assert.strictEqual(optionalHttpUrl('http://example.com/x'), 'http://example.com/x');
    assert.strictEqual(optionalHttpUrl('javascript:alert(1)'), null);
    assert.strictEqual(optionalHttpUrl('data:text/html,<script>alert(1)</script>'), null);
    assert.strictEqual(optionalHttpUrl('/relative/path'), null);
    assert.strictEqual(optionalHttpUrl({ href: 'https://example.com' }), null);
    assert.strictEqual(optionalHttpUrl(''), '');
});

test('package updates never spread the raw request body', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'packageController.js'), 'utf8');
    assert.ok(!src.includes('{ ...req.body }'), 'mass assignment regression in packageController');
    assert.ok(src.includes('ALLOWED_PACKAGE_FIELDS'), 'package update allow-list missing');
});

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(72));
console.log(`SECURITY HARDENING TEST SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${passed + failed}`);
console.log('='.repeat(72));

process.exit(failed === 0 ? 0 : 1);
