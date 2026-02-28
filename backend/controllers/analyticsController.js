const Booking = require('../models/Booking');

// ==========================================
// HELPER LOGIC
// ==========================================
const buildDateMatchStage = (dateQuery) => {
    const matchStage = { status: 'confirmed' };

    if (dateQuery) {
        const targetDate = new Date(dateQuery);
        // DEFENSIVE CHECK: ONLY APPLY IF DATE IS VALID
        if (!isNaN(targetDate.getTime())) {
            // OCCUPANCY LOGIC: checkIn <= targetDate AND checkOut > targetDate 
            matchStage.checkIn = { $lte: targetDate };
            // $gt ensures the guest checking out today is not counted as "present" tonight
            matchStage.checkOut = { $gt: targetDate };
        }
    }

    return matchStage;
};

// ==========================================
// OWNER ONLY LOGIC
// ==========================================

// @desc    GET OVERVIEW METRICS (Total Bookings & Total Guests)
// @route   GET /api/analytics/overview
// @access  Owner ONLY
const getOverviewAnalytics = async (req, res) => {
    try {
        const matchStage = buildDateMatchStage(req.query.date);

        const result = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    totalGuests: { $sum: "$guests" }
                }
            }
        ]);

        if (result.length > 0) {
            res.status(200).json({
                totalBookings: result[0].totalBookings,
                totalGuests: result[0].totalGuests
            });
        } else {
            res.status(200).json({ totalBookings: 0, totalGuests: 0 });
        }
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    GET FOOD PREFERENCE DISTRIBUTION
// @route   GET /api/analytics/food
// @access  Owner ONLY
const getFoodAnalytics = async (req, res) => {
    try {
        const matchStage = buildDateMatchStage(req.query.date);

        const result = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalVeg: { $sum: "$vegGuests" },
                    totalNonVeg: { $sum: "$nonVegGuests" }
                }
            }
        ]);

        let vegCount = 0;
        let nonVegCount = 0;

        // BIND VALUES FROM AGGREGATION
        if (result.length > 0) {
            vegCount = result[0].totalVeg || 0;
            nonVegCount = result[0].totalNonVeg || 0;
        }

        res.status(200).json([
            { name: "Veg", value: vegCount },
            { name: "Non-Veg", value: nonVegCount }
        ]);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    GET PACKAGE POPULARITY DISTRIBUTION
// @route   GET /api/analytics/packages
// @access  Owner ONLY
const getPackageAnalytics = async (req, res) => {
    try {
        const matchStage = buildDateMatchStage(req.query.date);

        const result = await Booking.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$packageType",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const formattedResult = result.map(item => ({
            name: item._id,
            value: item.count
        }));

        res.status(200).json(formattedResult);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    GET MONTHLY BOOKING TRENDS
// @route   GET /api/analytics/monthly
// @access  Owner ONLY
const getMonthlyAnalytics = async (req, res) => {
    try {
        const result = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    bookings: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // CRITICAL: SORT CHRONOLOGICALLY FOR LINE CHART
        ]);

        const formattedResult = result.map(item => ({
            month: item._id,
            bookings: item.bookings
        }));

        res.status(200).json(formattedResult);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

module.exports = {
    getOverviewAnalytics,
    getFoodAnalytics,
    getPackageAnalytics,
    getMonthlyAnalytics
};
