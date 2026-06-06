const express = require('express');
const router = express.Router();

const {
    createOwner,
    listOwners,
    getOwnerById,
    assignProperties,
    updateOwner,
    deleteOwner,
    resetOwnerPassword
} = require('../controllers/ownerController');

const { protect, authorize } = require('../middleware/authMiddleware');

// ==========================================
// ALL OWNER MANAGEMENT ROUTES — Manager only
// ==========================================
// Phase 3: Owners are managed exclusively by the manager.
// These routes handle owner CRUD and property assignment.
// ==========================================

router.use(protect);
router.use(authorize('manager'));

// @route   GET  /api/owners
// @desc    List all owners (with populated properties)
router.get('/', listOwners);

// @route   POST /api/owners
// @desc    Create a new owner account
router.post('/', createOwner);

// @route   GET  /api/owners/:id
// @desc    Get a single owner by ID
router.get('/:id', getOwnerById);

// @route   PUT  /api/owners/:id
// @desc    Update owner profile (name, phone, email)
router.put('/:id', updateOwner);

// @route   PUT  /api/owners/:id/properties
// @desc    Assign/replace properties for an owner
router.put('/:id/properties', assignProperties);

// @route   PUT  /api/owners/:id/reset-password
// @desc    Reset password for a specific user (works for owners AND managers)
router.put('/:id/reset-password', resetOwnerPassword);

// @route   DELETE /api/owners/:id
// @desc    Delete an owner account
router.delete('/:id', deleteOwner);

module.exports = router;
