const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/dashboard/stats
// @desc    Server-side aggregated dashboard statistics
// @access  Manager only
router.get('/stats', protect, authorize('manager'), getDashboardStats);

module.exports = router;
