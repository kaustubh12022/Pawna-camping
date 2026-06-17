const Booking = require('../models/Booking');
const mongoose = require('mongoose');

// ==========================================
// HELPER: Build base match stage for aggregations
// ==========================================
// PHASE 2: Now supports optional propertyId AND owner-scoped property filtering.
// Preserved: date filter, confirmed-only filter.
const buildMatchStage = (query, userPropertyIds = null) => {
    const matchStage = { status: 'confirmed' };

    // DATE FILTER (existing behaviour preserved)
    if (query.date) {
        const targetDate = new Date(query.date);
        if (!isNaN(targetDate.getTime())) {
            matchStage.checkIn = { $lte: targetDate };
            matchStage.checkOut = { $gt: targetDate };
        }
    }

    // PHASE 2: PROPERTY FILTER
    if (query.propertyId) {
        // Specific property requested
        matchStage.property = new mongoose.Types.ObjectId(query.propertyId);
    } else if (userPropertyIds && userPropertyIds.length > 0) {
        // Owner scope: restrict to all their properties
        matchStage.property = {
            $in: userPropertyIds.map(id => new mongoose.Types.ObjectId(id.toString()))
        };
    }
    // If no propertyId and no userPropertyIds: global (manager, no scope)

    return matchStage;
};

// ==========================================
// HELPER: Resolve property scope for request user
// ==========================================
// Returns array of property ObjectIds if user is an owner, else null (= global)
const resolvePropertyScope = (req) => {
    if (req.user && req.user.role === 'owner') {
        return req.user.properties || [];
    }
    return null; // Managers see all
};

// ==========================================
// OVERVIEW ANALYTICS
// ==========================================

// @desc    GET OVERVIEW METRICS (Total Bookings & Total Guests)
// @route   GET /api/analytics/overview
// @access  Owner (property-scoped) + Manager (global or scoped by ?propertyId=)
// @query   date (optional), propertyId (optional for manager)
const getOverviewAnalytics = async (req, res) => {
    try {
        const userPropertyIds = resolvePropertyScope(req);
        const matchStage = buildMatchStage(req.query, userPropertyIds);

        const result = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    totalGuests: { $sum: '$guests' },
                    totalNights: { $sum: '$nights' }  // PHASE 2: Added nights tracking
                }
            }
        ]);

        if (result.length > 0) {
            res.status(200).json({
                totalBookings: result[0].totalBookings,
                totalGuests: result[0].totalGuests,
                totalNights: result[0].totalNights || 0
            });
        } else {
            res.status(200).json({ totalBookings: 0, totalGuests: 0, totalNights: 0 });
        }
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// FOOD ANALYTICS
// ==========================================

// @desc    GET FOOD PREFERENCE DISTRIBUTION
// @route   GET /api/analytics/food
// @access  Owner (property-scoped) + Manager (global or scoped)
// @query   date (optional), propertyId (optional)
const getFoodAnalytics = async (req, res) => {
    try {
        const userPropertyIds = resolvePropertyScope(req);
        const matchStage = buildMatchStage(req.query, userPropertyIds);

        const result = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalVeg: { $sum: '$vegGuests' },
                    totalNonVeg: { $sum: '$nonVegGuests' }
                }
            }
        ]);

        let vegCount = 0;
        let nonVegCount = 0;

        if (result.length > 0) {
            vegCount = result[0].totalVeg || 0;
            nonVegCount = result[0].totalNonVeg || 0;
        }

        res.status(200).json([
            { name: 'Veg', value: vegCount },
            { name: 'Non-Veg', value: nonVegCount }
        ]);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// PACKAGE ANALYTICS
// ==========================================

// @desc    GET PACKAGE POPULARITY DISTRIBUTION
// @route   GET /api/analytics/packages
// @access  Owner (property-scoped) + Manager (global or scoped)
// @query   date (optional), propertyId (optional)
const getPackageAnalytics = async (req, res) => {
    try {
        const userPropertyIds = resolvePropertyScope(req);
        const matchStage = buildMatchStage(req.query, userPropertyIds);

        const result = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$packageType',
                    count: { $sum: 1 },
                    totalGuests: { $sum: '$guests' }  // PHASE 2: Also track guests per package
                }
            },
            { $sort: { count: -1 } }
        ]);

        const formattedResult = result.map(item => ({
            name: item._id,
            value: item.count,
            totalGuests: item.totalGuests
        }));

        res.status(200).json(formattedResult);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// MONTHLY ANALYTICS
// ==========================================

