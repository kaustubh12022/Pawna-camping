const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Pre-flight check for Cloudinary configuration
const ensureCloudinaryConfigured = () => {
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
        const err = new Error(
            'Cloudinary is not configured. Missing API credentials. ' +
            'Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.'
        );
        err.status = 500;
        throw err;
    }
};

// Helper to upload a single buffer to Cloudinary
const streamUpload = (buffer, folder = 'lonavala-stays') => {
    ensureCloudinaryConfigured();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: folder, resource_type: 'auto' }, // auto supports both image and video
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        Readable.from(buffer).pipe(stream);
    });
};

// POST /api/upload  — manager only
// Accepts multipart/form-data with field "image"
const uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file provided' });
        const result = await streamUpload(req.file.buffer);
        res.json({ url: result.secure_url, publicId: result.public_id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/upload/bulk
const uploadMultipleImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files provided' });
        
        const uploadPromises = req.files.map(file => streamUpload(file.buffer));
        const results = await Promise.all(uploadPromises);
        
        const uploadedFiles = results.map(result => ({
            url: result.secure_url,
            publicId: result.public_id
        }));
        
        res.json(uploadedFiles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/upload/:publicId
const deleteImage = async (req, res) => {
    try {
        const { publicId } = req.params;
        // The publicId coming from URL params might have slashes encoded or it might be passed in body
        // Cloudinary requires the full publicId (e.g. folder/filename)
        // Let's decode it just in case
        const decodedId = decodeURIComponent(publicId);
        
        await cloudinary.uploader.destroy(decodedId);
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { uploadImage, uploadMultipleImages, deleteImage };
