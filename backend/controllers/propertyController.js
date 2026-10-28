const jwt = require('jsonwebtoken');
const Property = require('../models/Property');
const User = require('../models/User');
const Package = require('../models/Package');
const Review = require('../models/Review');
const { generateUniqueSlug } = require('../utils/slugify');
const { escapeRegex, optionalString } = require('../utils/validate');

// ==========================================
// OWNER PROJECTION FIELDS
// ==========================================
// Public responses expose the owner NAME only. The owner email address is
// personally identifiable information and must never leave the server on an
// unauthenticated route.
const OWNER_FIELDS_PUBLIC = 'name';
// Manager-authenticated responses keep the previous behaviour (name + email).
const OWNER_FIELDS_MANAGER = 'name email';

// ==========================================
// HELPER: IS THIS REQUEST MADE BY A MANAGER?
// ==========================================
// GET /api/properties and GET /api/properties/:slug are PUBLIC routes, but the
// manager dashboard reads them with a bearer token and needs the full record
// (exact address + owner email) for its edit forms and search.
// Unauthenticated callers are ALWAYS redacted — a missing/invalid token just
// means "public view".
const isManagerRequest = async (req) => {
    const authHeader = req.headers && req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return false;
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        return !!user && user.role === 'manager';
    } catch (error) {
        return false;
    }
};

// ==========================================
// HELPER: REDACT A PROPERTY FOR PUBLIC USE
// ==========================================
// Removes personally identifiable information from a property payload:
//  - the exact street address of the property
//  - every owner contact detail (email / phone / password hash)
const PUBLIC_REDACTED_PROPERTY_FIELDS = ['address', 'createdBy'];
const PUBLIC_REDACTED_OWNER_FIELDS = ['email', 'phone', 'password'];

