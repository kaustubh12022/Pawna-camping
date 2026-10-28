const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ==========================================
// PROTECT — VERIFY JWT *AND* SESSION STATE
// ==========================================
// A JWT is only as good as its revocation story. Verifying the signature is
// not enough: a stolen token stays valid until it expires. Every token now
// carries `tv` (tokenVersion); if it no longer matches the user's current
// tokenVersion the token is dead. Password changes, manager resets and
// "log out everywhere" all bump the value.
//
// Accounts flagged `mustChangePassword` are confined to /api/auth/* until
// they set their own password. Without this, a manager-issued temporary
// password could be used indefinitely.
// ==========================================

const AUTH_ONLY_PREFIX = '/api/auth/';

const sameTokenVersion = (decoded, user) => {
    // Tokens minted before tokenVersion existed have no `tv` claim and are
    // rejected on purpose — one forced re-login after deploy.
    if (!Number.isInteger(decoded.tv)) return false;
    return decoded.tv === (user.tokenVersion || 0);
};

const protect = async (req, res, next) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorised' });
    }

    const token = header.slice(7).trim();
    if (!token) {
        return res.status(401).json({ message: 'Not authorised' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'] // Pin the algorithm: never accept `none` or RS/HS confusion
        });

        if (!decoded || typeof decoded.id !== 'string') {
            return res.status(401).json({ message: 'Not authorised' });
        }

        const user = await User.findById(decoded.id)
            .select('-password +tokenVersion +failedLoginAttempts +lockUntil');

        if (!user) {
            return res.status(401).json({ message: 'Not authorised' });
        }

        if (!sameTokenVersion(decoded, user)) {
            return res.status(401).json({
                message: 'Session expired. Please sign in again.',
                code: 'TOKEN_REVOKED'
            });
        }

        if (user.isLocked && user.isLocked()) {
            return res.status(423).json({ message: 'Account temporarily locked' });
        }

        req.user = user;

        // Confine accounts that still use a manager-issued password.
        const isAuthRoute = req.originalUrl.startsWith(AUTH_ONLY_PREFIX);
        if (user.mustChangePassword && !isAuthRoute) {
            return res.status(403).json({
                message: 'You must change your password before continuing.',
                code: 'PASSWORD_CHANGE_REQUIRED'
            });
        }

        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired. Please sign in again.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ message: 'Not authorised' });
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
