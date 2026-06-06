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
        
        const matchStage = { property: { $ne: null } };
        
        if (req.query.date) {
            const targetDate = new Date(req.query.date);
            if (!isNaN(targetDate.getTime())) {
                matchStage.date = { 
                    $gte: new Date(targetDate.setHours(0,0,0,0)),
                    $lte: new Date(targetDate.setHours(23,59,59,999))
                };
            }
        }

        if (req.query.propertyId) {
            matchStage.property = new mongoose.Types.ObjectId(req.query.propertyId);
        } else if (userPropertyIds && userPropertyIds.length > 0) {
            matchStage.property = {
                $in: userPropertyIds.map(id => new mongoose.Types.ObjectId(id.toString()))
            };
        }

        const revenues = await Revenue.find(matchStage)
            .populate('property', 'name type')
            .populate('booking', 'customerName guests checkIn checkOut')
            .sort({ date: -1 });

        // Strip commission! Owner earning = amount - commission
        const formattedRevenues = revenues.map(rev => {
            const obj = rev.toObject();
            obj.ownerEarnings = obj.amount - obj.commission;
            delete obj.commission;
            delete obj.amount; // Hide total amount to avoid confusion, they only care about their cut
            return obj;
        });

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