const redactPropertyForPublic = (property) => {
    if (!property) return property;

    const safeProperty = { ...property };
    PUBLIC_REDACTED_PROPERTY_FIELDS.forEach(field => {
        delete safeProperty[field];
    });

    if (safeProperty.owner && typeof safeProperty.owner === 'object') {
        const safeOwner = { ...safeProperty.owner };
        PUBLIC_REDACTED_OWNER_FIELDS.forEach(field => {
            delete safeOwner[field];
        });
        safeProperty.owner = safeOwner;
    }

    return safeProperty;
};

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
        const type = optionalString(req.query.type, 20);
        const location = optionalString(req.query.location, 80);
        const search = optionalString(req.query.search, 120);
        const isActive = optionalString(req.query.isActive, 10);
        const sortBy = optionalString(req.query.sortBy, 20);
        const order = optionalString(req.query.order, 5);

        // Whether the caller is an authenticated manager decides both the
        // projection (owner email/address) and which filters are allowed.
        const managerView = await isManagerRequest(req);

        // ---- BUILD QUERY OBJECT ----
        let query = {};

        // Filter by property type (campsite or villa)
        if (type && ['campsite', 'villa'].includes(type)) {
            query.type = type;
        }

        // Filter by location (case-insensitive partial match)
        // The value is regex-escaped so user input cannot inject operators
        // such as `.*` or expensive backtracking patterns.
        if (location && location.trim()) {
            query.location = { $regex: escapeRegex(location.trim().slice(0, 80)), $options: 'i' };
        }

        // Full-text search across name, location, shortDescription
        if (search && search.trim()) {
            query.$text = { $search: search.trim().slice(0, 120) };
        }

        // Filter by active status — public API always defaults to active only.
        // `isActive=all` and `isActive=false` are manager-only capabilities;
        // otherwise a public caller could enumerate unpublished drafts.
        if (isActive === 'all' || isActive === 'false') {
            if (managerView) {
                if (isActive === 'false') query.isActive = false;
            } else {
                query.isActive = true;
            }
        } else if (isActive === 'true') {
            query.isActive = true;
        } else {
            query.isActive = true;
        }

        // ---- BUILD SORT (allow-listed) ----
        let sortOptions = { createdAt: -1 }; // Default: newest first

        const SORTABLE_FIELDS = {
            price: 'pricing.weekdayPrice',
            createdAt: 'createdAt',
            name: 'name',
            updatedAt: 'updatedAt'
        };
        if (sortBy && SORTABLE_FIELDS[sortBy]) {
            const sortOrder = order === 'asc' ? 1 : -1;
            sortOptions = { [SORTABLE_FIELDS[sortBy]]: sortOrder };
        }

        let properties = await Property.find(query)
            .populate('owner', managerView ? OWNER_FIELDS_MANAGER : OWNER_FIELDS_PUBLIC)
            .populate('createdBy', 'name')
            .sort(sortOptions)
            .lean();

        properties = await enrichPropertiesWithMinPrice(properties);
        properties = await enrichPropertiesWithReviews(properties);

        if (!managerView) {
            properties = properties.map(redactPropertyForPublic);
        }

        res.status(200).json(properties);
    } catch (error) {
        console.error('[ PROPERTY ] request failed:', error.message);
        return res.status(500).json({ message: 'Unable to process the request' });
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
        // Unauthenticated callers get the redacted (public) projection.
        const managerView = await isManagerRequest(req);

        const property = await Property.findOne({
            slug: req.params.slug,
            // Unpublished properties must 404 for anonymous visitors.
            ...(managerView ? {} : { isActive: true })
        })
            .populate('owner', managerView ? OWNER_FIELDS_MANAGER : OWNER_FIELDS_PUBLIC)
            .populate('createdBy', 'name')
            .lean();

        if (!property) {
            return res.status(404).json({ message: 'PROPERTY NOT FOUND' });
        }

        const enriched = await enrichPropertiesWithMinPrice([property]);
        const enrichedWithReviews = await enrichPropertiesWithReviews(enriched);
        const result = enrichedWithReviews[0];

        res.status(200).json(managerView ? result : redactPropertyForPublic(result));
    } catch (error) {
        console.error('[ PROPERTY ] request failed:', error.message);
        return res.status(500).json({ message: 'Unable to process the request' });
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
            .populate('owner', OWNER_FIELDS_MANAGER)
            .populate('createdBy', 'name')
            .lean();

        if (!property) {
            return res.status(404).json({ message: 'PROPERTY NOT FOUND' });
        }

        const enriched = await enrichPropertiesWithMinPrice([property]);
        const enrichedWithReviews = await enrichPropertiesWithReviews(enriched);

        res.status(200).json(enrichedWithReviews[0]);
    } catch (error) {
        console.error('[ PROPERTY ] request failed:', error.message);
        return res.status(500).json({ message: 'Unable to process the request' });
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
        if (maxGuests !== undefined && (Number(maxGuests) <= 0 || isNaN(Number(maxGuests)))) {
            return res.status(400).json({ message: 'Maximum guests must be greater than 0' });
        }
        if (pricing) {
            if (pricing.weekdayPrice !== undefined && Number(pricing.weekdayPrice) < 0) {
                return res.status(400).json({ message: 'Weekday price cannot be negative' });
            }
            if (pricing.weekendPrice !== undefined && Number(pricing.weekendPrice) < 0) {
                return res.status(400).json({ message: 'Weekend price cannot be negative' });
            }
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
        console.error('[ PROPERTY ] create failed:', error.message);
        return res.status(400).json({ message: 'Unable to create the property. Please check the submitted values.' });
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

        if (req.body.maxGuests !== undefined && (Number(req.body.maxGuests) <= 0 || isNaN(Number(req.body.maxGuests)))) {
            return res.status(400).json({ message: 'Maximum guests must be greater than 0' });
        }
        if (req.body.pricing) {
            if (req.body.pricing.weekdayPrice !== undefined && Number(req.body.pricing.weekdayPrice) < 0) {
                return res.status(400).json({ message: 'Weekday price cannot be negative' });
            }
            if (req.body.pricing.weekendPrice !== undefined && Number(req.body.pricing.weekendPrice) < 0) {
                return res.status(400).json({ message: 'Weekend price cannot be negative' });
            }
        }

        // ---- ALLOW-LISTED UPDATE ----
        // The previous version spread `req.body` straight into the update,
        // which let a caller write any schema field (mass assignment),
        // including `createdBy` and `slug`.
        const ALLOWED_FIELDS = [
            'name', 'type', 'shortDescription', 'description', 'location', 'address',
            'coverImage', 'images', 'amenities', 'maxGuests', 'checkInTime',
            'checkOutTime', 'rules', 'whatsappNumber', 'isActive'
        ];

        let updatedFields = {};
        ALLOWED_FIELDS.forEach((field) => {
            if (req.body[field] !== undefined) updatedFields[field] = req.body[field];
        });

        // Array fields must actually be arrays of strings.
        ['images', 'amenities', 'rules'].forEach((field) => {
            if (updatedFields[field] !== undefined) {
                if (!Array.isArray(updatedFields[field])) {
                    updatedFields[field] = [];
                } else {
                    updatedFields[field] = updatedFields[field]
                        .filter((item) => typeof item === 'string')
                        .slice(0, 50);
                }
            }
        });

        // ---- OWNER REASSIGNMENT (validated ObjectId or null) ----
        let requestedOwner;
        if (req.body.owner !== undefined) {
            if (req.body.owner === null || req.body.owner === '') {
                requestedOwner = null;
            } else if (optionalObjectId(req.body.owner)) {
                requestedOwner = req.body.owner;
            } else {
                return res.status(400).json({ message: 'Invalid owner id' });
            }
            updatedFields.owner = requestedOwner;
        }

        const oldOwner = property.owner;

        // ---- HANDLE SLUG REGENERATION IF NAME CHANGES ----
        const newName = optionalString(req.body.name, 120);
        if (newName && newName !== property.name) {
            updatedFields.slug = await generateUniqueSlug(newName, property._id);
            updatedFields.name = newName;
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
        ).populate('owner', OWNER_FIELDS_MANAGER);

        // ---- SYNC OWNER IF CHANGED ----
        if (requestedOwner !== undefined && String(oldOwner) !== String(requestedOwner)) {
            if (oldOwner) {
                await User.findByIdAndUpdate(oldOwner, { $pull: { properties: property._id } });
            }
            if (requestedOwner) {
                await User.findByIdAndUpdate(requestedOwner, { $addToSet: { properties: property._id } });
            }
        }

        audit(req, 'property.updated', {
            targetId: property._id,
            targetType: 'Property',
            meta: { fields: Object.keys(updatedFields) }
        });

        res.status(200).json(updatedProperty);
    } catch (error) {
        console.error('[ PROPERTY ] update failed:', error.message);
        return res.status(400).json({ message: 'Unable to update the property. Please check the submitted values.' });
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
        console.error('[ PROPERTY ] request failed:', error.message);
        return res.status(500).json({ message: 'Unable to process the request' });
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
        console.error('[ PROPERTY ] request failed:', error.message);
        return res.status(500).json({ message: 'Unable to process the request' });
    }
};

module.exports = {
    getProperties,
    getPropertyBySlug,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    togglePropertyStatus,
    redactPropertyForPublic
};
