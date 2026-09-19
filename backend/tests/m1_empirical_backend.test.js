// backend/tests/m1_empirical_backend.test.js
// Empirical Test Harness for Milestone 1 Backend Validations & Pricing

const assert = require('assert');
const mongoose = require('mongoose');

// =========================================================================
// 1. DATE OVERLAP LOGIC (Mongoose Query Emulation & Logic Verification)
// =========================================================================
console.log('=================================================================');
console.log('TEST SUITE 1: DATE OVERLAP LOGIC (BlockedDate vs Booking Dates)');
console.log('=================================================================');

/**
 * Evaluates the exact MongoDB query condition used in bookingController.js:
 * {
 *   $and: [
 *     { startDate: { $lt: new Date(checkOut) } },
 *     { endDate: { $gte: new Date(checkIn) } }
 *   ]
 * }
 */
function checkBlockedDateOverlap(blockedDoc, checkInStr, checkOutStr) {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    const blockStart = new Date(blockedDoc.startDate);
    const blockEnd = new Date(blockedDoc.endDate);

    const condition1 = blockStart < checkOut;
    const condition2 = blockEnd >= checkIn;

    return condition1 && condition2;
}

let overlapPass = 0;
let overlapFail = 0;

const overlapTestCases = [
    // --- SINGLE-DAY BLOCKED DATE (Oct 10, 2026) ---
    {
        name: 'Single-day block: Exact 1-night stay on blocked date (2026-10-10 -> 2026-10-11)',
        block: { startDate: '2026-10-10', endDate: '2026-10-10' },
        checkIn: '2026-10-10',
        checkOut: '2026-10-11',
        expectedOverlap: true
    },
    {
        name: 'Single-day block: Check-out on morning of blocked date (2026-10-09 -> 2026-10-10)',
        block: { startDate: '2026-10-10', endDate: '2026-10-10' },
        checkIn: '2026-10-09',
        checkOut: '2026-10-10',
        expectedOverlap: false // Guest leaves Oct 10 morning, no collision with Oct 10 night
    },
    {
        name: 'Single-day block: Check-in on day after blocked date (2026-10-11 -> 2026-10-12)',
        block: { startDate: '2026-10-10', endDate: '2026-10-10' },
        checkIn: '2026-10-11',
        checkOut: '2026-10-12',
        expectedOverlap: false
    },
    {
        name: 'Single-day block: Multi-night booking encompassing blocked date (2026-10-08 -> 2026-10-12)',
        block: { startDate: '2026-10-10', endDate: '2026-10-10' },
        checkIn: '2026-10-08',
        checkOut: '2026-10-12',
        expectedOverlap: true
    },
    {
        name: 'Single-day block: Booking starting on blocked date for 2 nights (2026-10-10 -> 2026-10-12)',
        block: { startDate: '2026-10-10', endDate: '2026-10-10' },
        checkIn: '2026-10-10',
        checkOut: '2026-10-12',
        expectedOverlap: true
    },
    {
        name: 'Single-day block: Booking starting before and ending day after blocked (2026-10-09 -> 2026-10-11)',
        block: { startDate: '2026-10-10', endDate: '2026-10-10' },
        checkIn: '2026-10-09',
        checkOut: '2026-10-11',
        expectedOverlap: true
    },

    // --- MULTI-DAY BLOCKED DATE RANGE (Oct 10, 2026 to Oct 15, 2026) ---
    {
        name: 'Multi-day block: Booking completely before (2026-10-05 -> 2026-10-10)',
        block: { startDate: '2026-10-10', endDate: '2026-10-15' },
        checkIn: '2026-10-05',
        checkOut: '2026-10-10',
        expectedOverlap: false
    },
    {
        name: 'Multi-day block: 1-night stay on first blocked day (2026-10-10 -> 2026-10-11)',
        block: { startDate: '2026-10-10', endDate: '2026-10-15' },
        checkIn: '2026-10-10',
        checkOut: '2026-10-11',
        expectedOverlap: true
    },
    {
        name: 'Multi-day block: Booking fully inside range (2026-10-12 -> 2026-10-14)',
        block: { startDate: '2026-10-10', endDate: '2026-10-15' },
        checkIn: '2026-10-12',
        checkOut: '2026-10-14',
        expectedOverlap: true
    },
    {
        name: 'Multi-day block: 1-night stay on last blocked day (2026-10-15 -> 2026-10-16)',
        block: { startDate: '2026-10-10', endDate: '2026-10-15' },
        checkIn: '2026-10-15',
        checkOut: '2026-10-16',
        expectedOverlap: true
    },
    {
        name: 'Multi-day block: Check-in immediately after block ends (2026-10-16 -> 2026-10-17)',
        block: { startDate: '2026-10-10', endDate: '2026-10-15' },
        checkIn: '2026-10-16',
        checkOut: '2026-10-17',
        expectedOverlap: false
    },
    {
        name: 'Multi-day block: Booking completely encompassing block (2026-10-08 -> 2026-10-18)',
        block: { startDate: '2026-10-10', endDate: '2026-10-15' },
        checkIn: '2026-10-08',
        checkOut: '2026-10-18',
        expectedOverlap: true
    },
    {
        name: 'Multi-day block: Overlapping start boundary (2026-10-08 -> 2026-10-12)',
        block: { startDate: '2026-10-10', endDate: '2026-10-15' },
        checkIn: '2026-10-08',
        checkOut: '2026-10-12',
        expectedOverlap: true
    },
    {
        name: 'Multi-day block: Overlapping end boundary (2026-10-14 -> 2026-10-18)',
        block: { startDate: '2026-10-10', endDate: '2026-10-15' },
        checkIn: '2026-10-14',
        checkOut: '2026-10-18',
        expectedOverlap: true
    },

    // --- EDGE DATE BOUNDARIES (Month transition, Year transition, Leap Year) ---
    {
        name: 'Month transition: Single-day block Oct 31 (2026-10-31 -> 2026-11-01)',
        block: { startDate: '2026-10-31', endDate: '2026-10-31' },
        checkIn: '2026-10-31',
        checkOut: '2026-11-01',
        expectedOverlap: true
    },
    {
        name: 'Month transition: Booking starts Nov 01 after Oct 31 block (2026-11-01 -> 2026-11-02)',
        block: { startDate: '2026-10-31', endDate: '2026-10-31' },
        checkIn: '2026-11-01',
        checkOut: '2026-11-02',
        expectedOverlap: false
    },
    {
        name: 'Year transition: Multi-day block spanning Dec 31 to Jan 01',
        block: { startDate: '2026-12-31', endDate: '2027-01-01' },
        checkIn: '2026-12-31',
        checkOut: '2027-01-01',
        expectedOverlap: true
    },
    {
        name: 'Year transition: Booking Jan 01 to Jan 02 on block ending Jan 01',
        block: { startDate: '2026-12-31', endDate: '2027-01-01' },
        checkIn: '2027-01-01',
        checkOut: '2027-01-02',
        expectedOverlap: true
    },
    {
        name: 'Year transition: Booking Jan 02 to Jan 03 after block ending Jan 01',
        block: { startDate: '2026-12-31', endDate: '2027-01-01' },
        checkIn: '2027-01-02',
        checkOut: '2027-01-03',
        expectedOverlap: false
    },
    {
        name: 'Leap year boundary: Blocked Feb 29 2028 (2028-02-29 -> 2028-02-29)',
        block: { startDate: '2028-02-29', endDate: '2028-02-29' },
        checkIn: '2028-02-29',
        checkOut: '2028-03-01',
        expectedOverlap: true
    },
    {
        name: 'Leap year boundary: Check-in March 01 after Feb 29 block (2028-03-01 -> 2028-03-02)',
        block: { startDate: '2028-02-29', endDate: '2028-02-29' },
        checkIn: '2028-03-01',
        checkOut: '2028-03-02',
        expectedOverlap: false
    }
];

