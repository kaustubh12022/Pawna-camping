const Booking = require('../models/Booking');
const Package = require('../models/Package');
const Property = require('../models/Property');
const BlockedDate = require('../models/BlockedDate');
const Revenue = require('../models/Revenue');

// ==========================================
// CAPACITY VALIDATION LOGIC
// ==========================================
// PHASE 2: Updated to support both property-scoped and legacy (global) capacity checks.
// - If propertyId is given: find the package scoped to that property
// - If no propertyId: fallback to old global lookup by package title (preserves live site behaviour)
const checkCapacityOverlap = async (packageType, checkIn, checkOut, propertyId = null, propertyType = null) => {
    let maxCapacity = 0;
    
    // IF VILLA: The whole property is booked at once, so maxCapacity = 1
    if (propertyType === 'villa') {
        maxCapacity = 1;
    } else {
        // If not a villa, rely on Package capacity
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
    }

    // Build overlap query
    const overlapQuery = {
        status: 'confirmed',
        $and: [
            { checkIn: { $lt: new Date(checkOut) } },
            { checkOut: { $gt: new Date(checkIn) } }
        ]
    };

    // If it's a campsite package, filter by packageType. If villa, we just care about the property.
    if (propertyType !== 'villa' && packageType) {
        overlapQuery.packageType = packageType;
    }

    // PHASE 2: If propertyId given, scope the count to that property only
    if (propertyId) {
        overlapQuery.property = propertyId;
    }

    const overlappingBookings = await Booking.countDocuments(overlapQuery);
    return overlappingBookings < maxCapacity;
};

