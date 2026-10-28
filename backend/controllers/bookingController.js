const Booking = require('../models/Booking');
const Package = require('../models/Package');
const Property = require('../models/Property');
const BlockedDate = require('../models/BlockedDate');
const Revenue = require('../models/Revenue');
const { audit } = require('../utils/audit');
const {
    optionalString,
    optionalInt,
    optionalNumber,
    optionalObjectId,
    parsePagination
} = require('../utils/validate');

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
            // SECURITY: a package we cannot resolve has no known capacity.
            // The previous version returned `true` here, which silently
            // allowed unlimited overbooking for any unrecognised packageType.
            return false;
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
// ---------------------------------------------------------------
// PRICING IS SERVER-AUTHORITATIVE
//  * The browser no longer has any influence over the amount stored.
//  * The previous version accepted `totalPrice` from the request and only
//    overrode it when the server could compute a price > 0. Sending an
//    unknown `packageType` made the server compute 0, so the client value
//    (₹1) was persisted. Any unrecognised input now rejects the booking.
//  * A manager override exists, but it must be explicit (`overridePrice`)
//    and is only reachable on the authenticated manager route.
// ---------------------------------------------------------------
const createBooking = async (req, res) => {
    try {
        const isManager = req.user && req.user.role === 'manager';

        const packageType = optionalString(req.body?.packageType, 80);
        const customerName = optionalString(req.body?.customerName, 100);
        const customerEmail = optionalString(req.body?.customerEmail, 254);
        const foodPreference = optionalString(req.body?.foodPreference, 10);
        const propertyId = optionalObjectId(req.body?.propertyId);

        // ---- SPAM PREVENTION (Honeypot) ----
        // Silent success: a bot should not learn that it was detected.
        if (req.body?.botField) {
            return res.status(201).json({ message: 'Booking received' });
        }

        // ---- REQUIRED FIELDS ----
        if (!customerName || customerName.length < 2) {
            return res.status(400).json({ message: 'Please enter your full name' });
        }
        if (!packageType) {
            return res.status(400).json({ message: 'Please select a package' });
        }
        if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        // ---- PHONE NUMBER (10-digit Indian format) ----
        const rawPhone = req.body?.customerPhone;
        if (typeof rawPhone !== 'string' && typeof rawPhone !== 'number') {
            return res.status(400).json({ message: 'Please enter a valid phone number' });
        }
        const cleanPhone = String(rawPhone).replace(/[\s+-]/g, '');
        const normalizedPhone = cleanPhone.length > 10 && cleanPhone.startsWith('91')
            ? cleanPhone.slice(2)
            : cleanPhone;
        if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
            return res.status(400).json({ message: 'Please enter a valid 10-digit Indian phone number starting with 6-9' });
        }

        // ---- DATES ----
        const checkInDate = new Date(req.body?.checkIn);
        const checkOutDate = new Date(req.body?.checkOut);
        if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
            return res.status(400).json({ message: 'Please select valid check-in and check-out dates' });
        }
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (checkInDate < today) {
            return res.status(400).json({ message: 'Check-in date cannot be in the past' });
        }

        const nights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights < 1) {
            return res.status(400).json({ message: 'Check-out must be at least one night after check-in' });
        }
        if (nights > 30) {
            return res.status(400).json({ message: 'Bookings longer than 30 nights must be arranged with the host' });
        }
        if (checkInDate.getTime() - today.getTime() > 365 * 24 * 60 * 60 * 1000) {
            return res.status(400).json({ message: 'Bookings can only be made up to one year in advance' });
        }

        // ---- GUESTS ----
        const guests = optionalInt(req.body?.guests, { min: 1, max: 100 });
        if (guests === null) {
            return res.status(400).json({ message: 'Please enter a valid number of guests' });
        }

        const vegGuests = optionalInt(req.body?.vegGuests, { min: 0, max: 100 }) ?? 0;
        const nonVegGuests = optionalInt(req.body?.nonVegGuests, { min: 0, max: 100 }) ?? 0;

        // ---- PROPERTY (required for every public booking) ----
        let propertyRef = null;
        let propertyType = null;
        let propertyDoc = null;

        if (!propertyId && !isManager) {
            return res.status(400).json({ message: 'Please select a property before booking' });
        }

        if (propertyId) {
            propertyDoc = await Property.findById(propertyId);
            if (!propertyDoc) {
                return res.status(404).json({ message: 'Property not found' });
            }
            if (!isManager && propertyDoc.isActive === false) {
                return res.status(404).json({ message: 'This property is not currently accepting bookings' });
            }
            propertyRef = propertyDoc._id;
            propertyType = propertyDoc.type;

            if (propertyDoc.maxGuests && guests > propertyDoc.maxGuests) {
                return res.status(400).json({
                    message: `Number of guests (${guests}) exceeds the maximum capacity of ${propertyDoc.maxGuests} for this property`
                });
            }
        }

        // ---- PACKAGE RESOLUTION (strict) ----
        // A campsite booking is only valid against a package that exists for
        // that property (or a global legacy package). Villas are priced from
        // the property itself.
        const isVilla = propertyType === 'villa' || packageType === 'Villa Booking';
        let resolvedPackage = null;

        if (!isVilla && propertyRef) {
            resolvedPackage = await Package.findOne({
                title: packageType,
                $or: [{ property: propertyRef }, { property: null }]
            });

            if (!resolvedPackage) {
                // Legacy fallback: global packages created before multi-property support.
                resolvedPackage = await Package.findOne({ title: packageType });
            }

            if (!resolvedPackage) {
                return res.status(400).json({ message: 'The selected package is no longer available' });
            }
        }

        // ---- BLOCKED DATES ----
        if (propertyRef) {
            const blocked = await BlockedDate.findOne({
                property: propertyRef,
                $and: [
                    { startDate: { $lt: checkOutDate } },
                    { endDate: { $gte: checkInDate } }
                ]
            });

            if (blocked) {
                return res.status(409).json({ message: 'Sorry, these dates are already booked.' });
            }
        }

        // ---- CAPACITY ----
        const hasCapacity = await checkCapacityOverlap(
            packageType,
            checkInDate,
            checkOutDate,
            propertyRef,
            propertyType
        );
        if (!hasCapacity) {
            return res.status(409).json({ message: 'The selected package is fully booked for these dates.' });
        }

        // ---- AUTHORITATIVE PRICE ----
        // `req.body.totalPrice` is only read on the authenticated manager
        // route, and only when the caller explicitly opts into an override.
        let finalPrice = 0;

        const managerOverride = isManager
            && req.body?.overridePrice === true
            && optionalNumber(req.body?.totalPrice, { min: 0, max: 10000000 }) !== null;

        if (managerOverride) {
            finalPrice = optionalNumber(req.body.totalPrice, { min: 0, max: 10000000 });
        } else {
            const calculatedServerPrice = await calculateServerTotalPrice({
                property: propertyDoc,
                propertyType,
                packageType,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                guests
            });

            if (!Number.isFinite(calculatedServerPrice) || calculatedServerPrice <= 0) {
                return res.status(409).json({
                    message: 'Pricing for this stay is not available. Please contact us to complete the booking.'
                });
            }

            finalPrice = Math.round(calculatedServerPrice);
        }

        if (finalPrice > 10000000) {
            return res.status(400).json({ message: 'The calculated amount is unexpectedly high. Please contact us.' });
        }

        // CAMPSITE MEAL COUNT PARITY
        if (!isVilla) {
            const totalMeals = vegGuests + nonVegGuests;
            if (totalMeals !== guests) {
                return res.status(400).json({
                    message: `Total veg and non-veg meals (${totalMeals}) must match the number of guests (${guests})`
                });
            }
        }

        // CREATE BOOKING
        const booking = await Booking.create({
            packageType: isVilla ? 'Villa Booking' : packageType,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests,
            vegGuests: isVilla ? 0 : vegGuests,
            nonVegGuests: isVilla ? 0 : nonVegGuests,
            foodPreference: isVilla ? undefined : (['Veg', 'Non-Veg', 'N/A'].includes(foodPreference) ? foodPreference : undefined),
            customerName,
            customerPhone: normalizedPhone,
            customerEmail: customerEmail || undefined,
            totalPrice: finalPrice,
            addedBy: req.user ? req.user._id : undefined,
            property: propertyRef,
            propertyType: propertyType
        });

        audit(req, 'booking.created', {
            targetId: booking._id,
            targetType: 'Booking',
            meta: {
                propertyId: propertyRef ? String(propertyRef) : null,
                totalPrice: finalPrice,
                nights,
                guests,
                managerOverride
            }
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
        console.error('[ BOOKING ] create failed:', error.message);
        return res.status(500).json({ message: 'Unable to create the booking right now. Please try again.' });
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
        const startDate = optionalString(req.query.startDate, 40);
        const endDate = optionalString(req.query.endDate, 40);
        const status = optionalString(req.query.status, 20);
        const propertyId = optionalObjectId(req.query.propertyId);
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, maxLimit: 500 });

        let query = {};

        // FILTER: Date range
        if (startDate && endDate) {
            const from = new Date(startDate);
            const to = new Date(endDate);
            if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
                return res.status(400).json({ message: 'Invalid date range' });
            }
            query.checkIn = { $gte: from, $lte: to };
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
                res.set('X-Total-Count', '0');
                return res.status(200).json([]);
            }
            if (propertyId) {
                const isOwnProperty = ownerPropertyIds.some(p => p.toString() === propertyId);
                if (!isOwnProperty) {
                    return res.status(403).json({ message: 'ACCESS DENIED: Not your property' });
                }
            } else {
                query.property = { $in: ownerPropertyIds };
            }
        }

        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .populate('addedBy', 'name email')
            .populate('property', 'name type slug') // PHASE 2: Populate property info
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Kept as a bare array for backwards compatibility with the current
        // dashboard, with pagination metadata in headers.
        res.set('X-Total-Count', String(total));
        res.set('X-Page', String(page));
        res.set('X-Page-Limit', String(limit));
        res.status(200).json(bookings);
    } catch (error) {
        console.error('[ BOOKING ] list failed:', error.message);
        return res.status(500).json({ message: 'Unable to load bookings' });
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

        const amount = optionalNumber(req.body?.amount, { min: 0, max: 10000000 });
        const commission = optionalNumber(req.body?.commission, { min: 0, max: 10000000 });

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
            if (amount !== null && commission !== null && booking.property) {
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
        audit(req, 'booking.status_changed', {
            targetId: booking._id,
            targetType: 'Booking',
            meta: { status }
        });

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
        console.error('[ BOOKING ] status update failed:', error.message);
        return res.status(500).json({ message: 'Unable to update the booking' });
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
        console.error('[ BOOKING ] owner response failed:', error.message);
        return res.status(500).json({ message: 'Unable to record your response' });
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
        console.error('[ BOOKING ] delete failed:', error.message);
        return res.status(500).json({ message: 'Unable to delete the booking' });
    }
};

module.exports = {
    createBooking,
    getAllBookings,
    updateBookingStatus,
    ownerRespondToBooking,
    deleteBooking
};
