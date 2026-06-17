// ==========================================
// PROMOTIONS CONTROLLER
// Deterministic algorithm for dynamic promotions
// ==========================================

const WEEKDAY_DISCOUNTS = [15, 18, 20, 22, 25];
const WEEKEND_DISCOUNTS = [25, 30, 32, 35, 40];

const PROMOTIONAL_PHRASES = [
    "🔥 Flash Sale! Get {discount}% OFF on all bookings.",
    "✨ Special Deal! Save {discount}% on your next stay.",
    "🌧️ Monsoon Offer! Enjoy a flat {discount}% OFF today.",
    "🌟 Limited Time: Claim your {discount}% discount now!",
    "🏕️ Wilderness Escape: Get {discount}% OFF on all properties."
];

const WEEKEND_PHRASES = [
    "🎉 Weekend Getaway Deal! Save {discount}% this weekend.",
    "✨ Relax and Unwind: Special {discount}% OFF for the weekend!",
    "🔥 Super Weekend Sale! Lock in {discount}% OFF now."
];

// Helper to generate a deterministic pseudo-random number from a string
const getHashFromString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

// @desc    Get current dynamic promotion
// @route   GET /api/promotions/current
// @access  Public
const getCurrentPromotion = (req, res) => {
    try {
        // Use Indian Standard Time (IST) for rotation to match user locale
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
        
        // Date string e.g., "2023-10-25" -> changes exactly once per day
        const dateString = istDate.toISOString().split('T')[0];
        
        const dayOfWeek = istDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat, Sun

        const seed = getHashFromString(dateString);

        let discountPercent = 0;
        let bannerMessage = "";

        if (isWeekend) {
            discountPercent = WEEKEND_DISCOUNTS[seed % WEEKEND_DISCOUNTS.length];
            const phraseTemplate = WEEKEND_PHRASES[seed % WEEKEND_PHRASES.length];
            bannerMessage = phraseTemplate.replace('{discount}', discountPercent);
        } else {
            discountPercent = WEEKDAY_DISCOUNTS[seed % WEEKDAY_DISCOUNTS.length];
            const phraseTemplate = PROMOTIONAL_PHRASES[seed % PROMOTIONAL_PHRASES.length];
            bannerMessage = phraseTemplate.replace('{discount}', discountPercent);
        }

        res.status(200).json({
            date: dateString,
            isWeekend,
            discountPercent,
            bannerMessage
        });
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

module.exports = {
    getCurrentPromotion
};
