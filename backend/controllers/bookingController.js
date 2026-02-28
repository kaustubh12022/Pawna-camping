const Booking = require('../models/Booking');

// ==========================================
// CAPACITY VALIDATION LOGIC
// ==========================================
const checkCapacityOverlap = async (packageType, checkIn, checkOut) => {
    // 1. Determine Max Capacity
    let maxCapacity = 0;
    if (packageType === 'Cottage') maxCapacity = 5;
    else if (packageType === 'Luxury Cottage') maxCapacity = 3;
    else return true; // Tents are unlimited, skip check

    // 2. Query for OVERLAP DETECTION using CONFIRMED BOOKINGS FILTER
    // An overlap occurs if the existing booking's duration intersects with the new duration.
    const overlappingBookings = await Booking.countDocuments({
        status: 'confirmed',
        packageType: packageType,
        $and: [
            { checkIn: { $lt: new Date(checkOut) } }, // existing starts before new ends
            { checkOut: { $gt: new Date(checkIn) } }  // existing ends after new starts
        ]
    });

    // 3. Return evaluation
    return overlappingBookings < maxCapacity;
};

// @desc    CREATE NEW BOOKING
// @route   POST /api/bookings
// @access  Private (Manager Only)
const createBooking = async (req, res) => {
    try {
        const {
            packageType,
            checkIn,
            checkOut,
            guests,
            vegGuests,
            nonVegGuests,
            foodPreference,
            customerName,
            customerPhone
        } = req.body;

        // ==========================================
        // CAPACITY VALIDATION CHECK (POST)
        // ==========================================
        const hasCapacity = await checkCapacityOverlap(packageType, checkIn, checkOut);
        if (!hasCapacity) {
            return res.status(400).json({
                message: "Selected package is fully booked for these dates."
            });
        }

        // CREATE NEW PUBLIC (PENDING) BOOKING (NIGHTS CALCULATION HAPPENS IN MODEL)
        const booking = await Booking.create({
            packageType,
            checkIn,
            checkOut,
            guests,
            vegGuests: vegGuests || 0,
            nonVegGuests: nonVegGuests || 0,
            foodPreference,
            customerName,
            customerPhone,
            addedBy: req.user ? req.user._id : undefined // GRACEFUL HANDLING FOR MANAGER OR PUBLIC
        });

        res.status(201).json(booking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    GET ALL BOOKINGS (WITH OPTIONAL DATE FILTERS)
// @route   GET /api/bookings
// @access  Private (Manager and Owner)
const getAllBookings = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        // OPTIONAL FILTER: FILTER BY DATE RANGE IF PROVIDED
        if (startDate && endDate) {
            query.checkIn = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const bookings = await Booking.find(query).populate('addedBy', 'name email').sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    UPDATE BOOKING STATUS
// @route   PATCH /api/bookings/:id/status
// @access  Private (Manager Only)
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;

        // ENSURE ONLY VALID STATUSES ARE PASSED
        if (!['confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'INVALID STATUS SUPPLIED' });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'BOOKING NOT FOUND' });
        }

        // ==========================================
        // CAPACITY VALIDATION CHECK (PATCH CONFIRMATION)
        // ==========================================
        if (status === 'confirmed') {
            const hasCapacity = await checkCapacityOverlap(
                booking.packageType,
                booking.checkIn,
                booking.checkOut
            );

            if (!hasCapacity) {
                return res.status(400).json({
                    message: "Cannot confirm booking. Capacity exceeded for selected dates."
                });
            }
        }

        booking.status = status;
        const updatedBooking = await booking.save();

        res.status(200).json(updatedBooking);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    DELETE BOOKING
// @route   DELETE /api/bookings/:id
// @access  Private (Manager Only)
const deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'BOOKING NOT FOUND' });
        }

        await booking.deleteOne();
        res.status(200).json({ id: req.params.id, message: 'BOOKING DELETED SUCCESSFULLY' });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

module.exports = {
    createBooking,
    getAllBookings,
    updateBookingStatus,
    deleteBooking
};
