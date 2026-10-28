const mongoose = require('mongoose');

// SITE SETTINGS SCHEMA (SINGLETON)
const siteSettingsSchema = new mongoose.Schema({
    whatsappNumber: {
        type: String,
        // No personal number is baked into the source. The manager sets the
        // business WhatsApp number from the Settings page.
        default: ''
    }
}, {
    timestamps: true
});

// STATIC METHOD: GET OR CREATE THE SINGLETON SETTINGS DOCUMENT
siteSettingsSchema.statics.getSingleton = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
