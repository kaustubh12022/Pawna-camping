const BlockedDate = require('../models/BlockedDate');
const mongoose = require('mongoose');

// @desc    Get blocked dates for a property
// @route   GET /api/blocked-dates?propertyId=xxx
// @access  Private (Owner/Manager)
const getBlockedDates = async (req, res) => {
    try {
        const { propertyId } = req.query;
        if (!propertyId) {
            return res.status(400).json({ message: 'propertyId is required' });
        }

        const blockedDates = await BlockedDate.find({ property: propertyId });
        res.status(200).json(blockedDates);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    Create a blocked date range
// @route   POST /api/blocked-dates
// @access  Private (Owner/Manager)
const createBlockedDate = async (req, res) => {
    try {
        const { property, startDate, endDate, reason } = req.body;

        // Validation: if owner, ensure they own the property
        if (req.user.role === 'owner') {
            const ownerPropertyIds = req.user.properties || [];
            if (!ownerPropertyIds.some(p => p.toString() === property)) {
                return res.status(403).json({ message: 'Access denied: not your property' });
            }
        }

        const blockedDate = await BlockedDate.create({
            property,
            startDate,
            endDate,
            reason: reason || '',
            blockedBy: req.user._id
        });

        res.status(201).json(blockedDate);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    Delete a blocked date
// @route   DELETE /api/blocked-dates/:id
// @access  Private (Owner/Manager)
const deleteBlockedDate = async (req, res) => {
    try {
        const blockedDate = await BlockedDate.findById(req.params.id);
        if (!blockedDate) {
            return res.status(404).json({ message: 'Blocked date not found' });
        }

        // Validation: if owner, ensure they own the property
        if (req.user.role === 'owner') {
            const ownerPropertyIds = req.user.properties || [];
            if (!ownerPropertyIds.some(p => p.toString() === blockedDate.property.toString())) {
                return res.status(403).json({ message: 'Access denied: not your property' });
            }
        }

        await blockedDate.deleteOne();
        res.status(200).json({ message: 'Blocked date removed' });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

module.exports = {
    getBlockedDates,
    createBlockedDate,
    deleteBlockedDate
};
