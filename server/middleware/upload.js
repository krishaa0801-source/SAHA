const multer = require('multer');

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_GALLERY_IMAGES = 12;

// Memory storage: nothing touches disk until server/services/imageProcessor.js
// has re-encoded it through sharp — the raw upload is never trusted or
// saved as-is (that also strips EXIF metadata from the final files).
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(new Error('Only PNG, JPG, JPEG, and WebP images are allowed.'));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_GALLERY_IMAGES + 1 },
});

// Used on the product create/update routes — a single hanger image plus
// up to MAX_GALLERY_IMAGES gallery photos in one multipart request.
const productImageUpload = upload.fields([
  { name: 'hangerImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: MAX_GALLERY_IMAGES },
]);

// Used on the review create/update routes — a single optional customer
// avatar photo.
const reviewImageUpload = upload.fields([{ name: 'customerImage', maxCount: 1 }]);

module.exports = { productImageUpload, reviewImageUpload, MAX_GALLERY_IMAGES };
