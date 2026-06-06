const express = require('express');
const router = express.Router();

const {
    createBooking,
    getAllBookings,
    updateBookingStatus,
    ownerRespondToBooking,
    deleteBooking
} = require('../controllers/bookingController');

const { protect, authorize } = require('../middleware/authMiddleware');

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

// @route   GET /api/bookings/export
// @desc    EXPORT BOOKINGS AS CSV
// @access  Manager & Owner
router.get('/export', authorize('manager', 'owner'), async (req, res) => {
    try {
        const Booking = require('../models/Booking');
        const { period, propertyId } = req.query; // period: daily|weekly|monthly
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
        if (req.user.role === 'owner') {
            query.property = { $in: req.user.properties || [] };
        }

        const bookings = await Booking.find(query)
            .populate('property', 'name type')
            .sort({ createdAt: -1 })
            .lean();

        const headers = ['Name', 'Phone', 'Property', 'Type', 'Check-In', 'Check-Out', 'Guests', 'Veg', 'Non-Veg', 'Status', 'Created'];
        const rows = bookings.map(b => [
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
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="bookings_${period || 'all'}.csv"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

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

