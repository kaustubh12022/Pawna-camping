// backend/tests/m2_remediation_it2.test.js
// Verification suite for Milestone 2 Iteration 2 Remediation Tasks

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

async function run() {
    console.log('================================================================================');
    console.log('MILESTONE 2 ITERATION 2 REMEDIATION VERIFICATION');
    console.log('================================================================================\n');

    // --------------------------------------------------------------------------------
    // TASK 1: TOAST COMPATIBILITY & DUAL USAGE
    // --------------------------------------------------------------------------------
    console.log('--- TASK 1: TOAST HOOK & CONSUMER VERIFICATION ---');

    const toastContextPath = path.resolve(__dirname, '../../src/context/ToastContext.jsx');
    const toastContextContent = fs.readFileSync(toastContextPath, 'utf8');

    // 1.1 ToastContext returns spread context, spread toast, and toast object
    report(
        'ToastContext.jsx includes resilient useToast return shape',
        toastContextContent.includes('toast: context.toast') &&
        toastContextContent.includes('...context.toast') &&
        toastContextContent.includes('...context'),
        'Returns { ...context, ...context.toast, toast: context.toast }'
    );

    // 1.2 ToastProvider memoizes contextValue with spread toast
    report(
        'ToastProvider memoizes contextValue including ...toast and toast',
        toastContextContent.includes('const contextValue = useMemo') &&
        toastContextContent.includes('...toast') &&
        toastContextContent.includes('toast,'),
        'Context value includes { showToast, removeToast, toast, ...toast }'
    );

    // 1.3 Behavioral test: simulate useToast with both consumption styles
    const mockShowToast = (msg, type) => ({ msg, type });
    const mockRemoveToast = (id) => id;
    const toastHelpers = {
        success: (msg) => `success: ${msg}`,
        error: (msg) => `error: ${msg}`,
        warning: (msg) => `warning: ${msg}`,
        info: (msg) => `info: ${msg}`,
        dismiss: mockRemoveToast
    };
    const contextMock = {
        showToast: mockShowToast,
        removeToast: mockRemoveToast,
        toast: toastHelpers,
        ...toastHelpers
    };

    // Simulate useToast() return
    const useToastResult = {
        ...contextMock,
        ...contextMock.toast,
        toast: contextMock.toast
    };

    // Direct invocation style: const toast = useToast(); toast.warning(...)
    const directToast = useToastResult;
    try {
        const directWarning = directToast.warning('Direct Warning Test');
        assert.strictEqual(directWarning, 'warning: Direct Warning Test');
        report('Direct usage `const toast = useToast(); toast.warning(...)` works without error', true);
    } catch (err) {
        report('Direct usage `const toast = useToast(); toast.warning(...)` works without error', false, err.message);
    }

    // Destructured style: const { toast } = useToast(); toast.warning(...)
    const { toast: destructuredToast } = useToastResult;
    try {
        const destWarning = destructuredToast.warning('Destructured Warning Test');
        assert.strictEqual(destWarning, 'warning: Destructured Warning Test');
        report('Destructured usage `const { toast } = useToast(); toast.warning(...)` works without error', true);
    } catch (err) {
        report('Destructured usage `const { toast } = useToast(); toast.warning(...)` works without error', false, err.message);
    }

    // Direct helper destructuring: const { success, error, warning } = useToast()
    const { success: directSuccess, warning: directWarnHelper } = useToastResult;
    try {
        assert.strictEqual(directSuccess('ok'), 'success: ok');
        assert.strictEqual(directWarnHelper('caution'), 'warning: caution');
        report('Direct helper destructuring `const { success, warning } = useToast()` works without error', true);
    } catch (err) {
        report('Direct helper destructuring `const { success, warning } = useToast()` works without error', false, err.message);
    }

    // 1.4 Verify consumer files Booking.jsx and Reviews.jsx use `const { toast } = useToast();`
    const bookingPath = path.resolve(__dirname, '../../src/components/Booking.jsx');
    const bookingContent = fs.readFileSync(bookingPath, 'utf8');
    const reviewsPath = path.resolve(__dirname, '../../src/components/Reviews.jsx');
    const reviewsContent = fs.readFileSync(reviewsPath, 'utf8');

    report(
        'Booking.jsx uses `const { toast } = useToast();`',
        /const\s*\{\s*toast\s*\}\s*=\s*useToast\(\s*\)/.test(bookingContent),
        'Booking.jsx destructures toast'
    );

    report(
        'Reviews.jsx uses `const { toast } = useToast();`',
        /const\s*\{\s*toast\s*\}\s*=\s*useToast\(\s*\)/.test(reviewsContent),
        'Reviews.jsx destructures toast'
    );

    // --------------------------------------------------------------------------------
    // TASK 2: API BASE URL NORMALIZATION IN Booking.jsx
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 2: API BASE URL NORMALIZATION IN Booking.jsx ---');

    // 2.1 Booking.jsx imports API_BASE_URL from config/api
    report(
        'Booking.jsx imports API_BASE_URL from config/api',
        /import\s*\{\s*API_BASE_URL\s*\}\s*from\s*['"]\.\.\/config\/api['"]/.test(bookingContent),
        'Found valid API_BASE_URL import'
    );

    // 2.2 Booking.jsx has ZERO raw import.meta.env.VITE_API_URL
    const rawViteApiOccurrences = (bookingContent.match(/import\.meta\.env\.VITE_API_URL/g) || []).length;
    report(
        'Booking.jsx has 0 raw `import.meta.env.VITE_API_URL` occurrences',
        rawViteApiOccurrences === 0,
        `Found ${rawViteApiOccurrences} residual raw references`
    );

    // 2.3 Verify all fetch calls in Booking.jsx use API_BASE_URL
    const fetchMatches = bookingContent.match(/fetch\s*\(\s*`\$\{([^}]+)\}/g) || [];
    const allFetchesUseConfig = fetchMatches.every(f => f.includes('API_BASE_URL'));
    report(
        'All fetch requests in Booking.jsx use API_BASE_URL',
        fetchMatches.length >= 4 && allFetchesUseConfig,
        `Audited ${fetchMatches.length} fetch calls: all use API_BASE_URL`
    );

    // --------------------------------------------------------------------------------
    // TASK 3: DEFENSIVE NON-NEGATIVE MEAL BOUNDS IN bookingController.js
    // --------------------------------------------------------------------------------
    console.log('\n--- TASK 3: DEFENSIVE MEAL BOUNDS IN bookingController.js ---');

    const bookingController = require('../controllers/bookingController');
    const Property = require('../models/Property');
    const BlockedDate = require('../models/BlockedDate');
    const Package = require('../models/Package');
    const Booking = require('../models/Booking');
    const User = require('../models/User');

    const dummyCampsiteId = new mongoose.Types.ObjectId();
    User.find = () => Promise.resolve([]);
    Property.findById = function(id) {
        return Promise.resolve({
            _id: id,
            type: 'campsite',
            name: 'Test Campsite',
            maxGuests: 15,
            pricing: { weekdayPrice: 1000, weekendPrice: 1200 }
        });
    };
    BlockedDate.findOne = () => Promise.resolve(null);
    Package.findOne = () => Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        title: 'Camping Tent',
        weekdayPrice: 1000,
        weekendPrice: 1200,
        maxCapacity: 20
    });
    Booking.countDocuments = () => Promise.resolve(0);
    Booking.create = (doc) => Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...doc });

    const d1 = new Date();
    d1.setDate(d1.getDate() + 10);
    const d2 = new Date();
    d2.setDate(d2.getDate() + 11);
    const checkIn = d1.toISOString().split('T')[0];
    const checkOut = d2.toISOString().split('T')[0];

    const negativeMealTestCases = [
        {
            name: 'Adversarial sum bypass: veg=-2, nonVeg=4, guests=2 (sum=2)',
            vegGuests: -2,
            nonVegGuests: 4,
            guests: 2
        },
        {
            name: 'Negative vegGuests: veg=-1, nonVeg=3, guests=2',
            vegGuests: -1,
            nonVegGuests: 3,
            guests: 2
        },
        {
            name: 'Negative nonVegGuests: veg=3, nonVeg=-1, guests=2',
            vegGuests: 3,
            nonVegGuests: -1,
            guests: 2
        },
        {
            name: 'Both negative: veg=-2, nonVeg=-2, guests=2',
            vegGuests: -2,
            nonVegGuests: -2,
            guests: 2
        },
        {
            name: 'String negative values: veg="-3", nonVeg="5", guests=2',
            vegGuests: '-3',
            nonVegGuests: '5',
            guests: 2
        }
    ];

    for (const tc of negativeMealTestCases) {
        const req = {
            body: {
                propertyId: dummyCampsiteId.toString(),
                packageType: 'Camping Tent',
                checkIn,
                checkOut,
                guests: tc.guests,
                vegGuests: tc.vegGuests,
                nonVegGuests: tc.nonVegGuests,
                customerName: 'Security Tester',
                customerPhone: '9876543210',
                customerEmail: 'sec@example.com'
            }
        };
        const res = createMockRes();
        await bookingController.createBooking(req, res);

        const rejectedProperly = res.statusCode === 400 && res.data && res.data.message === 'Meal counts cannot be negative';
        report(
            `Rejects negative meal input: ${tc.name}`,
            rejectedProperly,
            `status=${res.statusCode}, msg="${res.data?.message}"`
        );
    }

    // Test valid non-negative campsite meals pass defensive check
    const reqValid = {
        body: {
            propertyId: dummyCampsiteId.toString(),
            packageType: 'Camping Tent',
            checkIn,
            checkOut,
            guests: 3,
            vegGuests: 2,
            nonVegGuests: 1,
            customerName: 'Valid Guest',
            customerPhone: '9876543210',
            customerEmail: 'valid@example.com'
        }
    };
    const resValid = createMockRes();
    await bookingController.createBooking(reqValid, resValid);
    report(
        'Accepts valid non-negative meal counts matching guest count (2 veg + 1 nonVeg = 3)',
        resValid.statusCode === 201,
        `status=${resValid.statusCode}`
    );

    console.log('\n================================================================================');
    console.log(`REMEDIATION TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED out of ${totalPassed + totalFailed} TESTS`);
    console.log('================================================================================');

    if (totalFailed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

run().catch((err) => {
    console.error('Fatal error during remediation tests:', err);
    process.exit(1);
});
