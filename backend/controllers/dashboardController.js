const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');

// ==========================================
// DASHBOARD STATS — Server-side aggregation
// ==========================================
// Instead of fetching ALL data to the client and counting there,
// this endpoint uses MongoDB aggregation pipelines for O(1) queries.

// @desc    GET dashboard summary stats
// @route   GET /api/dashboard/stats
// @access  Manager only
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // Run all aggregations in parallel
        const [
            propertyStats,
            bookingStats,
            todayCheckIns,
            ownerCount,
            recentBookings
        ] = await Promise.all([
            // Property counts by type and active status
            Property.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: ['$isActive', 1, 0] } },
                        campsites: { $sum: { $cond: [{ $eq: ['$type', 'campsite'] }, 1, 0] } },
                        villas: { $sum: { $cond: [{ $eq: ['$type', 'villa'] }, 1, 0] } }
                    }
                }
            ]),

            // Booking counts by status
            Booking.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Today's confirmed check-ins
            Booking.countDocuments({
                checkIn: { $gte: todayStart, $lt: todayEnd },
                status: 'confirmed'
            }),

            // Owner count
            User.countDocuments({ role: 'owner' }),

            // Recent 5 PENDING bookings (most recent first)
            Booking.find({ status: 'pending' })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('property', 'name type owner')
                .populate({ path: 'property', populate: { path: 'owner', select: 'name' } })
                .lean()
        ]);

        // Reshape booking stats array into object
        const bookingCounts = bookingStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const propData = propertyStats[0] || { total: 0, active: 0, campsites: 0, villas: 0 };

        res.status(200).json({
            properties: {
                total: propData.total,
                active: propData.active,
                campsites: propData.campsites,
                villas: propData.villas
            },
            bookings: {
                pending: bookingCounts.pending || 0,
                confirmed: bookingCounts.confirmed || 0,
                cancelled: bookingCounts.cancelled || 0
            },
            todayCheckIns,
            totalOwners: ownerCount,
            recentPendingBookings: recentBookings
        });
    } catch (error) {
        console.error('[Dashboard Stats Error]', error.message);
        res.status(500).json({ message: 'Failed to load dashboard stats' });
    }
};

module.exports = { getDashboardStats };
