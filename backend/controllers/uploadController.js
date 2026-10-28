const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// ==========================================
// FILE SIGNATURE VALIDATION
// ==========================================
// `file.mimetype` is supplied by the client and is trivially spoofed, so a
// malicious file could be uploaded as "image/png". We verify the actual magic
// bytes before anything reaches Cloudinary.
const ALLOWED_SIGNATURES = [
    { type: 'image/jpeg', match: (b) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
    { type: 'image/png', match: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
    { type: 'image/gif', match: (b) => b.slice(0, 4).toString('ascii') === 'GIF8' },
    { type: 'image/webp', match: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
    { type: 'video/mp4', match: (b) => b.slice(4, 8).toString('ascii') === 'ftyp' },
    { type: 'video/webm', match: (b) => b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3 }
];

const detectMediaType = (buffer) => {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
    const found = ALLOWED_SIGNATURES.find((signature) => {
        try { return signature.match(buffer); } catch { return false; }
    });
    return found ? found.type : null;
};

const assertAllowedMedia = (file) => {
    const detected = detectMediaType(file?.buffer);
    if (!detected) {
        const err = new Error('Unsupported file type. Upload a JPEG, PNG, GIF, WebP, MP4 or WebM file.');
        err.statusCode = 400;
        throw err;
    }
    return detected;
};


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
        assertAllowedMedia(req.file);
        const result = await streamUpload(req.file.buffer);
        res.json({ url: result.secure_url, publicId: result.public_id });
    } catch (err) {
        console.error('[ UPLOAD ] failed:', err.message);
        res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'Upload failed' });
    }
};

// POST /api/upload/bulk
const uploadMultipleImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files provided' });

        // Validate every file before uploading any of them.
        req.files.forEach(assertAllowedMedia);

        const uploadPromises = req.files.map(file => streamUpload(file.buffer));
        const results = await Promise.all(uploadPromises);
        
        const uploadedFiles = results.map(result => ({
            url: result.secure_url,
            publicId: result.public_id
        }));
        
        res.json(uploadedFiles);
    } catch (err) {
        console.error('[ UPLOAD ] bulk failed:', err.message);
        res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'Upload failed' });
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
        console.error('[ UPLOAD ] delete failed:', err.message);
        return res.status(500).json({ message: 'Unable to delete the file' });
    }
};

module.exports = { uploadImage, uploadMultipleImages, deleteImage };
