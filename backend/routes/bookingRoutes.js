const express = require('express');
const router = express.Router();

const {
    createBooking,
    getAllBookings,
    updateBookingStatus,
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

// ==========================================
// MANAGER ONLY LOGIC
// ==========================================

// @route   PATCH /api/bookings/:id/status
// @desc    UPDATE STATUS TO CONFIRMED/CANCELLED
// @access  Manager ONLY
router.patch('/:id/status', authorize('manager'), updateBookingStatus);

// @route   DELETE /api/bookings/:id
// @desc    DELETE A BOOKING
// @access  Manager ONLY
router.delete('/:id', authorize('manager'), deleteBooking);

module.exports = router;
