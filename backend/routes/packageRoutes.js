const express = require('express');
const router = express.Router();
const {
    getPackages,
    createPackage,
    updatePackage,
    deletePackage
} = require('../controllers/packageController');
const { protect, authorize } = require('../middleware/authMiddleware');

// PUBLIC ROUTES
router.get('/', getPackages);

// PROTECTED ROUTES (Manager and Owner)
router.post('/', protect, authorize('manager', 'owner'), createPackage);
router.put('/:id', protect, authorize('manager', 'owner'), updatePackage);
router.delete('/:id', protect, authorize('manager', 'owner'), deletePackage);

module.exports = router;
