const crypto = require('crypto');
const User = require('../models/User');
const Property = require('../models/Property');
const { audit } = require('../utils/audit');
const { validatePassword, optionalString, optionalObjectId } = require('../utils/validate');

// ==========================================
// HELPER: VALIDATE AN ARRAY OF PROPERTY IDS
// ==========================================
// Rejects anything that is not a plain ObjectId string. Without this, an
// object such as { "$ne": null } would be cast by Mongoose and produce a 500.
const validatePropertyIdList = (propertyIds) => {
    if (!Array.isArray(propertyIds)) return null;
    const cleaned = [];
    for (const id of propertyIds.slice(0, 100)) {
        const valid = optionalObjectId(id);
        if (!valid) return null;
        if (!cleaned.includes(valid)) cleaned.push(valid);
    }
    return cleaned;
};

// ==========================================
// PHASE 3: OWNER MANAGEMENT CONTROLLER
// ==========================================
// All endpoints here are manager-only.
// Owners are regular User documents with role='owner'.
// ==========================================

// ==========================================
// HELPER: GENERATE A ONE-TIME TEMPORARY PASSWORD
// ==========================================
// Only the bcrypt hash of the generated value is ever persisted.
// The plaintext is returned to the manager exactly once, in the response of
// the create/reset call that produced it — never in the owner list endpoint.
const generateTemporaryPassword = () => {
    // 12 random bytes = 96 bits of entropy, rendered as 24 hex characters
    return `Pawna-${crypto.randomBytes(12).toString('hex')}`;
};

// ==========================================
// HELPER: BUILD THE ONE-TIME PASSWORD PAYLOAD
// ==========================================
// `temporaryPassword` is present ONLY when the server generated the password.
// The notice makes it explicit that the value is shown a single time.
const buildTemporaryPasswordPayload = (temporaryPassword) => ({
    temporaryPassword,
    temporaryPasswordNotice: 'One-time temporary password — shown only once. Share it with the owner securely; the owner must change it after the first login.'
});


// @desc    CREATE A NEW OWNER ACCOUNT
// @route   POST /api/owners
// @access  Manager only
const createOwner = async (req, res) => {
    try {
        const name = optionalString(req.body?.name, 120);
        const email = optionalString(req.body?.email, 254);
        const password = req.body?.password;
        const phone = optionalString(req.body?.phone, 30);
        const { propertyIds } = req.body;

        // ---- VALIDATE REQUIRED FIELDS ----
        if (!name) {
            return res.status(400).json({ message: 'Owner name is required' });
        }
        if (!email) {
            return res.status(400).json({ message: 'Owner email is required' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }
        // The password is OPTIONAL. When the manager does not supply one the
        // server generates a secure one-time temporary password instead.
        if (password !== undefined && password !== null && password !== '') {
            const passwordCheck = validatePassword(password, { email });
            if (!passwordCheck.ok) {
                return res.status(400).json({ message: passwordCheck.message });
            }
        }

        // ---- CHECK FOR DUPLICATE EMAIL ----
        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }

        // ---- VALIDATE PROPERTY IDs (if provided) ----
        let validatedPropertyIds = [];
        if (propertyIds !== undefined && propertyIds !== null) {
            const cleaned = validatePropertyIdList(propertyIds);
            if (!cleaned) {
                return res.status(400).json({ message: 'propertyIds must be an array of valid property IDs' });
            }
            if (cleaned.length > 0) {
                const foundProperties = await Property.find({ _id: { $in: cleaned } }).select('_id name');
                if (foundProperties.length !== cleaned.length) {
                    return res.status(400).json({ message: 'One or more property IDs are invalid' });
                }
                validatedPropertyIds = foundProperties.map(p => p._id);
            }
        }

        // ---- PASSWORD: MANAGER-SUPPLIED OR SERVER-GENERATED TEMPORARY ----
        // Only the bcrypt hash is persisted. When the server generates the
        // password, the plaintext is returned once in this response only.
        const isTemporaryPassword = !password;
        const initialPassword = isTemporaryPassword ? generateTemporaryPassword() : password;

        // ---- CREATE OWNER ----
        const owner = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: initialPassword, // Hashed by pre-save hook in User model
            role: 'owner',
            phone: phone || '',
            properties: validatedPropertyIds,
            mustChangePassword: true // Owner must replace the password after first login
        });

        // ---- SYNC PROPERTY DOCUMENTS ----
        if (validatedPropertyIds.length > 0) {
            await Property.updateMany({ _id: { $in: validatedPropertyIds } }, { owner: owner._id });
        }

        audit(req, 'user.created', {
            targetId: owner._id,
            targetType: 'User',
            meta: { role: 'owner', temporaryPassword: isTemporaryPassword }
        });

        // ---- RETURN SAFE RESPONSE (no password, no password hash) ----
        res.status(201).json({
            _id: owner._id,
            name: owner.name,
            email: owner.email,
            role: owner.role,
            phone: owner.phone,
            properties: owner.properties,
            mustChangePassword: true,
            createdAt: owner.createdAt,
            ...(isTemporaryPassword
                ? buildTemporaryPasswordPayload(initialPassword)
                : { passwordNotice: 'The account was created with the password you supplied. The owner must change it after the first login.' })
        });
    } catch (error) {
        console.error('[ API ] request failed:', error.message);
        res.status(500).json({ message: 'Unable to process the request' });
    }
};


