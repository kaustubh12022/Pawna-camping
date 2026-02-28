const User = require('../models/User');
const jwt = require('jsonwebtoken');

// GENERATE JWT TOKEN HELPER
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
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

        // CHECK FOR USER BY EMAIL
        const user = await User.findOne({ email });

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

module.exports = { registerUser, loginUser };
