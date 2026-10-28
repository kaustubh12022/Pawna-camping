const Package = require('../models/Package');
const { optionalObjectId, optionalString, optionalInt, optionalNumber, isPlainString } = require('../utils/validate');

// ==========================================
// GET ALL PACKAGES (with optional property filter)
// ==========================================

// @desc    GET ALL PACKAGES
// @route   GET /api/packages
// @access  Public
// @query   propertyId (optional) — filter packages for a specific campsite property
//          If no propertyId → returns ALL packages (legacy behaviour preserved)
const getPackages = async (req, res) => {
    try {
        const propertyId = optionalObjectId(req.query.propertyId);

        let query = {};

        if (propertyId) {
            // PHASE 2: Scoped — get packages only for this property, OR global packages
            query.$or = [
                { property: propertyId },
                { property: null },
                { property: { $exists: false } }
            ];
        }
        // If no propertyId: returns all packages (preserves existing live site behaviour)

        const packages = await Package.find(query)
            .populate('property', 'name type slug') // PHASE 2: Include property info
            .sort({ weekdayPrice: 1 });               // Ascending price

        res.status(200).json(packages);
    } catch (error) {
        console.error('[ API ] request failed:', error.message);
        res.status(500).json({ message: 'Unable to process the request' });
    }
};

// ==========================================
// CREATE A NEW PACKAGE
// ==========================================

// @desc    CREATE A NEW PACKAGE
// @route   POST /api/packages
// @access  Private (Manager and Owner)
// @body    propertyId (optional) — link package to a specific campsite property
const createPackage = async (req, res) => {
    try {
        const {
            title,
            description,
            features,
            price,
            weekdayPrice,
            weekendPrice,
            maxCapacity,
            image,
            propertyId   // PHASE 2: Optional property linkage
        } = req.body;

        // Multi-tenant authorization: Owners can only create packages for properties they own
        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Package title is required' });
        }

        // maxCapacity === 0 is the legacy "unlimited" marker and is allowed.
        const parsedMaxCapacity = maxCapacity === undefined
            ? 10
            : optionalInt(maxCapacity, { min: 0, max: 1000 });

        if (parsedMaxCapacity === null) {
            return res.status(400).json({ message: 'Maximum capacity must be a whole number between 0 and 1000' });
        }
        if (weekdayPrice !== undefined && optionalNumber(weekdayPrice, { min: 0, max: 10000000 }) === null) {
            return res.status(400).json({ message: 'Weekday price must be a number between 0 and 10000000' });
        }
        if (weekendPrice !== undefined && optionalNumber(weekendPrice, { min: 0, max: 10000000 }) === null) {
            return res.status(400).json({ message: 'Weekend price must be a number between 0 and 10000000' });
        }
        if (propertyId !== undefined && propertyId !== null && propertyId !== '' && !optionalObjectId(propertyId)) {
            return res.status(400).json({ message: 'Invalid property id' });
        }

        if (req.user && req.user.role === 'owner') {
            if (!propertyId) {
                return res.status(403).json({ message: 'Access denied: owners cannot create global packages. propertyId is required.' });
            }
            const ownerPropertyIds = (req.user.properties || []).map(p => p.toString());
            if (!ownerPropertyIds.includes(propertyId.toString())) {
                return res.status(403).json({ message: 'Access denied: you can only create packages for properties you own.' });
            }
        }

        const newPackage = await Package.create({
            title,
            description,
            features,
            price,
            weekdayPrice: weekdayPrice === undefined ? 0 : Number(weekdayPrice),
            weekendPrice: weekendPrice === undefined ? 0 : Number(weekendPrice),
            maxCapacity: parsedMaxCapacity,
            image,
            property: propertyId || null  // PHASE 2: Link to property if provided
        });

        // Populate property info before returning
        const populated = await newPackage.populate('property', 'name type slug');
        res.status(201).json(populated);
    } catch (error) {
        console.error('[ API ] validation failed:', error.message);
        res.status(400).json({ message: 'Invalid request data' });
    }
};

// ==========================================
// UPDATE A PACKAGE
// ==========================================

