const Revenue = require('../models/Revenue');
const Property = require('../models/Property');
const mongoose = require('mongoose');

// ==========================================
// PHASE 3: REVENUE CRUD CONTROLLER
// ==========================================
// All CRUD endpoints are manager-only.
// Revenue analytics are also manager-only per Phase 3 scope.
// ==========================================


// ==========================================
// HELPER: Build date range from period string
// ==========================================
// period = 'day' | 'week' | 'month' | 'year' | custom (startDate + endDate)
const buildDateRange = (query) => {
    const { period, startDate, endDate, date } = query;

    if (startDate && endDate) {
        return {
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
        };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'day' || date) {
        const targetDate = date ? new Date(date) : today;
        return {
            $gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
            $lte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999)
        };
    }

    if (period === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        return { $gte: weekStart, $lte: now };
    }

    if (period === 'month') {
        return {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lte: now
        };
    }

    if (period === 'year') {
        return {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lte: now
        };
    }

    return null; // No date filter → all time
};


// ==========================================
// REVENUE CRUD
// ==========================================

// @desc    CREATE A REVENUE ENTRY
// @route   POST /api/revenue
// @access  Manager only
const createRevenue = async (req, res) => {
    try {
        const { property, amount, commission, date, notes, bookingRef } = req.body;

        // ---- VALIDATE REQUIRED FIELDS ----
        if (!property) {
            return res.status(400).json({ message: 'Property ID is required' });
        }
        if (amount === undefined || amount === null || amount < 0) {
            return res.status(400).json({ message: 'A valid amount (>= 0) is required' });
        }
        if (commission === undefined || commission === null || commission < 0) {
            return res.status(400).json({ message: 'A valid commission (>= 0) is required' });
        }
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        // ---- VALIDATE PROPERTY EXISTS ----
        const propertyExists = await Property.findById(property).select('_id name');
        if (!propertyExists) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // ---- CREATE ENTRY ----
        const revenue = await Revenue.create({
            property,
            amount: Number(amount),
            commission: Number(commission),
            date: new Date(date),
            notes: notes || '',
            bookingRef: bookingRef || null,
            addedBy: req.user._id
        });

        const populated = await Revenue.findById(revenue._id)
            .populate('property', 'name type slug')
            .populate('addedBy', 'name email')
            .populate('bookingRef', 'customerName checkIn checkOut guests');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    LIST ALL REVENUE ENTRIES (with filters)
// @route   GET /api/revenue
// @access  Manager only
// @query   propertyId (optional), period (day|week|month|year), startDate, endDate, category
const getAllRevenue = async (req, res) => {
    try {
        const { propertyId, page = 1, limit = 50 } = req.query;

        const filter = {};

        if (propertyId) {
            filter.property = new mongoose.Types.ObjectId(propertyId);
        }


        const dateRange = buildDateRange(req.query);
        if (dateRange) {
            filter.date = dateRange;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [entries, total] = await Promise.all([
            Revenue.find(filter)
                .populate('property', 'name type slug')
                .populate('addedBy', 'name')
                .populate('bookingRef', 'customerName checkIn checkOut')
                .sort({ date: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Revenue.countDocuments(filter)
        ]);

        res.status(200).json({
            entries,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    GET A SINGLE REVENUE ENTRY BY ID
// @route   GET /api/revenue/:id
// @access  Manager only
const getRevenueById = async (req, res) => {
    try {
        const entry = await Revenue.findById(req.params.id)
            .populate('property', 'name type slug')
            .populate('addedBy', 'name email')
            .populate('bookingRef', 'customerName checkIn checkOut guests');

        if (!entry) {
            return res.status(404).json({ message: 'Revenue entry not found' });
        }

        res.status(200).json(entry);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    UPDATE A REVENUE ENTRY
// @route   PUT /api/revenue/:id
// @access  Manager only
const updateRevenue = async (req, res) => {
    try {
        const entry = await Revenue.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ message: 'Revenue entry not found' });
        }

        const { property, amount, commission, date, notes, bookingRef } = req.body;

        // ---- VALIDATE PROPERTY IF CHANGING ----
        if (property && property !== entry.property.toString()) {
            const propertyExists = await Property.findById(property).select('_id');
            if (!propertyExists) {
                return res.status(404).json({ message: 'Property not found' });
            }
            entry.property = property;
        }

        if (amount !== undefined) entry.amount = Number(amount);
        if (commission !== undefined) entry.commission = Number(commission);
        if (date) entry.date = new Date(date);
        if (notes !== undefined) entry.notes = notes;

        if (bookingRef !== undefined) entry.bookingRef = bookingRef || null;

        await entry.save();

        const updated = await Revenue.findById(entry._id)
            .populate('property', 'name type slug')
            .populate('addedBy', 'name email')
            .populate('bookingRef', 'customerName checkIn checkOut');

        res.status(200).json({ message: 'Revenue entry updated', entry: updated });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    DELETE A REVENUE ENTRY
// @route   DELETE /api/revenue/:id
// @access  Manager only
const deleteRevenue = async (req, res) => {
    try {
        const entry = await Revenue.findById(req.params.id);
        if (!entry) {
            return res.status(404).json({ message: 'Revenue entry not found' });
        }

        await entry.deleteOne();

        res.status(200).json({
            message: 'Revenue entry deleted successfully',
            id: req.params.id
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// ==========================================
// REVENUE ANALYTICS
// ==========================================

// @desc    GET REVENUE SUMMARY (total amount, commission, net, count)
// @route   GET /api/revenue/analytics/summary
// @access  Manager only
// @query   propertyId (optional), period (day|week|month|year), startDate, endDate
const getRevenueSummary = async (req, res) => {
    try {
        const { propertyId } = req.query;
        const matchStage = {};

        if (propertyId) {
            matchStage.property = new mongoose.Types.ObjectId(propertyId);
        }

        const dateRange = buildDateRange(req.query);
        if (dateRange) {
            matchStage.date = dateRange;
        }

        const result = await Revenue.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    totalCommission: { $sum: '$commission' },
                    count: { $sum: 1 }
                }
            }
        ]);

        if (result.length === 0) {
            return res.status(200).json({
                totalAmount: 0,
                totalCommission: 0,
                netToOwner: 0,
                count: 0
            });
        }

        const { totalAmount, totalCommission, count } = result[0];
        res.status(200).json({
            totalAmount,
            totalCommission,
            netToOwner: totalAmount - totalCommission,
            count
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    GET REVENUE TRENDS (grouped by day/week/month)
// @route   GET /api/revenue/analytics/trends
// @access  Manager only
// @query   groupBy (day|week|month), propertyId (optional), startDate, endDate, year
const getRevenueTrends = async (req, res) => {
    try {
        const { propertyId, groupBy = 'month', year } = req.query;
        const matchStage = {};

        if (propertyId) {
            matchStage.property = new mongoose.Types.ObjectId(propertyId);
        }

        const dateRange = buildDateRange(req.query);
        if (dateRange) {
            matchStage.date = dateRange;
        } else if (year) {
            // If no range given but year is specified, filter by year
            matchStage.date = {
                $gte: new Date(`${year}-01-01`),
                $lte: new Date(`${year}-12-31T23:59:59`)
            };
        }

        // ---- BUILD DATE FORMAT STRING ----
        let dateFormat;
        if (groupBy === 'day') {
            dateFormat = '%Y-%m-%d';
        } else if (groupBy === 'week') {
            dateFormat = '%Y-W%V';  // ISO week number
        } else {
            dateFormat = '%Y-%m'; // Default: month
        }

        const result = await Revenue.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: '$date' } },
                    totalAmount: { $sum: '$amount' },
                    totalCommission: { $sum: '$commission' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const formatted = result.map(item => ({
            period: item._id,
            totalAmount: item.totalAmount,
            totalCommission: item.totalCommission,
            netToOwner: item.totalAmount - item.totalCommission,
            count: item.count
        }));

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    GET REVENUE BREAKDOWN PER PROPERTY
// @route   GET /api/revenue/analytics/by-property
// @access  Manager only
// @query   period (day|week|month|year), startDate, endDate
const getRevenueByProperty = async (req, res) => {
    try {
        const matchStage = {};

        const dateRange = buildDateRange(req.query);
        if (dateRange) {
            matchStage.date = dateRange;
        }

        const result = await Revenue.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$property',
                    totalAmount: { $sum: '$amount' },
                    totalCommission: { $sum: '$commission' },
                    count: { $sum: 1 }
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
                    propertySlug: '$propertyInfo.slug',
                    totalAmount: 1,
                    totalCommission: 1,
                    netToOwner: { $subtract: ['$totalAmount', '$totalCommission'] },
                    count: 1
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    GET OVERALL REVENUE DASHBOARD (summary + top properties + recent entries)
// @route   GET /api/revenue/analytics/overview
// @access  Manager only
const getRevenueOverview = async (req, res) => {
    try {
        const now = new Date();

        // ---- DATE RANGES FOR COMPARISON ----
        const ranges = {
            today: {
                $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                $lte: now
            },
            thisWeek: {
                $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()),
                $lte: now
            },
            thisMonth: {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                $lte: now
            },
            allTime: null // no filter
        };

        // ---- AGGREGATE FOR EACH PERIOD ----
        const summarize = async (dateFilter) => {
            const match = dateFilter ? { date: dateFilter } : {};
            const result = await Revenue.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' },
                        totalCommission: { $sum: '$commission' },
                        count: { $sum: 1 }
                    }
                }
            ]);
            if (result.length === 0) return { totalAmount: 0, totalCommission: 0, netToOwner: 0, count: 0 };
            const r = result[0];
            return {
                totalAmount: r.totalAmount,
                totalCommission: r.totalCommission,
                netToOwner: r.totalAmount - r.totalCommission,
                count: r.count
            };
        };

        // ---- TOP PROPERTIES (all time) ----
        const topProperties = await Revenue.aggregate([
            {
                $group: {
                    _id: '$property',
                    totalAmount: { $sum: '$amount' },
                    totalCommission: { $sum: '$commission' },
                    count: { $sum: 1 }
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
                    totalAmount: 1,
                    totalCommission: 1,
                    netToOwner: { $subtract: ['$totalAmount', '$totalCommission'] },
                    count: 1
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 }
        ]);

        // ---- RECENT ENTRIES ----
        const recentEntries = await Revenue.find()
            .populate('property', 'name type')
            .populate('addedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        // ---- RUN ALL PERIOD SUMMARIES IN PARALLEL ----
        const [today, thisWeek, thisMonth, allTime] = await Promise.all([
            summarize(ranges.today),
            summarize(ranges.thisWeek),
            summarize(ranges.thisMonth),
            summarize(ranges.allTime)
        ]);

        res.status(200).json({
            periods: { today, thisWeek, thisMonth, allTime },
            topProperties,
            recentEntries
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};





module.exports = {
    // CRUD
    createRevenue,
    getAllRevenue,
    getRevenueById,
    updateRevenue,
    deleteRevenue,
    // Analytics
    getRevenueSummary,
    getRevenueTrends,
    getRevenueByProperty,
    getRevenueOverview
};
