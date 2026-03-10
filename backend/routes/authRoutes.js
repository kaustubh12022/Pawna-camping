const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updatePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ROUTE DEFINITIONS FOR AUTHENTICATION
router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/update-password', protect, authorize('manager'), updatePassword);

module.exports = router;