// @desc    LIST ALL OWNERS (with their assigned properties populated)
// @route   GET /api/owners
// @access  Manager only
// NOTE: This endpoint NEVER returns a password (plaintext or hash).
//       A one-time temporary password is issued by the create/reset endpoints.
const listOwners = async (req, res) => {
    try {
        const owners = await User.find({ role: 'owner' })
            .select('-password')
            .populate('properties', 'name type slug isActive location')
            .sort({ createdAt: -1 });

        // Strip password hash and the legacy plaintext field before sending
        // to the frontend. Mongoose 9 keeps unknown database fields on the
        // hydrated document, so omitting the schema path is not enough.
        const safeOwners = owners.map(owner => {
            const obj = owner.toObject();
            delete obj.password;
            delete obj.plainPassword;
            return obj;
        });

        res.status(200).json(safeOwners);
    } catch (error) {
        console.error('[ API ] request failed:', error.message);
        res.status(500).json({ message: 'Unable to process the request' });
    }
};


// @desc    GET A SINGLE OWNER BY ID
// @route   GET /api/owners/:id
// @access  Manager only
const getOwnerById = async (req, res) => {
    try {
        const ownerId = optionalObjectId(req.params.id);
        if (!ownerId) {
            return res.status(400).json({ message: 'Invalid owner id' });
        }

        const owner = await User.findOne({ _id: ownerId, role: 'owner' })
            .select('-password')
            .populate('properties', 'name type slug isActive location pricing coverImage');

        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        res.status(200).json(owner);
    } catch (error) {
        console.error('[ API ] request failed:', error.message);
        res.status(500).json({ message: 'Unable to process the request' });
    }
};


// @desc    ASSIGN / UPDATE PROPERTIES FOR AN OWNER
// @route   PUT /api/owners/:id/properties
// @access  Manager only
// Body: { propertyIds: ['id1', 'id2', ...] }  — replaces current assignments
const assignProperties = async (req, res) => {
    try {
        const ownerId = optionalObjectId(req.params.id);
        if (!ownerId) {
            return res.status(400).json({ message: 'Invalid owner id' });
        }

        const { propertyIds } = req.body;

        const cleaned = validatePropertyIdList(propertyIds);
        if (!cleaned) {
            return res.status(400).json({ message: 'propertyIds must be an array of valid property IDs' });
        }

        // ---- FIND THE OWNER ----
        const owner = await User.findOne({ _id: ownerId, role: 'owner' });
        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // ---- VALIDATE ALL PROPERTY IDs ----
        let validatedPropertyIds = [];
        if (cleaned.length > 0) {
            const foundProperties = await Property.find({ _id: { $in: cleaned } }).select('_id name');
            if (foundProperties.length !== cleaned.length) {
                return res.status(400).json({ message: 'One or more property IDs are invalid' });
            }
            validatedPropertyIds = foundProperties.map(p => p._id);
        }

        // ---- UPDATE OWNER PROPERTIES ----
        owner.properties = validatedPropertyIds;
        await owner.save();

        // ---- SYNC PROPERTY DOCUMENTS ----
        // 1. Remove this owner from all properties that currently have them
        await Property.updateMany({ owner: owner._id }, { owner: null });
        // 2. Set this owner on the newly assigned properties
        if (validatedPropertyIds.length > 0) {
            await Property.updateMany({ _id: { $in: validatedPropertyIds } }, { owner: owner._id });
        }

        // ---- RETURN UPDATED OWNER ----
        const updated = await User.findById(owner._id)
            .select('-password')
            .populate('properties', 'name type slug isActive location');

        res.status(200).json({
            message: 'Properties assigned successfully',
            owner: updated
        });
    } catch (error) {
        console.error('[ API ] request failed:', error.message);
        res.status(500).json({ message: 'Unable to process the request' });
    }
};


