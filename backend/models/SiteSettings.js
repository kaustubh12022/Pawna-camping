const mongoose = require('mongoose');

// SITE SETTINGS SCHEMA (SINGLETON)
const siteSettingsSchema = new mongoose.Schema({
    whatsappNumber: {
        type: String,
        default: '919975526627'
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
