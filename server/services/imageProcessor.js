const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const HANGER_DIR = path.join(UPLOADS_DIR, 'products', 'hangers');
const GALLERY_DIR = path.join(UPLOADS_DIR, 'products', 'gallery');
const REVIEW_DIR = path.join(UPLOADS_DIR, 'reviews');

const HANGER_MAX_DIMENSION = 1600;
const GALLERY_MAX_DIMENSION = 1800;
const THUMBNAIL_MAX_DIMENSION = 400;
const REVIEWER_AVATAR_MAX_DIMENSION = 300;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function extensionFor(mimetype) {
  if (mimetype === 'image/jpeg') return 'jpg';
  if (mimetype === 'image/webp') return 'webp';
  return 'png';
}

function encode(pipeline, ext) {
  if (ext === 'jpg') return pipeline.jpeg({ quality: JPEG_QUALITY });
  if (ext === 'webp') return pipeline.webp({ quality: WEBP_QUALITY });
  return pipeline.png();
}

// Re-encodes as PNG (keeps the alpha channel — critical for a transparent
// cutout) and resizes with `fit: 'inside'`, which guarantees the aspect
// ratio is always preserved (never stretched, squashed, or cropped) and
// never upscales a smaller source image. Written to a filename keyed by
// productId, so re-uploading a hanger image on edit simply overwrites it.
async function processHangerImage(buffer, productId) {
  await ensureDir(HANGER_DIR);
  const filename = `${productId}.png`;
  await sharp(buffer)
    .resize({ width: HANGER_MAX_DIMENSION, height: HANGER_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .png()
    .toFile(path.join(HANGER_DIR, filename));
  return `/uploads/products/hangers/${filename}`;
}

// Re-encodes a gallery photo (quality-compressed, resized-inside, never
// upscaled) plus a thumbnail, keeping whatever format the source already
// is (PNG stays PNG so transparency survives). This — never the raw
// upload — is what gets written to disk, which also strips EXIF metadata.
async function processGalleryImage(buffer, mimetype, productId) {
  const dir = path.join(GALLERY_DIR, productId);
  await ensureDir(dir);
  const ext = extensionFor(mimetype);
  const id = crypto.randomUUID();
  const filename = `${id}.${ext}`;
  const thumbFilename = `thumb-${id}.${ext}`;

  const full = sharp(buffer).resize({
    width: GALLERY_MAX_DIMENSION,
    height: GALLERY_MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const thumb = sharp(buffer).resize({
    width: THUMBNAIL_MAX_DIMENSION,
    height: THUMBNAIL_MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });

  await Promise.all([
    encode(full, ext).toFile(path.join(dir, filename)),
    encode(thumb, ext).toFile(path.join(dir, thumbFilename)),
  ]);

  return {
    url: `/uploads/products/gallery/${productId}/${filename}`,
    thumbnailUrl: `/uploads/products/gallery/${productId}/${thumbFilename}`,
  };
}

// Small avatar photo for a review's customer — same re-encode/resize/
// never-upscale treatment as the product images, keyed by reviewId so
// re-uploading on edit simply overwrites it.
async function processReviewerImage(buffer, mimetype, reviewId) {
  await ensureDir(REVIEW_DIR);
  const ext = extensionFor(mimetype);
  const filename = `${reviewId}.${ext}`;
  const pipeline = sharp(buffer).resize({
    width: REVIEWER_AVATAR_MAX_DIMENSION,
    height: REVIEWER_AVATAR_MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });
  await encode(pipeline, ext).toFile(path.join(REVIEW_DIR, filename));
  return `/uploads/reviews/${filename}`;
}

// Deletes every gallery file for a product (used on product delete, and
// before re-writing gallery images on edit).
async function removeGalleryDir(productId) {
  await fs.rm(path.join(GALLERY_DIR, productId), { recursive: true, force: true });
}

// Deletes one already-processed file given its public URL. Resolves the
// URL back under PUBLIC_DIR/uploads and refuses to touch anything outside
// it, since the URL ultimately originates from admin-controlled input.
async function removePublicFile(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const filePath = path.join(PUBLIC_DIR, url);
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return;
  await fs.rm(filePath, { force: true });
}

// Physically copies a product's image files onto a new productId's own
// paths (used by "Duplicate product"). This is deliberate, not a
// shortcut: files are deleted by productId-scoped path when a product is
// removed, so a duplicate that merely pointed at the original's URLs
// would have its images silently deleted the moment the original product
// was deleted.
async function duplicateHangerImage(sourceUrl, newProductId) {
  if (!sourceUrl) return sourceUrl;
  await ensureDir(HANGER_DIR);
  const destUrl = `/uploads/products/hangers/${newProductId}.png`;
  await fs.copyFile(path.join(PUBLIC_DIR, sourceUrl), path.join(PUBLIC_DIR, destUrl));
  return destUrl;
}

async function duplicateGalleryImages(galleryImages, newProductId) {
  const dir = path.join(GALLERY_DIR, newProductId);
  await ensureDir(dir);
  const out = [];
  for (const g of galleryImages) {
    const urlName = path.basename(g.url);
    const thumbName = path.basename(g.thumbnailUrl);
    const destUrl = `/uploads/products/gallery/${newProductId}/${urlName}`;
    const destThumb = `/uploads/products/gallery/${newProductId}/${thumbName}`;
    await fs.copyFile(path.join(PUBLIC_DIR, g.url), path.join(PUBLIC_DIR, destUrl));
    await fs.copyFile(path.join(PUBLIC_DIR, g.thumbnailUrl), path.join(PUBLIC_DIR, destThumb));
    out.push({ url: destUrl, thumbnailUrl: destThumb, order: g.order });
  }
  return out;
}

module.exports = {
  processHangerImage,
  processGalleryImage,
  processReviewerImage,
  removeGalleryDir,
  removePublicFile,
  duplicateHangerImage,
  duplicateGalleryImages,
};
