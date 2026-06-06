const cloudinary = require('cloudinary').v2;

// Validate Cloudinary credentials exist before configuring
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
    console.error('[ CLOUDINARY ERROR ] Missing Cloudinary credentials!');
    console.error('  CLOUDINARY_CLOUD_NAME:', cloudName ? '✓ set' : '✗ MISSING');
    console.error('  CLOUDINARY_API_KEY:', apiKey ? '✓ set' : '✗ MISSING');
    console.error('  CLOUDINARY_API_SECRET:', apiSecret ? '✓ set' : '✗ MISSING');
    console.error('  Make sure these are set in your .env file or environment variables.');
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

module.exports = cloudinary;
