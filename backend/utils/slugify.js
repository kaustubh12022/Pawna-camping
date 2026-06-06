const Property = require('../models/Property');

// ==========================================
// SLUG GENERATION UTILITY
// ==========================================

/**
 * Convert a string into a URL-safe slug
 * Example: "Cozy Lake Camp" → "cozy-lake-camp"
 */
const generateSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')     // Remove non-word chars (except hyphens)
        .replace(/[\s_]+/g, '-')       // Replace spaces/underscores with hyphens
        .replace(/--+/g, '-')          // Collapse multiple hyphens
        .replace(/^-+|-+$/g, '');      // Trim leading/trailing hyphens
};

/**
 * Generate a unique slug for a property.
 * If "cozy-lake-camp" already exists, it tries "cozy-lake-camp-2", "cozy-lake-camp-3", etc.
 * 
 * @param {string} name - The property name to slugify
 * @param {string|null} excludeId - MongoDB _id to exclude (for updates, to avoid self-conflict)
 * @returns {string} A unique slug
 */
const generateUniqueSlug = async (name, excludeId = null) => {
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 2;

    while (true) {
        const query = { slug };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }

        const existing = await Property.findOne(query);
        if (!existing) break; // Slug is available

        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};

module.exports = { generateSlug, generateUniqueSlug };
