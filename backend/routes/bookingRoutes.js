const express = require('express');
const router = express.Router();

const {
    createBooking,
    getAllBookings,
    updateBookingStatus,
    ownerRespondToBooking,
    deleteBooking
} = require('../controllers/bookingController');
const Booking = require('../models/Booking');

const { protect, authorize } = require('../middleware/authMiddleware');
const { optionalString, optionalObjectId } = require('../utils/validate');

// ==========================================
// CSV CELL SANITISER
// ==========================================
// Spreadsheet applications treat a cell beginning with =, +, -, @, TAB or CR
// as a formula. A customer name of `=HYPERLINK("http://evil","click")` would
// therefore execute in the manager's Excel. Every cell is:
//   1. stripped of NUL bytes,
//   2. prefixed with an apostrophe when it could be parsed as a formula,
//   3. always wrapped in double quotes with internal quotes doubled.
// Always quoting also prevents delimiter and newline injection.
// ==========================================
const FORMULA_TRIGGER = /^[\s]*[=+\-@\t\r]/;

const sanitizeCsvCell = (value) => {
    if (value === null || value === undefined) return '""';

    let text = String(value).replace(/\0/g, '');

    if (FORMULA_TRIGGER.test(text)) {
        text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
};

// @route   GET /api/bookings/export
// @desc    EXPORT BOOKINGS AS CSV
// @access  Manager & Owner
router.get('/export', protect, authorize('manager', 'owner'), async (req, res) => {
    try {
        const period = optionalString(req.query.period, 20);
        const propertyId = optionalObjectId(req.query.propertyId);

        if (period && !['daily', 'weekly', 'monthly'].includes(period)) {
            return res.status(400).json({ message: 'Invalid export period' });
        }
        if (req.query.propertyId && !propertyId) {
            return res.status(400).json({ message: 'Invalid property id' });
        }

        const now = new Date();
        let startDate;

        if (period === 'daily') {
            startDate = new Date(now); startDate.setHours(0, 0, 0, 0);
        } else if (period === 'weekly') {
            startDate = new Date(now); startDate.setDate(now.getDate() - 7);
        } else if (period === 'monthly') {
            startDate = new Date(now); startDate.setMonth(now.getMonth() - 1);
        }

        const query = {};
        if (startDate) query.createdAt = { $gte: startDate };
        if (propertyId) query.property = propertyId;

        // Owners may only export their own properties, whatever they request.
        if (req.user.role === 'owner') {
            const ownedIds = req.user.properties || [];
            if (ownedIds.length === 0) {
                return res.status(200).send('\uFEFF"Name","Phone","Property","Type","Check-In","Check-Out","Guests","Veg","Non-Veg","Status","Created"\n');
            }
            if (propertyId) {
                const ownsRequested = ownedIds.some((id) => id.toString() === propertyId);
                if (!ownsRequested) {
                    return res.status(403).json({ message: 'ACCESS DENIED: Not your property' });
                }
            } else {
                query.property = { $in: ownedIds };
            }
        }

        const bookings = await Booking.find(query)
            .populate('property', 'name type')
            .sort({ createdAt: -1 })
            .limit(5000)
            .lean();

        const headers = ['Name', 'Phone', 'Property', 'Type', 'Check-In', 'Check-Out', 'Guests', 'Veg', 'Non-Veg', 'Status', 'Created'];

        const rows = bookings.map((b) => [
            b.customerName,
            b.customerPhone,
            b.property?.name || b.packageType || '',
            b.propertyType || '',
            new Date(b.checkIn).toLocaleDateString('en-IN'),
            new Date(b.checkOut).toLocaleDateString('en-IN'),
            b.guests,
            b.vegGuests || 0,
            b.nonVegGuests || 0,
            b.status,
            new Date(b.createdAt).toLocaleDateString('en-IN')
        ].map(sanitizeCsvCell).join(','));

        const csv = `\uFEFF${[headers.map(sanitizeCsvCell).join(','), ...rows].join('\r\n')}\r\n`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="bookings_${period || 'all'}.csv"`);
        res.setHeader('Cache-Control', 'no-store');
        return res.send(csv);
    } catch (error) {
        console.error('[ BOOKING ] export failed:', error.message);
        return res.status(500).json({ message: 'Unable to export bookings' });
    }
});

// ==========================================
// PUBLIC ROUTE
// ==========================================

// @route   POST /api/bookings
// @desc    CREATE A PENDING BOOKING FROM PUBLIC WEBSITE
// @access  Public
router.post('/', createBooking);

// ==========================================
// PROTECTED ROUTES (JWT REQUIRED)
// ==========================================
router.use(protect);

// @route   GET /api/bookings
// @desc    GET ALL BOOKINGS
// @access  Manager & Owner
router.get('/', authorize('manager', 'owner'), getAllBookings);

// ==========================================
// OWNER ONLY LOGIC
// ==========================================

// @route   PATCH /api/bookings/:id/owner-response
// @desc    OWNER RESPOND TO BOOKING (Accept/Reject)
// @access  Owner ONLY
router.patch('/:id/owner-response', authorize('owner'), ownerRespondToBooking);

// ==========================================
// MANAGER ONLY LOGIC
// ==========================================

// @route   POST /api/bookings/manager
// @desc    MANAGER CREATES A BOOKING DIRECTLY (no public form)
// @access  Manager ONLY
router.post('/manager', authorize('manager'), createBooking);

// @route   PATCH /api/bookings/:id/status
// @desc    UPDATE STATUS TO CONFIRMED/CANCELLED
// @access  Manager ONLY
router.patch('/:id/status', authorize('manager'), updateBookingStatus);

// @route   DELETE /api/bookings/:id
// @desc    DELETE A BOOKING
// @access  Manager ONLY
router.delete('/:id', authorize('manager'), deleteBooking);

module.exports = router;
module.exports.sanitizeCsvCell = sanitizeCsvCell;