// @desc    GET MONTHLY BOOKING TRENDS
// @route   GET /api/analytics/monthly
// @access  Owner (property-scoped) + Manager (global or scoped)
// @query   propertyId (optional), year (optional — defaults to current year)
const getMonthlyAnalytics = async (req, res) => {
    try {
        const userPropertyIds = resolvePropertyScope(req);
        // Monthly trends don't use date filter — use property scope only
        const matchStage = buildMatchStage({ propertyId: req.query.propertyId }, userPropertyIds);

        // PHASE 2: Support year filter (default: current year)
        const year = parseInt(req.query.year) || new Date().getFullYear();
        matchStage.createdAt = {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31T23:59:59`)
        };

        const result = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    bookings: { $sum: 1 },
                    guests: { $sum: '$guests' }  // PHASE 2: Also track monthly guest count
                }
            },
            { $sort: { _id: 1 } } // Chronological for line chart
        ]);

        const formattedResult = result.map(item => ({
            month: item._id,
            bookings: item.bookings,
            guests: item.guests
        }));

        res.status(200).json(formattedResult);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// PHASE 2: NEW — PROPERTY PERFORMANCE ANALYTICS
// ==========================================

// @desc    GET BOOKING COUNTS GROUPED BY PROPERTY
// @route   GET /api/analytics/properties
// @access  Manager only
// @query   startDate, endDate (optional)
const getPropertyAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const matchStage = { status: 'confirmed', property: { $ne: null } };

        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const result = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$property',
                    bookings: { $sum: 1 },
                    guests: { $sum: '$guests' },
                    nights: { $sum: '$nights' }
                }
            },
            {
                $lookup: {
                    from: 'properties',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'propertyInfo'
                }
            },
            { $unwind: { path: '$propertyInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    propertyId: '$_id',
                    propertyName: '$propertyInfo.name',
                    propertyType: '$propertyInfo.type',
                    bookings: 1,
                    guests: 1,
                    nights: 1
                }
            },
            { $sort: { bookings: -1 } }
        ]);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// OWNER REVENUE (strips commission)
// ==========================================

// @desc    GET OWNER REVENUE ENTRIES
// @route   GET /api/analytics/owner-revenue
// @access  Owner (property-scoped)
// @query   date (optional), propertyId (optional)
const getOwnerRevenue = async (req, res) => {
    try {
        const Revenue = require('../models/Revenue');
        const userPropertyIds = resolvePropertyScope(req);
        
        let targetPropertyIds = userPropertyIds;
        if (req.query.propertyId) {
            // Ensure the requested property is actually owned by the user
            if (userPropertyIds.some(id => id.toString() === req.query.propertyId)) {
                targetPropertyIds = [req.query.propertyId];
            } else {
                return res.status(403).json({ message: 'Access denied for this property' });
            }
        }
        
        const objectIdTargets = targetPropertyIds.map(id => new mongoose.Types.ObjectId(id.toString()));
        
        const bookingMatch = {
            property: { $in: objectIdTargets },
            status: { $ne: 'cancelled' }
        };
        
        const revenueMatch = {
            property: { $in: objectIdTargets }
        };

        if (req.query.date) {
            const targetDate = new Date(req.query.date);
            if (!isNaN(targetDate.getTime())) {
                bookingMatch.checkIn = { $lte: targetDate };
                bookingMatch.checkOut = { $gt: targetDate };
                
                const startOfDay = new Date(targetDate.setHours(0,0,0,0));
                const endOfDay = new Date(targetDate.setHours(23,59,59,999));
                revenueMatch.date = { $gte: startOfDay, $lte: endOfDay };
            }
        }

        // Find all Bookings for these properties (excluding cancelled ones)
        const bookings = await Booking.find(bookingMatch)
            .populate('property', 'name type')
            .sort({ createdAt: -1 });

        // Find all Revenue entries for these properties to map exact commission
        const revenues = await Revenue.find(revenueMatch)
            .populate('property', 'name type');

        // Map bookingId to its exact commission AND amount
        const revenueMap = {};
        revenues.forEach(rev => {
            if (rev.bookingRef) {
                revenueMap[rev.bookingRef.toString()] = {
                    commission: rev.commission,
                    amount: rev.amount
                };
            }
        });

        const formattedRevenues = [];

        // 1. Add all valid Bookings
        for (let booking of bookings) {
            // Use exact amount/commission if manager confirmed it, otherwise use totalPrice and estimate 15%
            const revData = revenueMap[booking._id.toString()];
            
            const bookingAmount = revData !== undefined ? revData.amount : booking.totalPrice;
            const platformCommission = revData !== undefined ? revData.commission : (booking.totalPrice * 0.15);
            
            formattedRevenues.push({
                _id: booking._id,
                date: booking.createdAt,
                property: booking.property,
                booking: {
                    customerName: booking.customerName,
                    guests: booking.guests,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                    status: booking.status
                },
                ownerEarnings: bookingAmount - platformCommission
            });
        }

        // 2. Add manual Revenue entries that have NO associated booking
        revenues.forEach(rev => {
            if (!rev.bookingRef) {
                formattedRevenues.push({
                    _id: rev._id,
                    date: rev.date,
                    property: rev.property,
                    booking: null,
                    ownerEarnings: rev.amount - rev.commission
                });
            }
        });

        // Sort descending by date
        formattedRevenues.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(formattedRevenues);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

module.exports = {
    getOverviewAnalytics,
    getFoodAnalytics,
    getPackageAnalytics,
    getMonthlyAnalytics,
    getPropertyAnalytics,
    getOwnerRevenue
};
