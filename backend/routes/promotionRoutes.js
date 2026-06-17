const express = require('express');
const router = express.Router();
const { getCurrentPromotion } = require('../controllers/promotionController');

router.get('/current', getCurrentPromotion);

module.exports = router;
