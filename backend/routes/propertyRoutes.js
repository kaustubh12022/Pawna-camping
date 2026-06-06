const express = require('express');
const router = express.Router();

const {
    getProperties,
    getPropertyBySlug,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    togglePropertyStatus
} = require('../controllers/propertyController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// PUBLIC ROUTES — No auth required
// ==========================================

// @route   GET /api/properties
// @desc    List all properties (with optional ?type=campsite|villa, ?location=, ?search=, ?sortBy=price, ?order=asc|desc)
// @access  Public
router.get('/', getProperties);

// @route   GET /api/properties/:slug
// @desc    Get one property by slug (for public detail page)
// @access  Public
// NOTE: This must come BEFORE /:id routes to avoid slug being matched as id
router.get('/:slug', getPropertyBySlug);

// ==========================================
// MANAGER ONLY ROUTES — JWT required, manager role required
// ==========================================
router.use(protect);
router.use(authorize('manager'));

// @route   GET /api/properties/id/:id
// @desc    Get one property by MongoDB _id (for manager edit forms)
// @access  Manager only
router.get('/id/:id', getPropertyById);

// @route   POST /api/properties
// @desc    Create a new property (campsite or villa)
// @access  Manager only
router.post('/', createProperty);

// @route   PUT /api/properties/:id
// @desc    Update a property by MongoDB _id
// @access  Manager only
router.put('/:id', updateProperty);

// @route   PATCH /api/properties/:id/status
// @desc    Toggle isActive status of a property
// @access  Manager only
router.patch('/:id/status', togglePropertyStatus);

// @route   DELETE /api/properties/:id
// @desc    Delete a property permanently
// @access  Manager only
router.delete('/:id', deleteProperty);

module.exports = router;
