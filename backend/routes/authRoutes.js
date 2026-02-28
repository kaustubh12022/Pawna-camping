const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// ROUTE DEFINITIONS FOR AUTHENTICATION
router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;
