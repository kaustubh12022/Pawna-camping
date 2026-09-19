// backend/tests/m2_empirical_feature14_feature20.test.js
// Empirical Test Harness for Milestone 2: Feature 14 (Toast/Alert Eradication) & Feature 20 (Client/Server Form Validations)

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Mock Express response helper
function createMockRes() {
    return {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.data = data;
            return this;
        }
    };
}

let totalPassed = 0;
let totalFailed = 0;

function report(testName, passed, detail = '') {
    if (passed) {
        totalPassed++;
        console.log(`  [PASS] ${testName}${detail ? ' -> ' + detail : ''}`);
    } else {
        totalFailed++;
        console.error(`  [FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
    }
}

async function main() {
    console.log('================================================================================');
    console.log('MILESTONE 2 EMPIRICAL TEST HARNESS: FEATURE 14 & FEATURE 20');
    console.log('================================================================================\n');

    // ================================================================================
    // SUITE 1: ALERT ERADICATION VERIFICATION (Feature 14)
    // ================================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('SUITE 1: ALERT ERADICATION IN src/ (Feature 14)');
    console.log('--------------------------------------------------------------------------------');

    const srcDir = path.resolve(__dirname, '../../src');
    let filesChecked = 0;
    let alertMatches = [];

    function scanDirectoryForAlerts(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                scanDirectoryForAlerts(fullPath);
            } else if (entry.isFile() && /\.(jsx?|tsx?|html|css|json)$/i.test(entry.name)) {
                filesChecked++;
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split(/\r?\n/);
                lines.forEach((line, idx) => {
                    // Match alert(...) or window.alert(...) while ignoring comments or role="alert"
                    const trimmed = line.trim();
                    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
                    if (/\balert\s*\(/.test(line) || /window\.alert\s*\(/.test(line)) {
                        alertMatches.push({
                            file: path.relative(srcDir, fullPath),
                            line: idx + 1,
                            text: trimmed
                        });
                    }
                });
            }
        }
    }

    scanDirectoryForAlerts(srcDir);

    report(
        `Recursive scan of src/ found 0 alert() invocations (${filesChecked} files checked)`,
        alertMatches.length === 0,
        alertMatches.length === 0 ? '0 alerts found' : `Found ${alertMatches.length} alert(s): ${JSON.stringify(alertMatches)}`
    );

    // Verify ToastContext exists and exports ToastProvider and useToast
    const toastContextPath = path.join(srcDir, 'context/ToastContext.jsx');
    const toastContextExists = fs.existsSync(toastContextPath);
    report('ToastContext.jsx exists', toastContextExists);

    if (toastContextExists) {
        const toastContent = fs.readFileSync(toastContextPath, 'utf8');
        const hasProvider = toastContent.includes('export const ToastProvider');
        const hasHook = toastContent.includes('export const useToast');
        const hasRoles = toastContent.includes('role="alert"') && toastContent.includes('aria-live="polite"');
        report('ToastContext exports ToastProvider', hasProvider);
        report('ToastContext exports useToast hook', hasHook);
        report('ToastContext includes accessible ARIA attributes', hasRoles);
    }

    // Verify App.jsx is wrapped in ToastProvider
    const appJsxPath = path.join(srcDir, 'App.jsx');
    if (fs.existsSync(appJsxPath)) {
        const appContent = fs.readFileSync(appJsxPath, 'utf8');
        const hasToastProviderImport = appContent.includes('ToastProvider');
        const wrapsToastProvider = appContent.includes('<ToastProvider>') && appContent.includes('</ToastProvider>');
        report('App.jsx imports ToastProvider', hasToastProviderImport);
        report('App.jsx wraps application root in <ToastProvider>', wrapsToastProvider);
    }

    // ================================================================================
    // SUITE 2: CAMPSITE MEAL COUNT VALIDATION (Feature 20)
    // ================================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('SUITE 2: CAMPSITE MEAL COUNT VALIDATION (Feature 20)');
    console.log('--------------------------------------------------------------------------------');

    function validateMealParity(propertyType, packageType, guests, vegGuests, nonVegGuests) {
        const isVilla = propertyType === 'villa' || packageType === 'Villa Booking';
        if (!isVilla) {
            const totalMeals = (Number(vegGuests) || 0) + (Number(nonVegGuests) || 0);
            if (totalMeals !== Number(guests)) {
                return {
                    valid: false,
                    statusCode: 400,
                    message: `Total veg and non-veg meals (${totalMeals}) must match the number of guests (${guests})`
                };
            }
        }
        return { valid: true, statusCode: 200, isVilla };
    }

    const mealCases = [
        // Campsite Valid Matching Cases
        { desc: 'Campsite: 4 guests with 2 veg + 2 non-veg', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: 2, nonVeg: 2, expectedValid: true },
        { desc: 'Campsite: 4 guests with 3 veg + 1 non-veg', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: 3, nonVeg: 1, expectedValid: true },
        { desc: 'Campsite: 4 guests with 4 veg + 0 non-veg (all veg)', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: 4, nonVeg: 0, expectedValid: true },
        { desc: 'Campsite: 4 guests with 0 veg + 4 non-veg (all non-veg)', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: 0, nonVeg: 4, expectedValid: true },
        { desc: 'Campsite: 1 guest with 1 veg + 0 non-veg (solo traveler)', prop: 'campsite', pkg: 'Tent Package', guests: 1, veg: 1, nonVeg: 0, expectedValid: true },
        { desc: 'Campsite: 1 guest with 0 veg + 1 non-veg (solo traveler)', prop: 'campsite', pkg: 'Tent Package', guests: 1, veg: 0, nonVeg: 1, expectedValid: true },
        { desc: 'Campsite: 12 guests with 7 veg + 5 non-veg (group)', prop: 'campsite', pkg: 'Tent Package', guests: 12, veg: 7, nonVeg: 5, expectedValid: true },
        { desc: 'Campsite: string guest counts ("3" and "2" for 5 guests)', prop: 'campsite', pkg: 'Tent Package', guests: 5, veg: '3', nonVeg: '2', expectedValid: true },

        // Campsite Invalid Mismatch Cases (Under-allocation & Over-allocation)
        { desc: 'Campsite: 4 guests with 1 veg + 2 non-veg (sum=3 < 4)', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: 1, nonVeg: 2, expectedValid: false, expectedCode: 400 },
        { desc: 'Campsite: 4 guests with 3 veg + 2 non-veg (sum=5 > 4)', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: 3, nonVeg: 2, expectedValid: false, expectedCode: 400 },
        { desc: 'Campsite: 4 guests with 0 veg + 0 non-veg (sum=0)', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: 0, nonVeg: 0, expectedValid: false, expectedCode: 400 },
        { desc: 'Campsite: 4 guests with undefined veg & nonVeg', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: undefined, nonVeg: undefined, expectedValid: false, expectedCode: 400 },
        { desc: 'Campsite: 4 guests with null veg & nonVeg', prop: 'campsite', pkg: 'Tent Package', guests: 4, veg: null, nonVeg: null, expectedValid: false, expectedCode: 400 },
        { desc: 'Campsite: 1 guest with 0 meals selected', prop: 'campsite', pkg: 'Tent Package', guests: 1, veg: 0, nonVeg: 0, expectedValid: false, expectedCode: 400 },

        // Villa Bypass Cases (Villas do not require meal parity)
        { desc: 'Villa by propertyType: 10 guests with 0 meals (bypassed)', prop: 'villa', pkg: 'Luxury Stay', guests: 10, veg: 0, nonVeg: 0, expectedValid: true },
        { desc: 'Villa by propertyType: 10 guests with mismatched meals (bypassed)', prop: 'villa', pkg: 'Luxury Stay', guests: 10, veg: 2, nonVeg: 1, expectedValid: true },
        { desc: 'Villa by packageType: "Villa Booking" with 6 guests 0 meals (bypassed)', prop: null, pkg: 'Villa Booking', guests: 6, veg: 0, nonVeg: 0, expectedValid: true },
        { desc: 'Villa by packageType: "Villa Booking" with mismatched meals (bypassed)', prop: null, pkg: 'Villa Booking', guests: 6, veg: 4, nonVeg: 4, expectedValid: true }
    ];

    for (const tc of mealCases) {
        const res = validateMealParity(tc.prop, tc.pkg, tc.guests, tc.veg, tc.nonVeg);
        const passed = res.valid === tc.expectedValid && (!tc.expectedCode || res.statusCode === tc.expectedCode);
        report(tc.desc, passed, `valid=${res.valid}, code=${res.statusCode}`);
    }

    // Verify actual controller behavior with mock req/res for meal mismatch
    {
        const bookingController = require('../controllers/bookingController');
        const Property = require('../models/Property');
        const BlockedDate = require('../models/BlockedDate');
        const Package = require('../models/Package');
        const Booking = require('../models/Booking');

        const dummyCampsiteId = new mongoose.Types.ObjectId();
        const origFindById = Property.findById;
        const origBlockedFindOne = BlockedDate.findOne;
        const origPkgFindOne = Package.findOne;
        const origBookingCount = Booking.countDocuments;
        const origBookingCreate = Booking.create;

        Property.findById = function(id) {
            return Promise.resolve({
                _id: id,
                type: 'campsite',
                name: 'Test Campsite',
                maxGuests: 15,
                pricing: { weekdayPrice: 1000, weekendPrice: 1200 }
            });
        };
        BlockedDate.findOne = function() {
            return Promise.resolve(null);
        };
        Package.findOne = function() {
            return Promise.resolve({
                _id: new mongoose.Types.ObjectId(),
                title: 'Camping Tent',
                weekdayPrice: 1000,
                weekendPrice: 1200,
                maxCapacity: 20
            });
        };
        Booking.countDocuments = function() {
            return Promise.resolve(0);
        };
        Booking.create = function(doc) {
            return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...doc });
        };

        try {
            const d1 = new Date();
            d1.setDate(d1.getDate() + 5);
            const d2 = new Date();
            d2.setDate(d2.getDate() + 6);
            const checkIn = d1.toISOString().split('T')[0];
            const checkOut = d2.toISOString().split('T')[0];

            // 1. Test mismatch HTTP 400 from actual controller
            const reqMismatch = {
                body: {
                    propertyId: dummyCampsiteId.toString(),
                    packageType: 'Camping Tent',
                    checkIn,
                    checkOut,
                    guests: 4,
                    vegGuests: 1,
                    nonVegGuests: 1, // sum=2, guests=4 -> mismatch
                    customerName: 'Test Traveler',
                    customerPhone: '9876543210',
                    customerEmail: 'test@example.com'
                }
            };
            const resMismatch = createMockRes();

            await bookingController.createBooking(reqMismatch, resMismatch);

            const controllerCaughtMismatch = resMismatch.statusCode === 400 && resMismatch.data && resMismatch.data.message.includes('Total veg and non-veg meals');
            report('Actual createBooking controller rejects meal mismatch with HTTP 400', controllerCaughtMismatch, `status=${resMismatch.statusCode}, msg="${resMismatch.data?.message}"`);

            // 2. Test matching meal counts accepted by controller
            const reqMatch = {
                body: {
                    propertyId: dummyCampsiteId.toString(),
                    packageType: 'Camping Tent',
                    checkIn,
                    checkOut,
                    guests: 4,
                    vegGuests: 2,
                    nonVegGuests: 2, // sum=4, guests=4 -> match
                    customerName: 'Test Traveler',
                    customerPhone: '9876543210',
                    customerEmail: 'test@example.com'
                }
            };
            const resMatch = createMockRes();

            await bookingController.createBooking(reqMatch, resMatch);
            const controllerPassedMatch = resMatch.statusCode === 200 || resMatch.statusCode === 201;
            report('Actual createBooking controller accepts matching meal count (2 veg + 2 nonVeg = 4)', controllerPassedMatch, `status=${resMatch.statusCode}`);
        } finally {
            // Restore stubs
            Property.findById = origFindById;
            BlockedDate.findOne = origBlockedFindOne;
            Package.findOne = origPkgFindOne;
            Booking.countDocuments = origBookingCount;
            Booking.create = origBookingCreate;
        }
    }

    // ================================================================================
    // SUITE 3: PHONE FORMAT VALIDATION (Feature 20)
    // ================================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('SUITE 3: INDIAN PHONE FORMAT VALIDATION (Feature 20)');
    console.log('--------------------------------------------------------------------------------');

    function validateIndianPhone(phoneInput) {
        const cleanPhone = (phoneInput || '').toString().replace(/[\s+-]/g, '');
        const normalizedPhone = cleanPhone.length > 10 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;
        const isValid = /^[6-9]\d{9}$/.test(normalizedPhone);
        return { isValid, cleanPhone, normalizedPhone };
    }

    const phoneTestCases = [
        // VALID INDIAN PHONE NUMBERS
        { input: '9876543210', expected: true, desc: 'Standard 10-digit starting with 9' },
        { input: '8123456789', expected: true, desc: 'Standard 10-digit starting with 8' },
        { input: '7000000000', expected: true, desc: 'Standard 10-digit starting with 7' },
        { input: '6999999999', expected: true, desc: 'Standard 10-digit starting with 6' },
        { input: '+91 9876543210', expected: true, desc: 'Country code +91 with space' },
        { input: '+91-9876543210', expected: true, desc: 'Country code +91 with hyphen' },
        { input: '919876543210', expected: true, desc: '12-digit format starting with 91' },
        { input: '  +91  98765 43210  ', expected: true, desc: 'Formatted with internal and outer spaces' },
        { input: 9876543210, expected: true, desc: 'Raw integer representation 9876543210' },

        // INVALID STARTING DIGITS (Only 6, 7, 8, 9 are valid Indian mobile prefixes)
        { input: '5987654321', expected: false, desc: 'Invalid starting digit: 5' },
        { input: '0987654321', expected: false, desc: 'Invalid starting digit: 0' },
        { input: '1234567890', expected: false, desc: 'Invalid starting digit: 1' },
        { input: '2345678901', expected: false, desc: 'Invalid starting digit: 2' },
        { input: '3456789012', expected: false, desc: 'Invalid starting digit: 3' },
        { input: '4567890123', expected: false, desc: 'Invalid starting digit: 4' },

        // INVALID LENGTHS (Too short or too long)
        { input: '987654321', expected: false, desc: 'Short length (9 digits)' },
        { input: '98765', expected: false, desc: 'Short length (5 digits)' },
        { input: '', expected: false, desc: 'Empty string' },
        { input: null, expected: false, desc: 'Null value' },
        { input: undefined, expected: false, desc: 'Undefined value' },
        { input: '98765432101', expected: false, desc: 'Excessive length (11 digits without 91)' },
        { input: '819876543210', expected: false, desc: '12 digits starting with non-91 (81)' },
        { input: '+91 98765432101', expected: false, desc: '11 digits after +91 prefix' },
        { input: '9198765432100', expected: false, desc: '11 digits after 91 prefix' },

        // INVALID CHARACTERS & MALICIOUS INPUTS
        { input: '987654321a', expected: false, desc: 'Letters inside phone string' },
        { input: 'abcdefghij', expected: false, desc: 'All alphabetic string' },
        { input: '98765@3210', expected: false, desc: 'Special character @' },
        { input: '98765#4321', expected: false, desc: 'Special character #' },
        { input: "' OR '1'='1", expected: false, desc: 'SQL injection string' },
        { input: '<script>alert(1)</script>', expected: false, desc: 'XSS attempt' }
    ];

    for (const tc of phoneTestCases) {
        const res = validateIndianPhone(tc.input);
        const passed = res.isValid === tc.expected;
        report(tc.desc, passed, `input="${tc.input}" -> normalized="${res.normalizedPhone}", valid=${res.isValid}`);
    }

    // Verify actual controller behavior with invalid phone
    {
        const bookingController = require('../controllers/bookingController');
        const d1 = new Date();
        d1.setDate(d1.getDate() + 5);
        const d2 = new Date();
        d2.setDate(d2.getDate() + 6);

        const req = {
            body: {
                customerPhone: '5551234567', // invalid starting digit
                checkIn: d1.toISOString().split('T')[0],
                checkOut: d2.toISOString().split('T')[0],
                guests: 2
            }
        };
        const res = createMockRes();
        await bookingController.createBooking(req, res);
        const caught = res.statusCode === 400 && res.data?.message.includes('valid 10-digit Indian phone number');
        report('Actual createBooking controller rejects invalid phone "5551234567" with HTTP 400', caught, `status=${res.statusCode}`);
    }

    // ================================================================================
    // SUITE 4: REVIEW VALIDATION LOGIC (Feature 20)
    // ================================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('SUITE 4: REVIEW VALIDATION LOGIC (Feature 20)');
    console.log('--------------------------------------------------------------------------------');

    const reviewController = require('../controllers/reviewController');
    const validObjectId = new mongoose.Types.ObjectId().toString();

    // 1. Missing required fields
    {
        const req = { body: {} };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects missing all fields with HTTP 400', res.statusCode === 400 && res.data.message === 'All fields are required');
    }

    // 2. Reviewer Name Bounds
    {
        // 1 char name (sub-minimum)
        const req = { body: { property: validObjectId, reviewerName: 'A', rating: 5, text: 'This was an awesome trip!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects reviewerName < 2 characters ("A")', res.statusCode === 400 && res.data.message.includes('at least 2 characters'));
    }
    {
        // Whitespace only name
        const req = { body: { property: validObjectId, reviewerName: '   ', rating: 5, text: 'This was an awesome trip!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects whitespace-only reviewerName ("   ")', res.statusCode === 400 && res.data.message.includes('at least 2 characters'));
    }
    {
        // Non-string reviewerName
        const req = { body: { property: validObjectId, reviewerName: 12345, rating: 5, text: 'This was an awesome trip!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects non-string reviewerName (number)', res.statusCode === 400 && res.data.message.includes('at least 2 characters'));
    }

    // 3. Rating Bounds (1 to 5 integer)
    {
        // Rating 0 (falsy in req.body, caught by required fields check or bounds check with HTTP 400)
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: 0, text: 'This was an awesome trip!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects rating < 1 (rating=0) with HTTP 400', res.statusCode === 400, `status=${res.statusCode}, msg="${res.data?.message}"`);
    }
    {
        // Rating -2 (negative)
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: -2, text: 'This was an awesome trip!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects rating < 0 (rating=-2)', res.statusCode === 400 && res.data.message.includes('integer between 1 and 5'));
    }
    {
        // Rating 6 (exceeds max)
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: 6, text: 'This was an awesome trip!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects rating > 5 (rating=6)', res.statusCode === 400 && res.data.message.includes('integer between 1 and 5'));
    }
    {
        // Rating 3.5 (non-integer float)
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: 3.5, text: 'This was an awesome trip!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects non-integer float rating (rating=3.5)', res.statusCode === 400 && res.data.message.includes('integer between 1 and 5'));
    }
    {
        // Rating non-numeric string "five"
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: 'five', text: 'This was an awesome trip!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects non-numeric string rating ("five")', res.statusCode === 400 && res.data.message.includes('integer between 1 and 5'));
    }

    // 4. Text Length Bounds (10 - 1000 chars)
    {
        // 9 characters (sub-minimum)
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: 5, text: 'NineChars' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects text < 10 characters (9 chars)', res.statusCode === 400 && res.data.message.includes('between 10 and 1000 characters'));
    }
    {
        // Whitespace only text (15 spaces)
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: 5, text: '               ' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects whitespace-only text', res.statusCode === 400 && res.data.message.includes('between 10 and 1000 characters'));
    }
    {
        // 1001 characters (exceeds maximum)
        const longText = 'a'.repeat(1001);
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: 5, text: longText } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects text > 1000 characters (1001 chars)', res.statusCode === 400 && res.data.message.includes('between 10 and 1000 characters'));
    }
    {
        // Non-string text
        const req = { body: { property: validObjectId, reviewerName: 'Rohit', rating: 5, text: { comment: 'Awesome place' } } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects non-string text (object)', res.statusCode === 400 && res.data.message.includes('between 10 and 1000 characters'));
    }

    // 5. Invalid Property ObjectId
    {
        const req = { body: { property: 'not-a-valid-object-id', reviewerName: 'Rohit', rating: 5, text: 'TenChars!!' } };
        const res = createMockRes();
        await reviewController.createReview(req, res);
        report('Rejects malformed property ObjectId gracefully', res.statusCode === 400 && res.data.message === 'Invalid property ID');
    }

    // 6. Valid boundaries (10 chars lower bound, 1000 chars upper bound, ratings 1 and 5, 2-char name)
    {
        const Property = require('../models/Property');
        const Review = require('../models/Review');
        const origFindById = Property.findById;
        const origReviewCreate = Review.create;

        Property.findById = function(id) {
            return {
                select: () => ({
                    lean: () => Promise.resolve({ _id: id })
                })
            };
        };

        Review.create = function(doc) {
            return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...doc });
        };

        try {
            // Valid lower boundary: 2-char name, rating 1, 10-char text
            {
                const req = { body: { property: validObjectId, reviewerName: 'Jo', rating: 1, text: 'TenChars!!' } };
                const res = createMockRes();
                await reviewController.createReview(req, res);
                report('Accepts valid lower bounds: name="Jo", rating=1, text="TenChars!!"', res.statusCode === 201, `status=${res.statusCode}`);
            }

            // Valid upper boundary: rating 5, 1000-char text
            {
                const text1000 = 'x'.repeat(1000);
                const req = { body: { property: validObjectId, reviewerName: 'Priya Sharma', rating: 5, text: text1000 } };
                const res = createMockRes();
                await reviewController.createReview(req, res);
                report('Accepts valid upper bounds: rating=5, text=1000 chars', res.statusCode === 201, `status=${res.statusCode}`);
            }
        } finally {
            Property.findById = origFindById;
            Review.create = origReviewCreate;
        }
    }

    // ================================================================================
    // SUITE 5: PROPERTY & PACKAGE BOUNDS (Feature 20)
    // ================================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('SUITE 5: PROPERTY & PACKAGE BOUNDS (Feature 20)');
    console.log('--------------------------------------------------------------------------------');

    const propertyController = require('../controllers/propertyController');
    const packageController = require('../controllers/packageController');
    const Property = require('../models/Property');
    const Package = require('../models/Package');

    // --- PROPERTY VALIDATIONS (createProperty & updateProperty) ---

    // 1. Property Name & Type
    {
        const req = { body: { name: '', type: 'campsite' } };
        const res = createMockRes();
        await propertyController.createProperty(req, res);
        report('createProperty rejects empty name', res.statusCode === 400 && res.data.message === 'Property name is required');
    }
    {
        const req = { body: { name: 'Lake Camp', type: 'hotel' } };
        const res = createMockRes();
        await propertyController.createProperty(req, res);
        report('createProperty rejects invalid type "hotel"', res.statusCode === 400 && res.data.message.includes('"campsite" or "villa"'));
    }

    // 2. Property maxGuests Bounds (createProperty)
    {
        const req = { body: { name: 'Camp Pawna', type: 'campsite', maxGuests: 0 } };
        const res = createMockRes();
        await propertyController.createProperty(req, res);
        report('createProperty rejects maxGuests = 0', res.statusCode === 400 && res.data.message === 'Maximum guests must be greater than 0');
    }
    {
        const req = { body: { name: 'Camp Pawna', type: 'campsite', maxGuests: -5 } };
        const res = createMockRes();
        await propertyController.createProperty(req, res);
        report('createProperty rejects maxGuests = -5 (negative)', res.statusCode === 400 && res.data.message === 'Maximum guests must be greater than 0');
    }
    {
        const req = { body: { name: 'Camp Pawna', type: 'campsite', maxGuests: 'abc' } };
        const res = createMockRes();
        await propertyController.createProperty(req, res);
        report('createProperty rejects maxGuests = "abc" (NaN)', res.statusCode === 400 && res.data.message === 'Maximum guests must be greater than 0');
    }

    // 3. Property Pricing Bounds (createProperty)
    {
        const req = { body: { name: 'Camp Pawna', type: 'campsite', maxGuests: 10, pricing: { weekdayPrice: -500 } } };
        const res = createMockRes();
        await propertyController.createProperty(req, res);
        report('createProperty rejects negative weekdayPrice (-500)', res.statusCode === 400 && res.data.message === 'Weekday price cannot be negative');
    }
    {
        const req = { body: { name: 'Camp Pawna', type: 'campsite', maxGuests: 10, pricing: { weekendPrice: -200 } } };
        const res = createMockRes();
        await propertyController.createProperty(req, res);
        report('createProperty rejects negative weekendPrice (-200)', res.statusCode === 400 && res.data.message === 'Weekend price cannot be negative');
    }

    // 4. Property Bounds in updateProperty
    {
        const origPropFindById = Property.findById;
        Property.findById = function(id) {
            return Promise.resolve({
                _id: id,
                name: 'Existing Camp',
                type: 'campsite',
                maxGuests: 10,
                pricing: { weekdayPrice: 1000, weekendPrice: 1500 }
            });
        };

        try {
            {
                const req = { params: { id: 'prop-1' }, body: { maxGuests: 0 } };
                const res = createMockRes();
                await propertyController.updateProperty(req, res);
                report('updateProperty rejects maxGuests = 0', res.statusCode === 400 && res.data.message === 'Maximum guests must be greater than 0');
            }
            {
                const req = { params: { id: 'prop-1' }, body: { maxGuests: -3 } };
                const res = createMockRes();
                await propertyController.updateProperty(req, res);
                report('updateProperty rejects maxGuests = -3 (negative)', res.statusCode === 400 && res.data.message === 'Maximum guests must be greater than 0');
            }
            {
                const req = { params: { id: 'prop-1' }, body: { pricing: { weekdayPrice: -100 } } };
                const res = createMockRes();
                await propertyController.updateProperty(req, res);
                report('updateProperty rejects negative weekdayPrice (-100)', res.statusCode === 400 && res.data.message === 'Weekday price cannot be negative');
            }
            {
                const req = { params: { id: 'prop-1' }, body: { pricing: { weekendPrice: -1 } } };
                const res = createMockRes();
                await propertyController.updateProperty(req, res);
                report('updateProperty rejects negative weekendPrice (-1)', res.statusCode === 400 && res.data.message === 'Weekend price cannot be negative');
            }
        } finally {
            Property.findById = origPropFindById;
        }
    }

    // --- PACKAGE VALIDATIONS (createPackage & updatePackage) ---

    // 5. Package Title & Capacity Bounds (createPackage)
    {
        const req = { body: { title: '' } };
        const res = createMockRes();
        await packageController.createPackage(req, res);
        report('createPackage rejects empty title', res.statusCode === 400 && res.data.message === 'Package title is required');
    }
    {
        const req = { body: { title: '   ' } };
        const res = createMockRes();
        await packageController.createPackage(req, res);
        report('createPackage rejects whitespace-only title', res.statusCode === 400 && res.data.message === 'Package title is required');
    }
    {
        const req = { body: { title: 'Standard Tent', maxCapacity: 0 } };
        const res = createMockRes();
        await packageController.createPackage(req, res);
        report('createPackage rejects maxCapacity = 0', res.statusCode === 400 && res.data.message === 'Maximum capacity must be greater than 0');
    }
    {
        const req = { body: { title: 'Standard Tent', maxCapacity: -2 } };
        const res = createMockRes();
        await packageController.createPackage(req, res);
        report('createPackage rejects maxCapacity = -2 (negative)', res.statusCode === 400 && res.data.message === 'Maximum capacity must be greater than 0');
    }
    {
        const req = { body: { title: 'Standard Tent', maxCapacity: 'invalid' } };
        const res = createMockRes();
        await packageController.createPackage(req, res);
        report('createPackage rejects maxCapacity = "invalid" (NaN)', res.statusCode === 400 && res.data.message === 'Maximum capacity must be greater than 0');
    }

    // 6. Package Pricing Bounds (createPackage)
    {
        const req = { body: { title: 'Standard Tent', maxCapacity: 4, weekdayPrice: -10 } };
        const res = createMockRes();
        await packageController.createPackage(req, res);
        report('createPackage rejects negative weekdayPrice (-10)', res.statusCode === 400 && res.data.message === 'Weekday price cannot be negative');
    }
    {
        const req = { body: { title: 'Standard Tent', maxCapacity: 4, weekendPrice: -50 } };
        const res = createMockRes();
        await packageController.createPackage(req, res);
        report('createPackage rejects negative weekendPrice (-50)', res.statusCode === 400 && res.data.message === 'Weekend price cannot be negative');
    }

    // 7. Package Bounds in updatePackage
    {
        const origPkgFindById = Package.findById;
        Package.findById = function(id) {
            return Promise.resolve({
                _id: id,
                title: 'Existing Package',
                maxCapacity: 5,
                weekdayPrice: 1200,
                weekendPrice: 1500
            });
        };

        try {
            {
                const req = { params: { id: 'pkg-1' }, body: { maxCapacity: 0 } };
                const res = createMockRes();
                await packageController.updatePackage(req, res);
                report('updatePackage rejects maxCapacity = 0', res.statusCode === 400 && res.data.message === 'Maximum capacity must be greater than 0');
            }
            {
                const req = { params: { id: 'pkg-1' }, body: { maxCapacity: -5 } };
                const res = createMockRes();
                await packageController.updatePackage(req, res);
                report('updatePackage rejects maxCapacity = -5 (negative)', res.statusCode === 400 && res.data.message === 'Maximum capacity must be greater than 0');
            }
            {
                const req = { params: { id: 'pkg-1' }, body: { weekdayPrice: -20 } };
                const res = createMockRes();
                await packageController.updatePackage(req, res);
                report('updatePackage rejects negative weekdayPrice (-20)', res.statusCode === 400 && res.data.message === 'Weekday price cannot be negative');
            }
            {
                const req = { params: { id: 'pkg-1' }, body: { weekendPrice: -100 } };
                const res = createMockRes();
                await packageController.updatePackage(req, res);
                report('updatePackage rejects negative weekendPrice (-100)', res.statusCode === 400 && res.data.message === 'Weekend price cannot be negative');
            }
        } finally {
            Package.findById = origPkgFindById;
        }
    }

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('\n================================================================================');
    console.log(`TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED out of ${totalPassed + totalFailed} TESTS`);
    console.log('================================================================================');

    if (totalFailed > 0) {
        console.error(`\nFAILED: ${totalFailed} test(s) failed.`);
        process.exit(1);
    } else {
        console.log('\nSUCCESS: All empirical tests passed with 100% compliance.');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Unhandled test harness error:', err);
    process.exit(1);
});
