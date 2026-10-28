const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    updatePassword,
    changeOwnPassword,
    logoutAll,
    getMe
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
// Public:
//   POST /api/auth/login
//
// Authenticated (rate-limited at the server level):
//   PUT  /api/auth/change-password   — any role, requires current password
//   PUT  /api/auth/update-password   — legacy alias for the manager Settings page
//   POST /api/auth/logout-all        — revoke every existing session
//   GET  /api/auth/me
//
// Manager only:
//   POST /api/auth/register
// ==========================================

router.post('/login', loginUser);

// Any signed-in user may change their own password.
router.put('/change-password', protect, changeOwnPassword);
router.put('/update-password', protect, updatePassword);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, getMe);

// Manager-only account creation.
router.post('/register', protect, authorize('manager'), registerUser);

module.exports = router;
