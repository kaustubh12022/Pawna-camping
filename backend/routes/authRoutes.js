const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updatePassword, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ROUTE DEFINITIONS FOR AUTHENTICATION
router.post('/register', protect, authorize('manager'), registerUser);
router.post('/login', loginUser);
router.put('/update-password', protect, authorize('manager'), updatePassword);
router.get('/me', protect, getMe);

module.exports = router;
