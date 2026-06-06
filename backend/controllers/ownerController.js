const User = require('../models/User');
const Property = require('../models/Property');

// ==========================================
// PHASE 3: OWNER MANAGEMENT CONTROLLER
// ==========================================
// All endpoints here are manager-only.
// Owners are regular User documents with role='owner'.
// ==========================================


// @desc    CREATE A NEW OWNER ACCOUNT
// @route   POST /api/owners
// @access  Manager only
const createOwner = async (req, res) => {
    try {
        const { name, email, password, phone, propertyIds } = req.body;

        // ---- VALIDATE REQUIRED FIELDS ----
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Owner name is required' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'Owner email is required' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // ---- CHECK FOR DUPLICATE EMAIL ----
        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        // ---- VALIDATE PROPERTY IDs (if provided) ----
        let validatedPropertyIds = [];
        if (propertyIds && Array.isArray(propertyIds) && propertyIds.length > 0) {
            const foundProperties = await Property.find({ _id: { $in: propertyIds } }).select('_id name');
            if (foundProperties.length !== propertyIds.length) {
                return res.status(400).json({ message: 'One or more property IDs are invalid' });
            }
            validatedPropertyIds = foundProperties.map(p => p._id);
        }

        // ---- CREATE OWNER ----
        const owner = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,           // Hashed by pre-save hook in User model
            role: 'owner',
            phone: phone || '',
            properties: validatedPropertyIds
        });

        // ---- RETURN SAFE RESPONSE (no password) ----
        res.status(201).json({
            _id: owner._id,
            name: owner.name,
            email: owner.email,
            role: owner.role,
            phone: owner.phone,
            properties: owner.properties,
            createdAt: owner.createdAt
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    LIST ALL OWNERS (with their assigned properties populated)
// @route   GET /api/owners
// @access  Manager only
const listOwners = async (req, res) => {
    try {
        const owners = await User.find({ role: 'owner' })
            .select('-password +plainPassword')
            .populate('properties', 'name type slug isActive location')
            .sort({ createdAt: -1 });

        res.status(200).json(owners);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    GET A SINGLE OWNER BY ID
// @route   GET /api/owners/:id
// @access  Manager only
const getOwnerById = async (req, res) => {
    try {
        const owner = await User.findOne({ _id: req.params.id, role: 'owner' })
            .select('-password +plainPassword')
            .populate('properties', 'name type slug isActive location pricing coverImage');

        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        res.status(200).json(owner);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    ASSIGN / UPDATE PROPERTIES FOR AN OWNER
// @route   PUT /api/owners/:id/properties
// @access  Manager only
// Body: { propertyIds: ['id1', 'id2', ...] }  — replaces current assignments
const assignProperties = async (req, res) => {
    try {
        const { propertyIds } = req.body;

        if (!Array.isArray(propertyIds)) {
            return res.status(400).json({ message: 'propertyIds must be an array' });
        }

        // ---- FIND THE OWNER ----
        const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // ---- VALIDATE ALL PROPERTY IDs ----
        let validatedPropertyIds = [];
        if (propertyIds.length > 0) {
            const foundProperties = await Property.find({ _id: { $in: propertyIds } }).select('_id name');
            if (foundProperties.length !== propertyIds.length) {
                return res.status(400).json({ message: 'One or more property IDs are invalid' });
            }
            validatedPropertyIds = foundProperties.map(p => p._id);
        }

        // ---- UPDATE OWNER PROPERTIES ----
        owner.properties = validatedPropertyIds;
        await owner.save();

        // ---- RETURN UPDATED OWNER ----
        const updated = await User.findById(owner._id)
            .select('-password')
            .populate('properties', 'name type slug isActive location');

        res.status(200).json({
            message: 'Properties assigned successfully',
            owner: updated
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    UPDATE OWNER PROFILE (name, phone, email)
// @route   PUT /api/owners/:id
// @access  Manager only
const updateOwner = async (req, res) => {
    try {
        const { name, phone, email } = req.body;

        const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // ---- CHECK EMAIL UNIQUENESS (if being changed) ----
        if (email && email.trim().toLowerCase() !== owner.email) {
            const emailExists = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: owner._id } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email is already in use by another user' });
            }
            owner.email = email.trim().toLowerCase();
        }

        if (name && name.trim()) owner.name = name.trim();
        if (phone !== undefined) owner.phone = phone;

        await owner.save();

        const updated = await User.findById(owner._id)
            .select('-password')
            .populate('properties', 'name type slug isActive');

        res.status(200).json({ message: 'Owner updated successfully', owner: updated });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    DELETE AN OWNER ACCOUNT
// @route   DELETE /api/owners/:id
// @access  Manager only
const deleteOwner = async (req, res) => {
    try {
        const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        await owner.deleteOne();

        res.status(200).json({
            message: `Owner "${owner.name}" (${owner.email}) deleted successfully`,
            id: req.params.id
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};


// @desc    RESET PASSWORD FOR A SPECIFIC USER (by userId)
// @route   PUT /api/owners/:id/reset-password
// @access  Manager only
// Replaces the old per-role updatePassword with a per-user implementation
const resetOwnerPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        // Works for any user (owner or manager) — manager can reset any user's password
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = newPassword; // Pre-save hook in User model will hash it
        await user.save();

        res.status(200).json({
            message: `Password for "${user.name}" (${user.role}) updated successfully`
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
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