// @desc    UPDATE A PACKAGE
// @route   PUT /api/packages/:id
// @access  Private (Manager and Owner)
const updatePackage = async (req, res) => {
    try {
        const existingPackage = await Package.findById(req.params.id);

        if (!existingPackage) {
            return res.status(404).json({ message: 'PACKAGE NOT FOUND' });
        }

        // ---- VALIDATE NUMERIC FIELDS ----
        const numericChecks = [
            ['weekdayPrice', 'Weekday price'],
            ['weekendPrice', 'Weekend price']
        ];
        for (const [field, label] of numericChecks) {
            if (req.body[field] !== undefined && optionalNumber(req.body[field], { min: 0, max: 10000000 }) === null) {
                return res.status(400).json({ message: `${label} must be a number between 0 and 10000000` });
            }
        }
        if (req.body.maxCapacity !== undefined && optionalInt(req.body.maxCapacity, { min: 0, max: 1000 }) === null) {
            return res.status(400).json({ message: 'Maximum capacity must be a whole number between 0 and 1000' });
        }

        // ---- VALIDATE PROPERTY LINK ----
        let requestedPropertyId;
        if (req.body.propertyId !== undefined) {
            if (req.body.propertyId === null || req.body.propertyId === '') {
                requestedPropertyId = null;
            } else if (optionalObjectId(req.body.propertyId)) {
                requestedPropertyId = req.body.propertyId;
            } else {
                return res.status(400).json({ message: 'Invalid property id' });
            }
        }

        // Multi-tenant authorization: Owners can only modify packages for their own properties
        if (req.user && req.user.role === 'owner') {
            if (!existingPackage.property) {
                return res.status(403).json({ message: 'Access denied: owners cannot modify global packages.' });
            }
            const ownerPropertyIds = (req.user.properties || []).map(p => p.toString());
            if (!ownerPropertyIds.includes(existingPackage.property.toString())) {
                return res.status(403).json({ message: 'Access denied: you do not own the property for this package.' });
            }
            // If changing propertyId, owner must also own the destination property
            if (requestedPropertyId !== undefined && (requestedPropertyId === null || !ownerPropertyIds.includes(requestedPropertyId))) {
                return res.status(403).json({ message: 'Access denied: target property is not owned by you.' });
            }
        }

        // ---- ALLOW-LISTED UPDATE (M-08) ----
        // The previous version spread `req.body` into findByIdAndUpdate, which
        // let an owner set `property` or `createdBy` directly and bypass the
        // propertyId checks above. Only these fields may change.
        const ALLOWED_PACKAGE_FIELDS = [
            'title', 'description', 'features', 'price', 'image',
            'weekdayPrice', 'weekendPrice', 'maxCapacity'
        ];

        const updateData = {};
        for (const field of ALLOWED_PACKAGE_FIELDS) {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        }

        // Normalise the free-text and array fields.
        if (updateData.title !== undefined) {
            const title = optionalString(updateData.title, 120);
            if (!title) return res.status(400).json({ message: 'Package title cannot be empty' });
            updateData.title = title;
        }
        if (updateData.description !== undefined) {
            const description = optionalString(updateData.description, 2000);
            if (description === null) return res.status(400).json({ message: 'Invalid description' });
            updateData.description = description;
        }
        if (updateData.price !== undefined) {
            const price = optionalString(updateData.price, 60);
            if (price === null) return res.status(400).json({ message: 'Invalid price display value' });
            updateData.price = price;
        }
        if (updateData.image !== undefined) {
            const image = optionalString(updateData.image, 1000);
            if (image === null) return res.status(400).json({ message: 'Invalid image URL' });
            updateData.image = image;
        }
        if (updateData.features !== undefined) {
            if (!Array.isArray(updateData.features)) {
                return res.status(400).json({ message: 'Features must be an array of strings' });
            }
            updateData.features = updateData.features
                .filter(isPlainString)
                .map((feature) => feature.trim())
                .filter(Boolean)
                .slice(0, 30);
        }

        // PHASE 2: Allow updating property linkage (validated above).
        if (requestedPropertyId !== undefined) {
            updateData.property = requestedPropertyId;
        }

        // An empty update (for example, a body that only contains fields the
        // caller is not allowed to change) is a no-op, not an error.
        if (Object.keys(updateData).length === 0) {
            const unchanged = await Package.findById(req.params.id).populate('property', 'name type slug');
            return res.status(200).json(unchanged);
        }

        const updatedPackage = await Package.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('property', 'name type slug');

        res.status(200).json(updatedPackage);
    } catch (error) {
        console.error('[ API ] validation failed:', error.message);
        res.status(400).json({ message: 'Invalid request data' });
    }
};

// ==========================================
// DELETE A PACKAGE
// ==========================================

// @desc    DELETE A PACKAGE
// @route   DELETE /api/packages/:id
// @access  Private (Manager and Owner)
const deletePackage = async (req, res) => {
    try {
        const existingPackage = await Package.findById(req.params.id);

        if (!existingPackage) {
            return res.status(404).json({ message: 'PACKAGE NOT FOUND' });
        }

        // Multi-tenant authorization: Owners can only delete packages for their own properties
        if (req.user && req.user.role === 'owner') {
            if (!existingPackage.property) {
                return res.status(403).json({ message: 'Access denied: owners cannot delete global packages.' });
            }
            const ownerPropertyIds = (req.user.properties || []).map(p => p.toString());
            if (!ownerPropertyIds.includes(existingPackage.property.toString())) {
                return res.status(403).json({ message: 'Access denied: you do not own the property for this package.' });
            }
        }

        await existingPackage.deleteOne();
        res.status(200).json({ id: req.params.id, message: 'PACKAGE DELETED SUCCESSFULLY' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPackages,
    createPackage,
    updatePackage,
    deletePackage
};
