const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getBlockedDates,
    createBlockedDate,
    deleteBlockedDate
} = require('../controllers/blockedDateController');

// All routes are protected (manager/owner only)
router.use(protect);

router.route('/')
    .get(getBlockedDates)
    .post(createBlockedDate);

router.route('/:id')
    .delete(deleteBlockedDate);

module.exports = router;
