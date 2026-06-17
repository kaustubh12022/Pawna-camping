const Property = require('../models/Property');
const User = require('../models/User');
const Package = require('../models/Package');
const Review = require('../models/Review');
const { generateUniqueSlug } = require('../utils/slugify');

// ==========================================
// HELPER: ENRICH CAMPSITES WITH MIN PACKAGE PRICE
// ==========================================
const enrichPropertiesWithMinPrice = async (properties) => {
    const campsites = properties.filter(p => p.type === 'campsite');
    if (campsites.length === 0) return properties;

    const allPackages = await Package.find().lean();

    for (const prop of campsites) {
        const propPackages = allPackages.filter(pkg => 
            !pkg.property || 
            pkg.property.toString() === prop._id.toString()
        );

        if (propPackages.length > 0) {
            let minPrice = Infinity;
            for (const pkg of propPackages) {
                let pkgPrice = pkg.weekdayPrice || pkg.priceValue;
                if (!pkgPrice && pkg.price) {
                    const parsed = parseInt(pkg.price.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(parsed)) pkgPrice = parsed;
                }
                if (pkgPrice && pkgPrice < minPrice) {
                    minPrice = pkgPrice;
                }
            }

            if (minPrice !== Infinity) {
                if (!prop.pricing) prop.pricing = {};
                prop.pricing.weekdayPrice = minPrice;
                prop.pricing.weekendPrice = minPrice;
                prop.pricing.priceDisplay = `₹${minPrice.toLocaleString('en-IN')}`;
            }
        }
    }
    return properties;
};

// ==========================================
// HELPER: ENRICH PROPERTIES WITH REVIEW DATA
// ==========================================
const enrichPropertiesWithReviews = async (properties) => {
    if (properties.length === 0) return properties;

    const allReviews = await Review.find({ isApproved: true }).lean();

    for (const prop of properties) {
        const propReviews = allReviews.filter(r => r.property && r.property.toString() === prop._id.toString());
        
        prop.reviewCount = propReviews.length;
        if (propReviews.length > 0) {
            const sum = propReviews.reduce((acc, curr) => acc + curr.rating, 0);
            prop.averageRating = Number((sum / propReviews.length).toFixed(1));
        } else {
            prop.averageRating = 0;
        }
    }
    return properties;
};

// ==========================================
// PUBLIC: GET ALL PROPERTIES (with filters)
// ==========================================

