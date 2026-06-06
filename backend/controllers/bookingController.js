const Booking = require('../models/Booking');
const Package = require('../models/Package');
const Property = require('../models/Property');
const BlockedDate = require('../models/BlockedDate');

// ==========================================
// CAPACITY VALIDATION LOGIC
// ==========================================
// PHASE 2: Updated to support both property-scoped and legacy (global) capacity checks.
// - If propertyId is given: find the package scoped to that property
// - If no propertyId: fallback to old global lookup by package title (preserves live site behaviour)
const checkCapacityOverlap = async (packageType, checkIn, checkOut, propertyId = null) => {
    let maxCapacity = 0;
    let pkg = null;

    if (propertyId) {
        // PROPERTY-SCOPED: Look up package for this specific property
        pkg = await Package.findOne({ title: packageType, property: propertyId });
    }

    if (!pkg) {
        // FALLBACK: Legacy global lookup (preserves existing live booking behaviour)
        pkg = await Package.findOne({ title: packageType });
    }

    if (pkg && pkg.maxCapacity > 0) {
        maxCapacity = pkg.maxCapacity;
    } else {
        return true; // Unlimited or not found — allow booking
    }

    // Build overlap query
    const overlapQuery = {
        status: 'confirmed',
        packageType: packageType,
        $and: [
            { checkIn: { $lt: new Date(checkOut) } },
            { checkOut: { $gt: new Date(checkIn) } }
        ]
    };

    // PHASE 2: If propertyId given, scope the count to that property only
    if (propertyId) {
        overlapQuery.property = propertyId;
    }

    const overlappingBookings = await Booking.countDocuments(overlapQuery);
    return overlappingBookings < maxCapacity;
};

// ==========================================
// CREATE NEW BOOKING
// ==========================================

