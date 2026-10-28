const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { audit } = require('../utils/audit');
const {
    validatePassword,
    optionalString,
    isPlainString
} = require('../utils/validate');

// ==========================================
// CONSTANTS
// ==========================================
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const TOKEN_TTL = '12h';

// A fixed-cost comparison target so that "user does not exist" and "wrong
// password" take a similar amount of time. Prevents account enumeration by
// timing.
let dummyHash = null;
const getDummyHash = () => {
    if (!dummyHash) {
        dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);
    }
    return dummyHash;
};

// ==========================================
// TOKEN HELPER
// ==========================================
// `tv` binds the token to the account's current tokenVersion. Any password
// change or explicit revocation increments that value and invalidates this
// token everywhere.
const generateToken = (user) => {
    return jwt.sign(
        { id: String(user._id), role: user.role, tv: user.tokenVersion || 0 },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_TTL, algorithm: 'HS256' }
    );
};

// ==========================================
// REGISTER A NEW USER
// ==========================================
// Manager-only route. Owners are normally created through /api/owners so that
// property assignment and the must-change-password flag are handled together.
const registerUser = async (req, res) => {
    try {
        const name = optionalString(req.body?.name, 120);
        const email = optionalString(req.body?.email, 254);
        const password = req.body?.password;
        const requestedRole = req.body?.role;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const normalizedEmail = email.toLowerCase();
        const passwordCheck = validatePassword(password, { email: normalizedEmail });
        if (!passwordCheck.ok) {
            return res.status(400).json({ message: passwordCheck.message });
        }

        const role = requestedRole === 'manager' ? 'manager' : 'owner';

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }

        const user = await User.create({
            name,
            email: normalizedEmail,
            password, // hashed by the model pre-save hook
            role,
            mustChangePassword: true
        });

        audit(req, 'user.created', {
            targetId: user._id,
            targetType: 'User',
            meta: { role: user.role }
        });

        return res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: true,
            message: 'Account created. The user must set their own password after signing in.'
        });
    } catch (error) {
        console.error('[ AUTH ] register failed:', error.message);
        return res.status(500).json({ message: 'Unable to create account' });
    }
};

// ==========================================
// LOGIN
// ==========================================
const loginUser = async (req, res) => {
    try {
        const rawEmail = req.body?.email;
        const password = req.body?.password;

        // Type checks first: an object such as { "$ne": null } must never
        // reach a Mongoose query.
        if (!isPlainString(rawEmail) || !isPlainString(password)) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const email = rawEmail.trim().toLowerCase();
        if (email.length === 0 || email.length > 254 || password.length === 0 || password.length > 128) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = await User.findOne({ email })
            .select('+password +tokenVersion +failedLoginAttempts +lockUntil');

        // ---- ACCOUNT LOCKOUT ----
        if (user && user.isLocked()) {
            audit(req, 'login.locked', { actor: user._id, actorRole: user.role, success: false });
            return res.status(423).json({
                message: 'Account temporarily locked after too many failed attempts. Try again in 15 minutes.'
            });
        }

        // ---- VERIFY ----
        let passwordMatches = false;
        if (user) {
            passwordMatches = await user.matchPassword(password);
        } else {
            // Constant-ish time: compare against a throwaway hash.
            await bcrypt.compare(password, getDummyHash());
        }

        if (!user || !passwordMatches) {
            if (user) {
                user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
                if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                    user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
                    user.failedLoginAttempts = 0;
                }
                await user.save({ validateBeforeSave: false });
            }
            audit(req, 'login.failure', {
                actor: user?._id || null,
                actorRole: user?.role || 'anonymous',
                success: false,
                meta: { reason: 'bad_credentials' }
            });
            // Identical response for unknown email and wrong password.
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // ---- SUCCESS ----
        if (user.failedLoginAttempts !== 0 || user.lockUntil) {
            user.failedLoginAttempts = 0;
            user.lockUntil = null;
            await user.save({ validateBeforeSave: false });
        }
        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        audit(req, 'login.success', { actor: user._id, actorRole: user.role });

        return res.status(200).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword === true,
            token: generateToken(user)
        });
    } catch (error) {
        console.error('[ AUTH ] login failed:', error.message);
        return res.status(500).json({ message: 'Unable to sign in right now' });
    }
};

// ==========================================
// CHANGE OWN PASSWORD
// ==========================================
// Available to every authenticated role. Requires the current password so a
// stolen token alone cannot lock the real owner out of their account.
// On success every existing session is invalidated (tokenVersion bump).
const changeOwnPassword = async (req, res) => {
    try {
        const currentPassword = req.body?.currentPassword;
        const newPassword = req.body?.newPassword;

        if (!isPlainString(currentPassword) || !isPlainString(newPassword)) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }

        const user = await User.findById(req.user._id)
            .select('+password +tokenVersion');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const matches = await user.matchPassword(currentPassword);
        if (!matches) {
            audit(req, 'password.changed', {
                targetId: user._id,
                targetType: 'User',
                success: false,
                meta: { reason: 'wrong_current_password' }
            });
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'New password must be different from the current password' });
        }

        const passwordCheck = validatePassword(newPassword, { email: user.email });
        if (!passwordCheck.ok) {
            return res.status(400).json({ message: passwordCheck.message });
        }

        user.password = newPassword; // hashed by pre-save hook
        user.mustChangePassword = false;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // revoke every session
        await user.save();

        audit(req, 'password.changed', { targetId: user._id, targetType: 'User' });

        // The caller's own token is now dead; issue a fresh one so the UI can
        // stay signed in without an extra round-trip.
        return res.status(200).json({
            message: 'Password updated. Other sessions have been signed out.',
            token: generateToken(user)
        });
    } catch (error) {
        console.error('[ AUTH ] change password failed:', error.message);
        return res.status(500).json({ message: 'Unable to update password' });
    }
};

// ==========================================
// LEGACY ALIAS: PUT /api/auth/update-password
// ==========================================
// Kept for the existing Settings page. Deliberately self-service only — the
// previous version accepted a userId/email and let any manager silently take
// over another account. Administrative resets live at
// PUT /api/owners/:id/reset-password and require step-up authentication.
const updatePassword = changeOwnPassword;

// ==========================================
// LOG OUT EVERYWHERE
// ==========================================
const logoutAll = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+tokenVersion');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save({ validateBeforeSave: false });

        audit(req, 'auth.token_revoked', { targetId: user._id, targetType: 'User' });

        return res.status(200).json({ message: 'Signed out of all devices' });
    } catch (error) {
        console.error('[ AUTH ] logout-all failed:', error.message);
        return res.status(500).json({ message: 'Unable to sign out of all devices' });
    }
};

// ==========================================
// CURRENT USER PROFILE
// ==========================================
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('properties', 'name type slug location pricing images coverImage');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json(user);
    } catch (error) {
        console.error('[ AUTH ] getMe failed:', error.message);
        return res.status(500).json({ message: 'Unable to load profile' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    updatePassword,
    changeOwnPassword,
    logoutAll,
    getMe,
    generateToken
};
