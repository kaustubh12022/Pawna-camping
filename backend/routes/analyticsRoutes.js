const express = require('express');
const router = express.Router();

const {
    getOverviewAnalytics,
    getFoodAnalytics,
    getPackageAnalytics,
    getMonthlyAnalytics,
    getPropertyAnalytics   // PHASE 2: New
} = require('../controllers/analyticsController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// ALL ANALYTICS ROUTES REQUIRE JWT AUTH
// ==========================================
router.use(protect);

// ==========================================
// OWNER + MANAGER SHARED ROUTES (property-scoped)
// ==========================================
// Owners are auto-scoped in controller via resolvePropertyScope()
// Managers can pass ?propertyId= or get all-properties data
router.use(authorize('owner', 'manager'));

// @route   GET /api/analytics/overview
// @desc    Total bookings, guests, nights
// @query   date (optional), propertyId (optional for manager)
router.get('/overview', getOverviewAnalytics);

// @route   GET /api/analytics/food
// @desc    Veg vs Non-veg distribution
// @query   date (optional), propertyId (optional)
router.get('/food', getFoodAnalytics);

// @route   GET /api/analytics/packages
// @desc    Package popularity breakdown
// @query   date (optional), propertyId (optional)
router.get('/packages', getPackageAnalytics);

// @route   GET /api/analytics/monthly
// @desc    Monthly booking + guest trends (chronological)
// @query   propertyId (optional), year (optional, defaults to current year)
router.get('/monthly', getMonthlyAnalytics);

// @route   GET /api/analytics/owner-revenue
// @desc    Get owner revenue entries minus commission
// @query   propertyId (optional), date (optional)
router.get('/owner-revenue', require('../controllers/analyticsController').getOwnerRevenue);

// ==========================================
// MANAGER ONLY ROUTES
// ==========================================

// @route   GET /api/analytics/properties
// @desc    Bookings grouped by property — for manager comparison view
// @query   startDate, endDate (optional)
router.get('/properties', authorize('manager'), getPropertyAnalytics);

module.exports = router;