// ==========================================
// SERVER-SIDE PRICING CALCULATION HELPER
// ==========================================
const calculateServerTotalPrice = async ({ property, propertyType, packageType, checkIn, checkOut, guests }) => {
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
        // Campsite package: look up package for this property or global fallback
        let pkg = null;
        if (property?._id) {
            pkg = await Package.findOne({ title: packageType, property: property._id });
        }
        if (!pkg) {
            pkg = await Package.findOne({ title: packageType });
        }
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
            customerEmail,
            totalPrice,     // PHASE 2: Accept calculated total price
            propertyId,      // PHASE 2: Optional — null for legacy bookings
            botField        // Spam prevention honeypot
        } = req.body;

        // SPAM PREVENTION (Honeypot)
        if (botField) {
            // A bot filled in the hidden field
            return res.status(400).json({ message: 'Invalid request payload' });
        }

        // PHONE NUMBER FORMAT VALIDATION (10-digit Indian format /^[6-9]\d{9}$/)
        const cleanPhone = (customerPhone || '').toString().replace(/[\s+-]/g, '');
        const normalizedPhone = cleanPhone.length > 10 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;
        if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
            return res.status(400).json({ message: 'Please enter a valid 10-digit Indian phone number starting with 6-9' });
        }

        // PAST DATE VALIDATION
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDate = new Date(checkIn);
        checkInDate.setHours(0, 0, 0, 0);
        if (checkInDate < today) {
            return res.status(400).json({ message: 'Check-in date cannot be in the past' });
        }

        // PHASE 2: Resolve property and propertyType if propertyId is given
        let propertyRef = null;
        let propertyType = null;
        let propertyDoc = null;

        if (propertyId) {
            propertyDoc = await Property.findById(propertyId);
            if (!propertyDoc) {
                return res.status(400).json({ message: 'Invalid propertyId — property not found' });
            }
            propertyRef = propertyDoc._id;
            propertyType = propertyDoc.type; // 'campsite' or 'villa'

            // CAPACITY CHECK: Validate guests against property.maxGuests
            if (propertyDoc.maxGuests && Number(guests) > propertyDoc.maxGuests) {
                return res.status(400).json({
                    message: `Number of guests (${guests}) exceeds maximum capacity of ${propertyDoc.maxGuests} for this property`
                });
            }
        }

        // PHASE 5E: BLOCKED DATES CHECK (Fixed single-day overlap with $gte)
        if (propertyRef) {
            const blocked = await BlockedDate.findOne({
                property: propertyRef,
                $and: [
                    { startDate: { $lt: new Date(checkOut) } },
                    { endDate: { $gte: new Date(checkIn) } }
                ]
            });
            
            if (blocked) {
                return res.status(400).json({
                    message: 'Sorry, these dates are already booked.'
                });
            }
        }

        // CAPACITY CHECK — pass propertyId for scoped check if available
        const hasCapacity = await checkCapacityOverlap(packageType, checkIn, checkOut, propertyRef, propertyType);
        if (!hasCapacity) {
            return res.status(400).json({
                message: 'Selected package is fully booked for these dates.'
            });
        }

        // SERVER-SIDE TOTAL PRICE CALCULATION & VERIFICATION
        let finalPrice = Number(totalPrice) || 0;
        if (propertyDoc) {
            const calculatedServerPrice = await calculateServerTotalPrice({
                property: propertyDoc,
                propertyType,
                packageType,
                checkIn,
                checkOut,
                guests: Number(guests)
            });

            if (calculatedServerPrice > 0) {
                const isManager = req.user && req.user.role === 'manager';
                // Public users or submissions with 0/tampered price are strictly overridden
                if (!isManager || !totalPrice) {
                    finalPrice = calculatedServerPrice;
                }
            }
        }

        // CAMPSITE MEAL COUNT PARITY
        // Defensive check: meal counts cannot be negative
        if (!(Number(vegGuests || 0) >= 0 && Number(nonVegGuests || 0) >= 0)) {
            return res.status(400).json({ message: 'Meal counts cannot be negative' });
        }

        // For campsites, veg + non-veg meals must equal the guest count
        const isVilla = propertyType === 'villa' || packageType === 'Villa Booking';
        if (!isVilla) {
            const totalMeals = (Number(vegGuests) || 0) + (Number(nonVegGuests) || 0);
            if (totalMeals !== Number(guests)) {
                return res.status(400).json({
                    message: `Total veg and non-veg meals (${totalMeals}) must match the number of guests (${guests})`
                });
            }
        }

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
            customerPhone: normalizedPhone,
            customerEmail: customerEmail ? customerEmail.trim() : undefined,
            totalPrice: finalPrice,
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

            const pushPromises = owners
                .filter(owner => owner.pushSubscription)
                .map(owner => webpush.sendNotification(owner.pushSubscription, payload)
                    .catch(pushErr => console.error('Push error for owner', owner.email, pushErr))
                );
            await Promise.allSettled(pushPromises);
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
            .sort({ createdAt: -1 })
            .lean();

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
        const { status, amount, commission } = req.body;

        if (!['confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'INVALID STATUS SUPPLIED' });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'BOOKING NOT FOUND' });
        }

        if (booking.status === status) {
            return res.status(400).json({ message: `Booking is already ${status}` });
        }

        if (status === 'confirmed') {
            // PHASE 5E: BLOCKED DATES CHECK (Fixed single-day overlap with $gte)
            if (booking.property) {
                const blocked = await BlockedDate.findOne({
                    property: booking.property,
                    $and: [
                        { startDate: { $lt: new Date(booking.checkOut) } },
                        { endDate: { $gte: new Date(booking.checkIn) } }
                    ]
                });
                
                if (blocked) {
                    return res.status(400).json({
                        message: 'Cannot confirm booking. Sorry, these dates are already booked.'
                    });
                }
            }

            // PHASE 2: Pass property ref for scoped capacity check
            const hasCapacity = await checkCapacityOverlap(
                booking.packageType,
                booking.checkIn,
                booking.checkOut,
                booking.property, // May be null for legacy — fallback handled inside
                booking.propertyType
            );

            if (!hasCapacity) {
                return res.status(400).json({
                    message: 'Cannot confirm booking. Capacity exceeded for selected dates.'
                });
            }

            // Create Revenue if amounts are provided
            if (amount !== undefined && commission !== undefined && booking.property) {
                await Revenue.create({
                    property: booking.property,
                    bookingRef: booking._id,
                    amount: amount,
                    commission: commission,
                    date: new Date(),
                    addedBy: req.user._id,
                    notes: `Automated entry on booking confirmation for ${booking.customerName}`
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
