const crypto = require('crypto');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

// cloudinary auto-configures itself from process.env.CLOUDINARY_URL
// (cloudinary://<api_key>:<api_secret>@<cloud_name>) — no explicit
// .config() call needed. See .env.example for where that comes from.
//
// Every product/review image is uploaded here, never written to local
// disk: this app's Node.js hosting rebuilds the app directory from
// scratch on every deploy, which was silently wiping anything written to
// disk at runtime (the old public/uploads/ approach). Cloudinary is the
// fix — uploaded images now live independently of app deploys.

const HANGER_MAX_DIMENSION = 1600;
const GALLERY_MAX_DIMENSION = 1800;
const THUMBNAIL_MAX_DIMENSION = 400;
const REVIEWER_AVATAR_MAX_DIMENSION = 300;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;

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

// Uploads an already-processed buffer under a fixed public_id (so
// re-uploading on edit overwrites the same asset instead of accumulating
// orphans) and resolves with Cloudinary's response — callers only ever
// need .secure_url.
function uploadBuffer(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ public_id: publicId, overwrite: true }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
}

// Re-encodes as PNG (keeps the alpha channel — critical for a transparent
// cutout) and resizes with `fit: 'inside'`, which guarantees the aspect
// ratio is always preserved (never stretched, squashed, or cropped) and
// never upscales a smaller source image. Uploaded under a public_id keyed
// by productId, so re-uploading a hanger image on edit simply overwrites it.
async function processHangerImage(buffer, productId) {
  const processed = await sharp(buffer)
    .resize({ width: HANGER_MAX_DIMENSION, height: HANGER_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const result = await uploadBuffer(processed, `products/hangers/${productId}`);
  return result.secure_url;
}

// Re-encodes a gallery photo (quality-compressed, resized-inside, never
// upscaled) plus a thumbnail, keeping whatever format the source already
// is (PNG stays PNG so transparency survives). This — never the raw
// upload — is what gets uploaded, which also strips EXIF metadata.
async function processGalleryImage(buffer, mimetype, productId) {
  const ext = extensionFor(mimetype);
  const id = crypto.randomUUID();

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

  const [fullBuffer, thumbBuffer] = await Promise.all([encode(full, ext).toBuffer(), encode(thumb, ext).toBuffer()]);
  const [fullResult, thumbResult] = await Promise.all([
    uploadBuffer(fullBuffer, `products/gallery/${productId}/${id}`),
    uploadBuffer(thumbBuffer, `products/gallery/${productId}/thumb-${id}`),
  ]);

  return { url: fullResult.secure_url, thumbnailUrl: thumbResult.secure_url };
}

// Small avatar photo for a review's customer — same re-encode/resize/
// never-upscale treatment as the product images, keyed by reviewId so
// re-uploading on edit simply overwrites it.
async function processReviewerImage(buffer, mimetype, reviewId) {
  const ext = extensionFor(mimetype);
  const pipeline = sharp(buffer).resize({
    width: REVIEWER_AVATAR_MAX_DIMENSION,
    height: REVIEWER_AVATAR_MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const processed = await encode(pipeline, ext).toBuffer();
  const result = await uploadBuffer(processed, `reviews/${reviewId}`);
  return result.secure_url;
}

// Deletes every gallery asset for a product (used on product delete, and
// before re-writing gallery images on edit).
async function removeGalleryDir(productId) {
  await cloudinary.api.delete_resources_by_prefix(`products/gallery/${productId}/`).catch(() => {});
}

// Recovers the public_id Cloudinary needs for destroy() from a
// secure_url like https://res.cloudinary.com/<cloud>/image/upload/v.../products/hangers/abc.png
// -> products/hangers/abc
function publicIdFromUrl(url) {
  const marker = '/upload/';
  const i = url.indexOf(marker);
  if (i === -1) return null;
  let rest = url.slice(i + marker.length);
  rest = rest.replace(/^v\d+\//, ''); // drop the version segment
  rest = rest.replace(/\.[a-zA-Z0-9]+$/, ''); // drop the file extension
  return rest || null;
}

// Deletes one already-uploaded Cloudinary asset given its secure_url.
// Silently no-ops for anything that isn't a Cloudinary URL (e.g. a stale
// pre-migration /uploads/... URL still sitting on an old product) since
// there's nothing on Cloudinary to delete for those.
async function removePublicFile(url) {
  if (!url || !url.includes('res.cloudinary.com')) return;
  const publicId = publicIdFromUrl(url);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId).catch(() => {});
}

// Physically copies a product's image assets onto a new productId's own
// Cloudinary public_ids (used by "Duplicate product"). This is
// deliberate, not a shortcut: assets are deleted by productId-scoped
// public_id when a product is removed, so a duplicate that merely
// pointed at the original's URLs would have its images silently deleted
// the moment the original product was deleted. Cloudinary can fetch a
// remote URL (including one of its own) as the source for a new upload,
// so no local download step is needed.
async function duplicateHangerImage(sourceUrl, newProductId) {
  if (!sourceUrl) return sourceUrl;
  const result = await cloudinary.uploader.upload(sourceUrl, { public_id: `products/hangers/${newProductId}`, overwrite: true });
  return result.secure_url;
}

async function duplicateGalleryImages(galleryImages, newProductId) {
  const out = [];
  for (const g of galleryImages) {
    const id = crypto.randomUUID();
    const [full, thumb] = await Promise.all([
      cloudinary.uploader.upload(g.url, { public_id: `products/gallery/${newProductId}/${id}` }),
      cloudinary.uploader.upload(g.thumbnailUrl, { public_id: `products/gallery/${newProductId}/thumb-${id}` }),
    ]);
    out.push({ url: full.secure_url, thumbnailUrl: thumb.secure_url, order: g.order });
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
