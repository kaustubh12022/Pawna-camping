const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// @route   POST /api/notifications/subscribe
// @desc    Subscribe to push notifications
// @access  Private
router.post('/subscribe', protect, async (req, res) => {
    try {
        const subscription = req.body;
        
        // Find user and save subscription
        await User.findByIdAndUpdate(req.user._id, {
            pushSubscription: subscription
        });
        
        res.status(201).json({ message: 'Subscription saved successfully.' });
    } catch (error) {
        console.error('Error saving subscription:', error);
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
});

// @route   PUT /api/notifications/seen-bookings
// @desc    Update lastSeenBookingAt timestamp for user
// @access  Private
router.put('/seen-bookings', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            lastSeenBookingAt: Date.now()
        });
        res.status(200).json({ message: 'Updated last seen timestamp.' });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
});

module.exports = router;