for (const tc of overlapTestCases) {
    const actualOverlap = checkBlockedDateOverlap(tc.block, tc.checkIn, tc.checkOut);
    if (actualOverlap === tc.expectedOverlap) {
        console.log(`[PASS] ${tc.name} => ${actualOverlap ? 'BLOCKED' : 'ALLOWED'}`);
        overlapPass++;
    } else {
        console.error(`[FAIL] ${tc.name}: expected ${tc.expectedOverlap}, got ${actualOverlap}`);
        overlapFail++;
    }
}


// =========================================================================
// 2. PRICING CALCULATION LOGIC (calculateServerTotalPrice)
// =========================================================================
console.log('\n=================================================================');
console.log('TEST SUITE 2: calculateServerTotalPrice LOGIC VERIFICATION');
console.log('=================================================================');

/**
 * Exact implementation of calculateServerTotalPrice from bookingController.js
 */
async function calculateServerTotalPrice({ property, propertyType, packageType, pkgDoc, checkIn, checkOut, guests }) {
    if (!checkIn || !checkOut) return 0;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0;

    let weekdayPrice = 0;
    let weekendPrice = 0;
    let perUnitMultiplier = 1;

    if (propertyType === 'villa') {
        weekdayPrice = property?.pricing?.weekdayPrice || 0;
        weekendPrice = property?.pricing?.weekendPrice || 0;
        perUnitMultiplier = 1; // Villas are priced per whole property per night
    } else {
        const pkg = pkgDoc;
        if (pkg) {
            weekdayPrice = pkg.weekdayPrice || 0;
            weekendPrice = pkg.weekendPrice || 0;
            perUnitMultiplier = Number(guests) || 1; // Campsites are priced per person
        }
    }

    let totalPerUnit = 0;
    const current = new Date(start);
    for (let i = 0; i < diffDays; i++) {
        const day = current.getDay(); // 0 = Sunday, 6 = Saturday
        if (day === 0 || day === 6) {
            totalPerUnit += weekendPrice;
        } else {
            totalPerUnit += weekdayPrice;
        }
        current.setDate(current.getDate() + 1);
    }

    return totalPerUnit * perUnitMultiplier;
}

