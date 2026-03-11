const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// PUBLIC: GET CURRENT SETTINGS
router.get('/', getSettings);

// PROTECTED: UPDATE SETTINGS (MANAGER ONLY)
router.put('/', protect, authorize('manager'), updateSettings);

module.exports = router;
