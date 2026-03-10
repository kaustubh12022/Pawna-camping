const Package = require('../models/Package');

// @desc    GET ALL PACKAGES
// @route   GET /api/packages
// @access  Public
const getPackages = async (req, res) => {
    try {
        const packages = await Package.find({}).sort({ priceValue: 1 });
        res.status(200).json(packages);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    CREATE A NEW PACKAGE
// @route   POST /api/packages
// @access  Private (Manager and Owner)
const createPackage = async (req, res) => {
    try {
        const { title, description, features, price, priceValue, maxCapacity, image, isCottage } = req.body;

        const package = await Package.create({
            title,
            description,
            features,
            price,
            priceValue: priceValue || 0,
            maxCapacity: maxCapacity || 10,
            isCottage: isCottage || false,
            image
        });

        res.status(201).json(package);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    UPDATE A PACKAGE
// @route   PUT /api/packages/:id
// @access  Private (Manager and Owner)
const updatePackage = async (req, res) => {
    try {
        const package = await Package.findById(req.params.id);

        if (!package) {
            return res.status(404).json({ message: 'PACKAGE NOT FOUND' });
        }

        const updatedPackage = await Package.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedPackage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    DELETE A PACKAGE
// @route   DELETE /api/packages/:id
// @access  Private (Manager and Owner)
const deletePackage = async (req, res) => {
    try {
        const package = await Package.findById(req.params.id);

        if (!package) {
            return res.status(404).json({ message: 'PACKAGE NOT FOUND' });
        }

        await package.deleteOne();
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