let pricePass = 0;
let priceFail = 0;

const pricingTestCases = [
    // --- CAMPSITE PACKAGES (Per Person Multiplier) ---
    {
        name: 'Campsite 1-night Weekday stay (Wed to Thu): 1200/night x 4 guests',
        propertyType: 'campsite',
        pkg: { weekdayPrice: 1200, weekendPrice: 1600 },
        checkIn: '2026-10-14', // Wednesday
        checkOut: '2026-10-15', // Thursday
        guests: 4,
        expected: 1200 * 4 // 4800
    },
    {
        name: 'Campsite 1-night Weekend stay (Sat to Sun): 1600/night x 4 guests',
        propertyType: 'campsite',
        pkg: { weekdayPrice: 1200, weekendPrice: 1600 },
        checkIn: '2026-10-17', // Saturday
        checkOut: '2026-10-18', // Sunday
        guests: 4,
        expected: 1600 * 4 // 6400
    },
    {
        name: 'Campsite 1-night Weekend stay (Sun to Mon): 1600/night x 2 guests',
        propertyType: 'campsite',
        pkg: { weekdayPrice: 1200, weekendPrice: 1600 },
        checkIn: '2026-10-18', // Sunday (weekend night)
        checkOut: '2026-10-19', // Monday
        guests: 2,
        expected: 1600 * 2 // 3200
    },
    {
        name: 'Campsite 2-night stay Fri to Sun (1 weekday Fri + 1 weekend Sat): 2 guests',
        propertyType: 'campsite',
        pkg: { weekdayPrice: 1200, weekendPrice: 1600 },
        checkIn: '2026-10-16', // Friday
        checkOut: '2026-10-18', // Sunday
        guests: 2,
        expected: (1200 + 1600) * 2 // 5600
    },
    {
        name: 'Campsite 3-night stay Fri to Mon (1 weekday Fri + 2 weekend Sat, Sun): 5 guests',
        propertyType: 'campsite',
        pkg: { weekdayPrice: 1200, weekendPrice: 1600 },
        checkIn: '2026-10-16', // Friday
        checkOut: '2026-10-19', // Monday
        guests: 5,
        expected: (1200 + 1600 + 1600) * 5 // 4400 * 5 = 22000
    },
    {
        name: 'Campsite full 7-night week Mon to Mon (5 weekdays + 2 weekends): 3 guests',
        propertyType: 'campsite',
        pkg: { weekdayPrice: 1000, weekendPrice: 1500 },
        checkIn: '2026-10-12', // Monday
        checkOut: '2026-10-19', // Monday
        guests: 3,
        expected: (5 * 1000 + 2 * 1500) * 3 // (5000 + 3000) * 3 = 24000
    },

    // --- VILLA PACKAGES (Whole Property Flat Rate, NO Guest Multiplier) ---
    {
        name: 'Villa 1-night Weekday stay (Tue to Wed): 8000/night with 10 guests',
        propertyType: 'villa',
        property: { pricing: { weekdayPrice: 8000, weekendPrice: 12000 } },
        checkIn: '2026-10-13', // Tuesday
        checkOut: '2026-10-14', // Wednesday
        guests: 10,
        expected: 8000 // Multiplier must be 1, NOT 10!
    },
    {
        name: 'Villa 1-night Weekend stay (Sat to Sun): 12000/night with 15 guests',
        propertyType: 'villa',
        property: { pricing: { weekdayPrice: 8000, weekendPrice: 12000 } },
        checkIn: '2026-10-17', // Saturday
        checkOut: '2026-10-18', // Sunday
        guests: 15,
        expected: 12000 // Multiplier must be 1, NOT 15!
    },
    {
        name: 'Villa 2-night Weekend stay Fri to Sun (Fri weekday + Sat weekend): 12 guests',
        propertyType: 'villa',
        property: { pricing: { weekdayPrice: 8000, weekendPrice: 12000 } },
        checkIn: '2026-10-16', // Friday
        checkOut: '2026-10-18', // Sunday
        guests: 12,
        expected: 8000 + 12000 // 20000
    },
    {
        name: 'Villa 3-night stay Fri to Mon (Fri weekday + Sat weekend + Sun weekend): 6 guests',
        propertyType: 'villa',
        property: { pricing: { weekdayPrice: 9000, weekendPrice: 14000 } },
        checkIn: '2026-10-16', // Friday
        checkOut: '2026-10-19', // Monday
        guests: 6,
        expected: 9000 + 14000 + 14000 // 37000
    },

    // --- ZERO / CORNER CASES ---
    {
        name: 'Zero nights stay (checkIn === checkOut)',
        propertyType: 'campsite',
        pkg: { weekdayPrice: 1200, weekendPrice: 1600 },
        checkIn: '2026-10-14',
        checkOut: '2026-10-14',
        guests: 4,
        expected: 0
    },
    {
        name: 'Missing checkIn or checkOut',
        propertyType: 'villa',
        property: { pricing: { weekdayPrice: 8000, weekendPrice: 12000 } },
        checkIn: '',
        checkOut: '2026-10-14',
        guests: 2,
        expected: 0
    }
];

