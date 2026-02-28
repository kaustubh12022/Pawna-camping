const express = require('express');
const router = express.Router();

const {
    getOverviewAnalytics,
    getFoodAnalytics,
    getPackageAnalytics,
    getMonthlyAnalytics
} = require('../controllers/analyticsController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// OWNER ONLY ROUTES
// ==========================================
// ENFORCE JWT TOKEN AND STRICTLY 'owner' ROLE
router.use(protect);
router.use(authorize('owner'));

// @route   GET /api/analytics/overview
// @desc    Get total bookings and total guests
router.get('/overview', getOverviewAnalytics);

// @route   GET /api/analytics/food
// @desc    Get distribution of Veg vs Non-veg
router.get('/food', getFoodAnalytics);

// @route   GET /api/analytics/packages
// @desc    Get distribution of package types
router.get('/packages', getPackageAnalytics);

// @route   GET /api/analytics/monthly
// @desc    Get chronological booking trends grouped by YYYY-MM
router.get('/monthly', getMonthlyAnalytics);

module.exports = router;