// @desc    List all properties with optional filtering & search
// @route   GET /api/properties
// @access  Public
// @query   type=campsite|villa, location=string, search=string, isActive=true|false
const getProperties = async (req, res) => {
    try {
        const {
            type,
            location,
            search,
            isActive,
            sortBy,
            order
        } = req.query;

        // ---- BUILD QUERY OBJECT ----
        let query = {};

        // Filter by property type (campsite or villa)
        if (type && ['campsite', 'villa'].includes(type)) {
            query.type = type;
        }

        // Filter by location (case-insensitive partial match)
        if (location && location.trim()) {
            query.location = { $regex: location.trim(), $options: 'i' };
        }

        // Full-text search across name, location, shortDescription
        if (search && search.trim()) {
            query.$text = { $search: search.trim() };
        }

        // Filter by active status — public API defaults to active only
        // Manager can pass isActive=all to see ALL properties, or isActive=false for inactive only
        if (isActive === 'all') {
            // No isActive filter — return both active and inactive
        } else if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        } else {
            // Default: only show active properties to the public
            query.isActive = true;
        }

        // ---- BUILD SORT ----
        let sortOptions = { createdAt: -1 }; // Default: newest first

        if (sortBy) {
            const sortField = sortBy === 'price' ? 'pricing.weekdayPrice' : sortBy;
            const sortOrder = order === 'asc' ? 1 : -1;
            sortOptions = { [sortField]: sortOrder };
        }

        let properties = await Property.find(query)
            .populate('owner', 'name email')    // Populate basic owner info
            .populate('createdBy', 'name')
            .sort(sortOptions)
            .lean();

        properties = await enrichPropertiesWithMinPrice(properties);
        properties = await enrichPropertiesWithReviews(properties);

        res.status(200).json(properties);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// PUBLIC: GET SINGLE PROPERTY BY SLUG
// ==========================================

// @desc    Get a single property by its URL slug
// @route   GET /api/properties/:slug
// @access  Public
const getPropertyBySlug = async (req, res) => {
    try {
        let property = await Property.findOne({ slug: req.params.slug })
            .populate('owner', 'name email')
            .populate('createdBy', 'name')
            .lean();

        if (!property) {
            return res.status(404).json({ message: 'PROPERTY NOT FOUND' });
        }

        const enriched = await enrichPropertiesWithMinPrice([property]);
        const enrichedWithReviews = await enrichPropertiesWithReviews(enriched);

        res.status(200).json(enrichedWithReviews[0]);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// MANAGER: GET SINGLE PROPERTY BY ID
// ==========================================

// @desc    Get a single property by MongoDB _id (for manager edit forms)
// @route   GET /api/properties/id/:id
// @access  Manager only
const getPropertyById = async (req, res) => {
    try {
        let property = await Property.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('createdBy', 'name')
            .lean();

        if (!property) {
            return res.status(404).json({ message: 'PROPERTY NOT FOUND' });
        }

        const enriched = await enrichPropertiesWithMinPrice([property]);
        const enrichedWithReviews = await enrichPropertiesWithReviews(enriched);

        res.status(200).json(enrichedWithReviews[0]);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// MANAGER: CREATE PROPERTY
// ==========================================

// @desc    Create a new property (campsite or villa)
// @route   POST /api/properties
// @access  Manager only
const createProperty = async (req, res) => {
    try {
        const {
            name,
            type,
            shortDescription,
            description,
            location,
            address,
            coverImage,
            images,
            amenities,
            pricing,
            maxGuests,
            checkInTime,
            checkOutTime,
            rules,
            whatsappNumber,
            owner,
            isActive
        } = req.body;

        // ---- VALIDATE REQUIRED FIELDS ----
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Property name is required' });
        }
        if (!type || !['campsite', 'villa'].includes(type)) {
            return res.status(400).json({ message: 'Property type must be "campsite" or "villa"' });
        }

        // ---- GENERATE UNIQUE SLUG ----
        const slug = await generateUniqueSlug(name);

        // ---- CREATE PROPERTY ----
        const property = await Property.create({
            name: name.trim(),
            slug,
            type,
            shortDescription: shortDescription || '',
            description: description || '',
            location: location || '',
            address: address || '',
            coverImage: coverImage || '',
            images: images || [],
            amenities: amenities || [],
            pricing: {
                weekdayPrice: pricing?.weekdayPrice || 0,
                weekendPrice: pricing?.weekendPrice || 0,
                priceDisplay: pricing?.priceDisplay || '',
                pricePer: pricing?.pricePer || 'night'
            },
            maxGuests: maxGuests || 10,
            checkInTime: checkInTime || '2:00 PM',
            checkOutTime: checkOutTime || '11:00 AM',
            rules: rules || [],
            whatsappNumber: whatsappNumber || '',
            owner: owner || null,
            isActive: isActive !== undefined ? isActive : true,
            createdBy: req.user._id
        });

        // ---- SYNC OWNER ----
        if (owner) {
            await User.findByIdAndUpdate(owner, { $addToSet: { properties: property._id } });
        }

        res.status(201).json(property);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ==========================================
// MANAGER: UPDATE PROPERTY
// ==========================================

// @desc    Update a property by MongoDB _id
// @route   PUT /api/properties/:id
// @access  Manager only
const updateProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: 'PROPERTY NOT FOUND' });
        }

        // ---- HANDLE SLUG REGENERATION IF NAME CHANGES ----
        let updatedFields = { ...req.body };
        
        const oldOwner = property.owner;

        if (req.body.name && req.body.name.trim() !== property.name) {
            updatedFields.slug = await generateUniqueSlug(req.body.name.trim(), property._id);
            updatedFields.name = req.body.name.trim();
        }

        // ---- HANDLE NESTED PRICING UPDATE ----
        // Merge pricing sub-document rather than replacing it entirely
        if (req.body.pricing) {
            updatedFields.pricing = {
                weekdayPrice: req.body.pricing.weekdayPrice ?? property.pricing.weekdayPrice,
                weekendPrice: req.body.pricing.weekendPrice ?? property.pricing.weekendPrice,
                priceDisplay: req.body.pricing.priceDisplay ?? property.pricing.priceDisplay,
                pricePer: req.body.pricing.pricePer ?? property.pricing.pricePer
            };
        }

        const updatedProperty = await Property.findByIdAndUpdate(
            req.params.id,
            updatedFields,
            { new: true, runValidators: true }
        ).populate('owner', 'name email');

        // ---- SYNC OWNER IF CHANGED ----
        if (req.body.owner !== undefined && String(oldOwner) !== String(req.body.owner)) {
            if (oldOwner) {
                await User.findByIdAndUpdate(oldOwner, { $pull: { properties: property._id } });
            }
            if (req.body.owner) {
                await User.findByIdAndUpdate(req.body.owner, { $addToSet: { properties: property._id } });
            }
        }

        res.status(200).json(updatedProperty);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// ==========================================
// MANAGER: DELETE PROPERTY
// ==========================================

// @desc    Delete a property permanently (hard delete)
//          In Phase 2+ we will add a check: cannot delete if active bookings exist.
// @route   DELETE /api/properties/:id
// @access  Manager only
const deleteProperty = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: 'PROPERTY NOT FOUND' });
        }

        // 1. CHECK FOR UPCOMING ACTIVE BOOKINGS
        const Booking = require('../models/Booking');
        const activeBookings = await Booking.countDocuments({
            property: property._id,
            status: { $in: ['pending', 'confirmed'] },
            checkOut: { $gt: new Date() }
        });

        if (activeBookings > 0) {
            return res.status(400).json({ message: 'Cannot delete property with upcoming active bookings. Cancel them first.' });
        }

        // 2. CASCADE DELETIONS TO CLEAN UP ORPHANED RECORDS
        const Review = require('../models/Review');
        const BlockedDate = require('../models/BlockedDate');
        const Package = require('../models/Package');
        const Revenue = require('../models/Revenue');

        await Promise.all([
            Booking.deleteMany({ property: property._id }),
            Review.deleteMany({ property: property._id }),
            BlockedDate.deleteMany({ property: property._id }),
            Package.deleteMany({ property: property._id }),
            Revenue.deleteMany({ propertyId: property._id }),
            User.updateMany({}, { $pull: { properties: property._id } }) // SYNC OWNER
        ]);

        await property.deleteOne();

        res.status(200).json({
            id: req.params.id,
            message: `PROPERTY "${property.name}" AND RELATED RECORDS DELETED SUCCESSFULLY`
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// ==========================================
// MANAGER: TOGGLE PROPERTY ACTIVE STATUS
// ==========================================

// @desc    Quickly toggle isActive without a full update
// @route   PATCH /api/properties/:id/status
// @access  Manager only
const togglePropertyStatus = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: 'PROPERTY NOT FOUND' });
        }

        property.isActive = !property.isActive;
        const updated = await property.save();

        res.status(200).json({
            message: `Property is now ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}`,
            isActive: updated.isActive,
            property: updated
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

module.exports = {
    getProperties,
    getPropertyBySlug,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    togglePropertyStatus
};