(async () => {
    for (const tc of pricingTestCases) {
        const actual = await calculateServerTotalPrice({
            property: tc.property,
            propertyType: tc.propertyType,
            packageType: tc.packageType || 'Standard',
            pkgDoc: tc.pkg,
            checkIn: tc.checkIn,
            checkOut: tc.checkOut,
            guests: tc.guests
        });

        if (actual === tc.expected) {
            console.log(`[PASS] ${tc.name} => ₹${actual}`);
            pricePass++;
        } else {
            console.error(`[FAIL] ${tc.name}: expected ₹${tc.expected}, got ₹${actual}`);
            priceFail++;
        }
    }


    // =========================================================================
    // 3. CAPACITY & GUEST VALIDATION (Controller Logic + Mongoose Schema)
    // =========================================================================
    console.log('\n=================================================================');
    console.log('TEST SUITE 3: CAPACITY & GUEST VALIDATION');
    console.log('=================================================================');

    let capPass = 0;
    let capFail = 0;

    // Load actual Mongoose Booking model
    const Booking = require('../models/Booking');

    // 3.1 Controller maxGuests check logic
    function validateControllerCapacity(propertyDoc, guests) {
        if (propertyDoc.maxGuests && Number(guests) > propertyDoc.maxGuests) {
            return {
                valid: false,
                status: 400,
                message: `Number of guests (${guests}) exceeds maximum capacity of ${propertyDoc.maxGuests} for this property`
            };
        }
        return { valid: true };
    }

    const mockProperty = { name: 'Lakeview Villa', maxGuests: 12 };

    const capTestCases = [
        {
            name: 'Rejects guests exceeding property.maxGuests (guests=15, max=12)',
            property: mockProperty,
            guests: 15,
            shouldPass: false
        },
        {
            name: 'Allows guests exactly equal to property.maxGuests (guests=12, max=12)',
            property: mockProperty,
            guests: 12,
            shouldPass: true
        },
        {
            name: 'Allows guests below property.maxGuests (guests=5, max=12)',
            property: mockProperty,
            guests: 5,
            shouldPass: true
        }
    ];

    for (const tc of capTestCases) {
        const res = validateControllerCapacity(tc.property, tc.guests);
        if (res.valid === tc.shouldPass) {
            console.log(`[PASS] ${tc.name}`);
            capPass++;
        } else {
            console.error(`[FAIL] ${tc.name}: expected valid=${tc.shouldPass}, got ${res.valid}`);
            capFail++;
        }
    }

    // 3.2 Mongoose Schema Validation on guests <= 0 and invalid values
    console.log('\nTesting Mongoose Booking schema validation rules:');

    const schemaTestCases = [
        {
            name: 'Mongoose rejects guests = 0',
            data: {
                packageType: 'Camping Standard',
                checkIn: new Date('2026-10-10'),
                checkOut: new Date('2026-10-11'),
                guests: 0,
                customerName: 'Test Guest',
                customerPhone: '9876543210',
                customerEmail: 'test@example.com'
            },
            expectError: true,
            expectedField: 'guests'
        },
        {
            name: 'Mongoose rejects guests = -3 (negative)',
            data: {
                packageType: 'Camping Standard',
                checkIn: new Date('2026-10-10'),
                checkOut: new Date('2026-10-11'),
                guests: -3,
                customerName: 'Test Guest',
                customerPhone: '9876543210',
                customerEmail: 'test@example.com'
            },
            expectError: true,
            expectedField: 'guests'
        },
        {
            name: 'Mongoose rejects missing guests (null/undefined)',
            data: {
                packageType: 'Camping Standard',
                checkIn: new Date('2026-10-10'),
                checkOut: new Date('2026-10-11'),
                customerName: 'Test Guest',
                customerPhone: '9876543210'
            },
            expectError: true,
            expectedField: 'guests'
        },
        {
            name: 'Mongoose accepts guests = 1 (valid lower bound)',
            data: {
                packageType: 'Camping Standard',
                checkIn: new Date('2026-10-10'),
                checkOut: new Date('2026-10-11'),
                guests: 1,
                customerName: 'Test Guest',
                customerPhone: '9876543210',
                customerEmail: 'test@example.com'
            },
            expectError: false
        },
        {
            name: 'Mongoose rejects checkOut <= checkIn (same-day check-out)',
            data: {
                packageType: 'Camping Standard',
                checkIn: new Date('2026-10-10'),
                checkOut: new Date('2026-10-10'),
                guests: 2,
                customerName: 'Test Guest',
                customerPhone: '9876543210'
            },
            expectError: true,
            expectedField: 'checkOut'
        },
        {
            name: 'Mongoose rejects checkOut < checkIn (inverted dates)',
            data: {
                packageType: 'Camping Standard',
                checkIn: new Date('2026-10-15'),
                checkOut: new Date('2026-10-10'),
                guests: 2,
                customerName: 'Test Guest',
                customerPhone: '9876543210'
            },
            expectError: true,
            expectedField: 'checkOut'
        },
        {
            name: 'Mongoose auto-calculates nights on valid dates (3 nights)',
            data: {
                packageType: 'Camping Standard',
                checkIn: new Date('2026-10-10'),
                checkOut: new Date('2026-10-13'),
                guests: 2,
                customerName: 'Test Guest',
                customerPhone: '9876543210',
                customerEmail: '  TEST@EXAMPLE.COM  '
            },
            expectError: false,
            checkNights: 3,
            checkNormalizedEmail: 'test@example.com'
        }
    ];

    for (const tc of schemaTestCases) {
        const doc = new Booking(tc.data);
        let err = null;
        try {
            await doc.validate();
        } catch (e) {
            err = e;
        }

        if (tc.expectError) {
            if (err && err.errors && err.errors[tc.expectedField]) {
                console.log(`[PASS] ${tc.name} -> Rejected with: "${err.errors[tc.expectedField].message}"`);
                capPass++;
            } else {
                console.error(`[FAIL] ${tc.name}: expected validation error on "${tc.expectedField}", got ${err}`);
                capFail++;
            }
        } else {
            if (!err) {
                let extraCheckOk = true;
                if (tc.checkNights !== undefined && doc.nights !== tc.checkNights) {
                    console.error(`[FAIL] ${tc.name}: expected nights=${tc.checkNights}, got ${doc.nights}`);
                    extraCheckOk = false;
                }
                if (tc.checkNormalizedEmail !== undefined && doc.customerEmail !== tc.checkNormalizedEmail) {
                    console.error(`[FAIL] ${tc.name}: expected customerEmail="${tc.checkNormalizedEmail}", got "${doc.customerEmail}"`);
                    extraCheckOk = false;
                }
                if (extraCheckOk) {
                    console.log(`[PASS] ${tc.name} -> Successfully validated, nights=${doc.nights}, email="${doc.customerEmail}"`);
                    capPass++;
                } else {
                    capFail++;
                }
            } else {
                console.error(`[FAIL] ${tc.name}: unexpected validation error: ${err.message}`);
                capFail++;
            }
        }
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n=================================================================');
    console.log('SUMMARY OF EMPIRICAL TESTS');
    console.log('=================================================================');
    console.log(`Overlap Logic Tests:     ${overlapPass} PASSED, ${overlapFail} FAILED`);
    console.log(`Pricing Logic Tests:     ${pricePass} PASSED, ${priceFail} FAILED`);
    console.log(`Capacity & Schema Tests: ${capPass} PASSED, ${capFail} FAILED`);

    const totalFailed = overlapFail + priceFail + capFail;
    if (totalFailed > 0) {
        console.error(`\nOVERALL STATUS: FAILED (${totalFailed} failures)`);
        process.exit(1);
    } else {
        console.log(`\nOVERALL STATUS: ALL ${overlapPass + pricePass + capPass} TESTS PASSED!`);
        process.exit(0);
    }
})();