// @desc    CREATE NEW BOOKING (public + manager)
// @route   POST /api/bookings
// @access  Public (anonymous guests) — no auth required
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
            customerPhone,
            propertyId      // PHASE 2: Optional — null for legacy bookings
        } = req.body;

        // PHASE 2: Resolve property and propertyType if propertyId is given
        let propertyRef = null;
        let propertyType = null;

        if (propertyId) {
            const property = await Property.findById(propertyId);
            if (!property) {
                return res.status(400).json({ message: 'Invalid propertyId — property not found' });
            }
            propertyRef = property._id;
            propertyType = property.type; // 'campsite' or 'villa'
        }

        // PHASE 5E: BLOCKED DATES CHECK
        if (propertyRef) {
            const blocked = await BlockedDate.findOne({
                property: propertyRef,
                $and: [
                    { startDate: { $lt: new Date(checkOut) } },
                    { endDate: { $gt: new Date(checkIn) } }
                ]
            });
            
            if (blocked) {
                return res.status(400).json({
                    message: `These dates are blocked by the property owner. Reason: ${blocked.reason || 'Not specified'}`
                });
            }
        }

        // CAPACITY CHECK — pass propertyId for scoped check if available
        const hasCapacity = await checkCapacityOverlap(packageType, checkIn, checkOut, propertyRef);
        if (!hasCapacity) {
            return res.status(400).json({
                message: 'Selected package is fully booked for these dates.'
            });
        }

        // VILLA BOOKINGS: Strip food preference — villas don't have food service.
        // Even if frontend sends food data for a villa, we discard it here.
        const isVilla = propertyType === 'villa';

        // CREATE BOOKING
        const booking = await Booking.create({
            packageType: isVilla ? 'Villa Booking' : packageType,
            checkIn,
            checkOut,
            guests,
            vegGuests: isVilla ? 0 : (vegGuests || 0),
            nonVegGuests: isVilla ? 0 : (nonVegGuests || 0),
            foodPreference: isVilla ? undefined : foodPreference,
            customerName,
            customerPhone,
            addedBy: req.user ? req.user._id : undefined,
            property: propertyRef,
            propertyType: propertyType
        });

        // SEND PUSH NOTIFICATION TO OWNERS
        try {
            const webpush = require('web-push');
            webpush.setVapidDetails(
                'mailto:test@example.com',
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
            );

            // Find owners for this property (or managers)
            const User = require('../models/User');
            let owners = [];
            if (propertyRef) {
                owners = await User.find({ role: 'owner', properties: propertyRef });
            }
            
            const payload = JSON.stringify({
                title: 'New Booking Request!',
                body: `${customerName} requested a booking for ${packageType} (${guests} guests).`,
                url: '/owner/dashboard'
            });

            owners.forEach(async (owner) => {
                if (owner.pushSubscription) {
                    try {
                        await webpush.sendNotification(owner.pushSubscription, payload);
                    } catch (pushErr) {
                        console.error('Push error for owner', owner.email, pushErr);
                    }
                }
            });
        } catch (err) {
            console.error('Error in sending push notification', err);
        }

        res.status(201).json(booking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ==========================================
// GET ALL BOOKINGS (with filters)
// ==========================================

// @desc    GET ALL BOOKINGS (with optional date, status, and property filters)
// @route   GET /api/bookings
// @access  Private (Manager and Owner)
// @query   startDate, endDate, status, propertyId
const getAllBookings = async (req, res) => {
    try {
        const { startDate, endDate, status, propertyId } = req.query;
        let query = {};

        // FILTER: Date range
        if (startDate && endDate) {
            query.checkIn = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // FILTER: Status (pending/confirmed/cancelled)
        if (status && ['pending', 'confirmed', 'cancelled'].includes(status)) {
            query.status = status;
        }

        // PHASE 2: FILTER by property
        if (propertyId) {
            query.property = propertyId;
        }

        // PHASE 2: If user is an owner, restrict to their assigned properties ONLY
        // This enforces data isolation — owners cannot see other properties' bookings
        if (req.user && req.user.role === 'owner') {
            const ownerPropertyIds = req.user.properties || [];
            if (ownerPropertyIds.length === 0) {
                // Owner has no properties assigned — return empty
                return res.status(200).json([]);
            }
            // Intersect: if propertyId filter given, validate it's one of theirs
            if (propertyId) {
                const isOwnProperty = ownerPropertyIds.some(p => p.toString() === propertyId);
                if (!isOwnProperty) {
                    return res.status(403).json({ message: 'ACCESS DENIED: Not your property' });
                }
            } else {
                // No propertyId given — scope to all their properties
                query.property = { $in: ownerPropertyIds };
            }
        }

        const bookings = await Booking.find(query)
            .populate('addedBy', 'name email')
            .populate('property', 'name type slug') // PHASE 2: Populate property info
            .sort({ createdAt: -1 });

        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// UPDATE BOOKING STATUS
// ==========================================

// @desc    UPDATE BOOKING STATUS (confirm/cancel)
// @route   PATCH /api/bookings/:id/status
// @access  Private (Manager Only)
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'INVALID STATUS SUPPLIED' });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'BOOKING NOT FOUND' });
        }

        if (status === 'confirmed') {
            // PHASE 5E: BLOCKED DATES CHECK
            if (booking.property) {
                const blocked = await BlockedDate.findOne({
                    property: booking.property,
                    $and: [
                        { startDate: { $lt: new Date(booking.checkOut) } },
                        { endDate: { $gt: new Date(booking.checkIn) } }
                    ]
                });
                
                if (blocked) {
                    return res.status(400).json({
                        message: `Cannot confirm booking. Dates are blocked by owner. Reason: ${blocked.reason || 'Not specified'}`
                    });
                }
            }

            // PHASE 2: Pass property ref for scoped capacity check
            const hasCapacity = await checkCapacityOverlap(
                booking.packageType,
                booking.checkIn,
                booking.checkOut,
                booking.property // May be null for legacy — fallback handled inside
            );

            if (!hasCapacity) {
                return res.status(400).json({
                    message: 'Cannot confirm booking. Capacity exceeded for selected dates.'
                });
            }
        }

        booking.status = status;
        const updatedBooking = await booking.save();

        // PHASE 5D: Push notification to owner on confirm
        if (status === 'confirmed' && booking.property) {
            try {
                const webpush = require('web-push');
                webpush.setVapidDetails(
                    'mailto:test@example.com',
                    process.env.VAPID_PUBLIC_KEY,
                    process.env.VAPID_PRIVATE_KEY
                );
                
                const User = require('../models/User');
                const owners = await User.find({ role: 'owner', properties: booking.property });
                
                const payload = JSON.stringify({
                    title: 'Booking Confirmed!',
                    body: `Booking confirmed for ${booking.customerName} on ${new Date(booking.checkIn).toLocaleDateString()}.`,
                    url: '/owner/dashboard'
                });

                owners.forEach(async (owner) => {
                    if (owner.pushSubscription) {
                        try {
                            await webpush.sendNotification(owner.pushSubscription, payload);
                        } catch (err) {}
                    }
                });
            } catch (err) {}
        }

        res.status(200).json(updatedBooking);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// OWNER RESPOND TO BOOKING
// ==========================================

// @desc    OWNER RESPOND TO BOOKING (Accept / Reject)
// @route   PATCH /api/bookings/:id/owner-response
// @access  Private (Owner Only)
const ownerRespondToBooking = async (req, res) => {
    try {
        const { status, notes } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid response status' });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify owner owns this property
        const ownerPropertyIds = req.user.properties || [];
        if (!booking.property || !ownerPropertyIds.some(p => p.toString() === booking.property.toString())) {
            return res.status(403).json({ message: 'Access denied: not your property' });
        }

        booking.ownerResponse = {
            status,
            notes: notes || '',
            respondedAt: new Date()
        };

        if (status === 'rejected') {
            booking.status = 'cancelled';
            
            // PHASE 5D: Push notification to manager on reject
            try {
                const webpush = require('web-push');
                webpush.setVapidDetails(
                    'mailto:test@example.com',
                    process.env.VAPID_PUBLIC_KEY,
                    process.env.VAPID_PRIVATE_KEY
                );
                
                const User = require('../models/User');
                const managers = await User.find({ role: 'manager' });
                
                const payload = JSON.stringify({
                    title: 'Booking Rejected by Owner',
                    body: `Owner rejected booking for ${booking.customerName}. Reason: ${notes || 'None'}`,
                    url: '/manager/dashboard'
                });

                managers.forEach(async (manager) => {
                    if (manager.pushSubscription) {
                        try {
                            await webpush.sendNotification(manager.pushSubscription, payload);
                        } catch (err) {}
                    }
                });
            } catch (err) {}
        }

        const updatedBooking = await booking.save();
        res.status(200).json(updatedBooking);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// DELETE BOOKING
// ==========================================

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
    ownerRespondToBooking,
    deleteBooking
};
