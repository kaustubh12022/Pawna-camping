const jwt = require('jsonwebtoken');
const User = require('../models/User');

// PROTECT ROUTE MIDDLEWARE: VERIFY JWT TOKEN
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // GET TOKEN FROM HEADER
            token = req.headers.authorization.split(' ')[1];

            // VERIFY TOKEN
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // GET USER FROM THE TOKEN AND EXCLUDE PASSWORD
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            console.error(`[ ERROR ] TOKEN VERIFICATION FAILED: ${error.message}`);
            return res.status(401).json({ message: 'NOT AUTHORIZED, TOKEN FAILED' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'NOT AUTHORIZED, NO TOKEN PROVIDED' });
    }
};

// ROLE-BASED AUTHORIZATION MIDDLEWARE
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `USER ROLE ${req.user ? req.user.role : 'UNKNOWN'} IS NOT AUTHORIZED TO ACCESS THIS ROUTE`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