// @desc    UPDATE OWNER PROFILE (name, phone, email)
// @route   PUT /api/owners/:id
// @access  Manager only
const updateOwner = async (req, res) => {
    try {
        const ownerId = optionalObjectId(req.params.id);
        if (!ownerId) {
            return res.status(400).json({ message: 'Invalid owner id' });
        }

        const name = optionalString(req.body?.name, 120);
        const phone = optionalString(req.body?.phone, 30);
        const email = optionalString(req.body?.email, 254);

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        const owner = await User.findOne({ _id: ownerId, role: 'owner' });
        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // ---- CHECK EMAIL UNIQUENESS (if being changed) ----
        if (email && email.toLowerCase() !== owner.email) {
            const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: owner._id } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email is already in use by another user' });
            }
            owner.email = email.toLowerCase();
        }

        if (name) owner.name = name;
        if (phone !== null) owner.phone = phone;

        await owner.save();

        const updated = await User.findById(owner._id)
            .select('-password')
            .populate('properties', 'name type slug isActive');

        res.status(200).json({ message: 'Owner updated successfully', owner: updated });
    } catch (error) {
        console.error('[ API ] request failed:', error.message);
        res.status(500).json({ message: 'Unable to process the request' });
    }
};


// @desc    DELETE AN OWNER ACCOUNT
// @route   DELETE /api/owners/:id
// @access  Manager only
const deleteOwner = async (req, res) => {
    try {
        const ownerId = optionalObjectId(req.params.id);
        if (!ownerId) {
            return res.status(400).json({ message: 'Invalid owner id' });
        }

        const owner = await User.findOne({ _id: ownerId, role: 'owner' });
        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        await owner.deleteOne();

        // ---- SYNC PROPERTY DOCUMENTS ----
        await Property.updateMany({ owner: owner._id }, { owner: null });

        audit(req, 'user.deleted', {
            targetId: owner._id,
            targetType: 'User',
            meta: { role: 'owner' }
        });

        res.status(200).json({
            message: `Owner "${owner.name}" (${owner.email}) deleted successfully`,
            id: req.params.id
        });
    } catch (error) {
        console.error('[ API ] request failed:', error.message);
        res.status(500).json({ message: 'Unable to process the request' });
    }
};


// @desc    RESET PASSWORD FOR A SPECIFIC USER (by userId)
// @route   PUT /api/owners/:id/reset-password
// @access  Manager only — requires step-up authentication
// ---------------------------------------------------------------
// SECURITY MODEL
//  * The caller must re-enter THEIR OWN password in `currentPassword`.
//    A stolen manager token is therefore not enough to take over an account.
//  * The new password is ALWAYS generated server-side. The old version let
//    the caller choose the password, so an attacker with a token could set a
//    value they knew and sign in as the owner.
//  * Only the bcrypt hash is stored. The plaintext is returned exactly once,
//    in this response, and is never persisted or listed anywhere.
//  * The target's tokenVersion is bumped, so every existing session dies.
// ---------------------------------------------------------------
const resetOwnerPassword = async (req, res) => {
    try {
        const targetId = optionalObjectId(req.params.id);
        if (!targetId) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const currentPassword = req.body?.currentPassword;

        if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
            return res.status(400).json({
                message: 'Your current password is required to reset another account'
            });
        }

        // ---- STEP-UP: VERIFY THE CALLER ----
        const caller = await User.findById(req.user._id).select('+password');
        if (!caller) {
            return res.status(401).json({ message: 'Not authorised' });
        }
        const callerMatches = await caller.matchPassword(currentPassword);
        if (!callerMatches) {
            audit(req, 'password.reset.failed', {
                targetId: req.params.id,
                targetType: 'User',
                success: false,
                meta: { reason: 'step_up_failed' }
            });
            return res.status(401).json({ message: 'Your current password is incorrect' });
        }

        // ---- TARGET ----
        const user = await User.findById(targetId).select('+tokenVersion');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // ---- SERVER-GENERATED PASSWORD ONLY ----
        const resetPassword = generateTemporaryPassword();

        user.password = resetPassword; // pre-save hook hashes it
        user.mustChangePassword = true;
        user.tokenVersion = (user.tokenVersion || 0) + 1; // kill existing sessions
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        audit(req, 'password.reset', {
            targetId: user._id,
            targetType: 'User',
            meta: { targetRole: user.role }
        });

        return res.status(200).json({
            message: `Password for "${user.name}" (${user.role}) was reset`,
            mustChangePassword: true,
            ...buildTemporaryPasswordPayload(resetPassword)
        });
    } catch (error) {
        console.error('[ OWNERS ] password reset failed:', error.message);
        return res.status(500).json({ message: 'Unable to reset password' });
    }
};


module.exports = {
    createOwner,
    listOwners,
    getOwnerById,
    assignProperties,
    updateOwner,
    deleteOwner,
    resetOwnerPassword
};
