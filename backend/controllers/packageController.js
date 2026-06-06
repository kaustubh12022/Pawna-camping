const Package = require('../models/Package');

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
        const { propertyId } = req.query;

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
            .sort({ priceValue: 1 });               // Ascending price

        res.status(200).json(packages);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
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
            priceValue,
            maxCapacity,
            image,
            propertyId   // PHASE 2: Optional property linkage
        } = req.body;

        const newPackage = await Package.create({
            title,
            description,
            features,
            price,
            priceValue: priceValue || 0,
            maxCapacity: maxCapacity || 10,
            image,
            property: propertyId || null  // PHASE 2: Link to property if provided
        });

        // Populate property info before returning
        const populated = await newPackage.populate('property', 'name type slug');
        res.status(201).json(populated);
    } catch (error) {
        res.status(400).json({ message: error.message });
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

        // PHASE 2: Allow updating property linkage
        const updateData = { ...req.body };
        if (req.body.propertyId !== undefined) {
            updateData.property = req.body.propertyId || null;
            delete updateData.propertyId; // Clean up alias
        }

        const updatedPackage = await Package.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('property', 'name type slug');

        res.status(200).json(updatedPackage);
    } catch (error) {
        res.status(400).json({ message: error.message });
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
