const SiteSettings = require('../models/SiteSettings');

// @desc    GET SITE SETTINGS (PUBLIC)
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.getSingleton();
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

// @desc    UPDATE SITE SETTINGS
// @route   PUT /api/settings
// @access  Private (Manager Only)
const updateSettings = async (req, res) => {
    try {
        const { whatsappNumber } = req.body;

        if (!whatsappNumber) {
            return res.status(400).json({ message: 'PLEASE PROVIDE A WHATSAPP NUMBER' });
        }

        const settings = await SiteSettings.getSingleton();
        settings.whatsappNumber = whatsappNumber;
        await settings.save();

        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: `SERVER ERROR: ${error.message}` });
    }
};

module.exports = { getSettings, updateSettings };
