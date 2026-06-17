const User = require('../models/User');
const jwt = require('jsonwebtoken');

// GENERATE JWT TOKEN HELPER
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d', // Reduced from 30d to 7d for better security
    });
};

// @desc    REGISTER A NEW USER
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // CHECK IF ALL FIELDS ARE PROVIDED
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'PLEASE ADD ALL REQUIRED FIELDS' });
        }

        // CHECK IF USER ALREADY EXISTS
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'USER ALREADY EXISTS' });
        }

        // CREATE NEW USER (PASSWORD IS HASHED IN MODEL PRE-SAVE)
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'manager'
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'INVALID USER DATA' });
        }
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    AUTHENTICATE A USER (LOGIN)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();

        // CHECK FOR USER BY EMAIL
        const user = await User.findOne({ email: normalizedEmail });

        // IF USER EXISTS AND COMBINATION MATCHES 
        if (user && (await user.matchPassword(password))) {
            res.status(200).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'INVALID EMAIL OR PASSWORD' });
        }
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    UPDATE PASSWORD — PER-USER (PHASE 3 UPDATE)
// @route   PUT /api/auth/update-password
// @access  Private (Manager)
// Accepts: { userId: ObjectId, newPassword: string }
//       OR: { email: string, newPassword: string }
// Phase 3 replaces the old per-role implementation which assumed one user per role.
// Manager can reset any user's password; the ownerRoutes has a dedicated per-owner endpoint too.
const updatePassword = async (req, res) => {
    try {
        const { userId, email, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        if (!userId && !email) {
            return res.status(400).json({ message: 'Please provide either userId or email to identify the target user' });
        }

        // ---- FIND TARGET USER ----
        let userToUpdate;
        if (userId) {
            userToUpdate = await User.findById(userId);
        } else {
            userToUpdate = await User.findOne({ email: email.trim().toLowerCase() });
        }

        if (!userToUpdate) {
            return res.status(404).json({ message: 'USER NOT FOUND' });
        }

        // ---- UPDATE PASSWORD (pre-save hook hashes it) ----
        userToUpdate.password = newPassword;
        await userToUpdate.save();

        res.status(200).json({
            message: `Password updated successfully for ${userToUpdate.name} (${userToUpdate.role})`
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    GET CURRENT USER PROFILE (WITH ASSIGNED PROPERTIES)
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password').populate('properties', 'name type slug location pricing images coverImage googleMapsLink');
        if (!user) {
            return res.status(404).json({ message: 'USER NOT FOUND' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

module.exports = { registerUser, loginUser, updatePassword, getMe };
