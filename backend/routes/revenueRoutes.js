const express = require('express');
const router = express.Router();

const {
    createRevenue,
    getAllRevenue,
    getRevenueById,
    updateRevenue,
    deleteRevenue,
    getRevenueSummary,
    getRevenueTrends,
    getRevenueByProperty,
    getRevenueOverview
} = require('../controllers/revenueController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// ALL REVENUE ROUTES — Manager only
// ==========================================
// Phase 3: Revenue is managed and viewed exclusively by the manager.
// ==========================================

router.use(protect);
router.use(authorize('manager'));

// ==========================================
// ANALYTICS ROUTES (must come before /:id to avoid conflicts)
// ==========================================

// @route   GET /api/revenue/analytics/overview
// @desc    Multi-period summary (today/week/month/all-time) + top properties + recent entries
router.get('/analytics/overview', getRevenueOverview);

// @route   GET /api/revenue/analytics/summary
// @desc    Single-period summary totals
// @query   period (day|week|month|year), propertyId, startDate, endDate
router.get('/analytics/summary', getRevenueSummary);

// @route   GET /api/revenue/analytics/trends
// @desc    Revenue grouped by day/week/month for chart display
// @query   groupBy (day|week|month), period, propertyId, startDate, endDate, year
router.get('/analytics/trends', getRevenueTrends);

// @route   GET /api/revenue/analytics/by-property
// @desc    Revenue breakdown per property (for comparison charts)
// @query   period, startDate, endDate
router.get('/analytics/by-property', getRevenueByProperty);



// ==========================================
// CRUD ROUTES
// ==========================================

// @route   GET  /api/revenue
// @desc    List all revenue entries (with filters + pagination)
// @query   propertyId, period, startDate, endDate, page, limit
router.get('/', getAllRevenue);

// @route   POST /api/revenue
// @desc    Create a new revenue entry
router.post('/', createRevenue);

// @route   GET  /api/revenue/:id
// @desc    Get a single revenue entry
router.get('/:id', getRevenueById);

// @route   PUT  /api/revenue/:id
// @desc    Update a revenue entry
router.put('/:id', updateRevenue);

// @route   DELETE /api/revenue/:id
// @desc    Delete a revenue entry
router.delete('/:id', deleteRevenue);

module.exports = router;
