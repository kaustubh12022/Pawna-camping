const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// @desc    EXAMPLE PROTECTED ROUTE FOR TESTING ROLE-BASED ACCESS
// @route   GET /api/example/protected
// @access  Private
router.get('/protected', protect, (req, res) => {
    res.status(200).json({
        message: 'THIS IS A PROTECTED ROUTE',
        user: { id: req.user._id, name: req.user.name, role: req.user.role }
    });
});

// @desc    EXAMPLE MANAGER ONLY ROUTE
// @route   GET /api/example/manager-only
// @access  Private (Managers and Owners)
router.get('/manager-only', protect, authorize('manager', 'owner'), (req, res) => {
    res.status(200).json({
        message: 'ONLY MANAGERS OR OWNERS CAN SEE THIS',
        role: req.user.role
    });
});

// @desc    EXAMPLE OWNER ONLY ROUTE
// @route   GET /api/example/owner-only
// @access  Private (Owner only)
router.get('/owner-only', protect, authorize('owner'), (req, res) => {
    res.status(200).json({
        message: 'ONLY OWNERS CAN SEE THIS. HIGH VISIBILITY.',
        role: req.user.role
    });
});

module.exports = router;
