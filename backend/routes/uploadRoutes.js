const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadImage, uploadMultipleImages, deleteImage } = require('../controllers/uploadController');

// Memory storage — no temp files on disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max limit
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm'
        ];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only JPEG, PNG, GIF, WebP, MP4 and WebM files are allowed'), false);
    }
});

router.post('/', protect, authorize('manager'), upload.single('image'), uploadImage);
router.post('/bulk', protect, authorize('manager'), upload.array('images', 10), uploadMultipleImages);
router.delete('/:publicId', protect, authorize('manager'), deleteImage);

module.exports = router;
