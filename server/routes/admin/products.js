const express = require('express');
const mongoose = require('mongoose');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { SIZE_ENUM } = require('../../models/Product');
const { productImageUpload } = require('../../middleware/upload');
const {
  processHangerImage,
  processGalleryImage,
  removeGalleryDir,
  removePublicFile,
  duplicateHangerImage,
  duplicateGalleryImages,
} = require('../../services/imageProcessor');
const { buildProductFilter, buildProductSort } = require('../../services/productQuery');
const { uploadLimiter } = require('../../middleware/rateLimiters');
const logger = require('../../utils/logger');

const router = express.Router();

function newProductId() {
  return new mongoose.Types.ObjectId().toHexString();
}

// Parses + validates the plain-text fields shared by create and update.
// Returns { errors: {field: message}, data } — `data` only contains keys
// that passed validation, so a caller merging into an existing doc never
// clobbers a valid field with a bad one.
function parseProductFields(body, categorySlugs) {
  const errors = {};
  const data = {};

  const name = String(body.name || '').trim();
  if (!name) errors.name = 'Product name is required.';
  else data.name = name;

  const category = String(body.category || '').trim();
  if (!category) errors.category = 'Category is required.';
  else if (!categorySlugs.has(category)) errors.category = 'Choose a valid category.';
  else data.category = category;

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Base Rental Price must be a number greater than 0.';
  else data.price = price;

  data.brand = String(body.brand || '').trim();
  data.description = String(body.description || '').trim();

  const status = String(body.status || 'available').trim();
  if (!['available', 'rented', 'hidden'].includes(status)) errors.status = 'Invalid status.';
  else data.status = status;

  let sizes = [];
  try {
    sizes = JSON.parse(body.sizes || '[]');
  } catch {
    errors.sizes = 'Sizes were sent in an invalid format.';
  }
  if (Array.isArray(sizes)) {
    const cleaned = [];
    const seen = new Set();
    for (const s of sizes) {
      if (!s || !SIZE_ENUM.includes(s.size) || seen.has(s.size)) continue;
      seen.add(s.size);
      const quantity = Math.max(0, Math.round(Number(s.quantity) || 0));
      cleaned.push({ size: s.size, quantity });
    }
    if (!cleaned.some((s) => s.quantity > 0)) {
      errors.sizes = 'Add at least one size with a stock quantity greater than 0.';
    } else {
      data.sizes = cleaned;
    }
  } else if (!errors.sizes) {
    errors.sizes = 'Add at least one size with a stock quantity greater than 0.';
  }

  return { errors, data };
}

// Resolves the final, ordered gallery image list from `galleryImagesMeta`
// (JSON array of {type:'existing', url, thumbnailUrl} | {type:'new'}) and
// the uploaded files (matched to 'new' entries in order). Also returns
// which previously-existing URLs were dropped, so the caller can clean
// their files off disk.
async function resolveGalleryImages({ metaRaw, files, existingImages, productId }) {
  let meta;
  try {
    meta = JSON.parse(metaRaw || '[]');
  } catch {
    return { error: 'Gallery image order was sent in an invalid format.' };
  }
  if (!Array.isArray(meta)) {
    return { error: 'Gallery image order was sent in an invalid format.' };
  }

  const existingByUrl = new Map((existingImages || []).map((g) => [g.url, g]));
  const finalGallery = [];
  let fileIdx = 0;

  for (const entry of meta) {
    if (entry && entry.type === 'existing' && existingByUrl.has(entry.url)) {
      const g = existingByUrl.get(entry.url);
      finalGallery.push({ url: g.url, thumbnailUrl: g.thumbnailUrl, order: finalGallery.length });
    } else if (entry && entry.type === 'new') {
      const file = files[fileIdx];
      fileIdx += 1;
      if (!file) continue;
      const processed = await processGalleryImage(file.buffer, file.mimetype, productId);
      finalGallery.push({ ...processed, order: finalGallery.length });
    }
  }

  if (!finalGallery.length) {
    return { error: 'At least one product gallery image is required.' };
  }

  const keptUrls = new Set(finalGallery.map((g) => g.url));
  const removed = (existingImages || []).filter((g) => !keptUrls.has(g.url));

  return { gallery: finalGallery, removed };
}

function toAdminProduct(product) {
  return {
    id: product._id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    description: product.description,
    price: product.price,
    sizes: product.sizes,
    image: product.image,
    galleryImages: [...product.galleryImages].sort((a, b) => a.order - b.order),
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

router.get('/', async (req, res) => {
  try {
    const filter = buildProductFilter(req.query, { includeHidden: true });
    const sort = buildProductSort(req.query.sort);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({ products: products.map(toAdminProduct), total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Could not load products. Please try again.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: toAdminProduct(product) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load this product. Please try again.' });
  }
});

router.post('/', uploadLimiter, productImageUpload, async (req, res) => {
  const productId = newProductId();
  try {
    const categories = await Category.find().select('slug').lean();
    const categorySlugs = new Set(categories.map((c) => c.slug));
    const { errors, data } = parseProductFields(req.body, categorySlugs);

    const hangerFile = req.files?.hangerImage?.[0];
    if (!hangerFile) errors.image = 'A hanger image is required.';

    if (Object.keys(errors).length) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
    }

    const galleryResult = await resolveGalleryImages({
      metaRaw: req.body.galleryImagesMeta,
      files: req.files?.galleryImages || [],
      existingImages: [],
      productId,
    });
    if (galleryResult.error) {
      return res.status(400).json({ error: galleryResult.error, fields: { galleryImages: galleryResult.error } });
    }

    const image = await processHangerImage(hangerFile.buffer, productId);

    const product = await Product.create({
      _id: productId,
      ...data,
      image,
      galleryImages: galleryResult.gallery,
    });

    res.status(201).json({ product: toAdminProduct(product) });
  } catch (err) {
    logger.error('Create product error:', err);
    res.status(500).json({ error: 'Could not create the product. Please try again.' });
  }
});

router.put('/:id', uploadLimiter, productImageUpload, async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const categories = await Category.find().select('slug').lean();
    const categorySlugs = new Set(categories.map((c) => c.slug));
    const { errors, data } = parseProductFields(req.body, categorySlugs);
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
    }

    const galleryResult = await resolveGalleryImages({
      metaRaw: req.body.galleryImagesMeta,
      files: req.files?.galleryImages || [],
      existingImages: existing.galleryImages,
      productId: existing._id,
    });
    if (galleryResult.error) {
      return res.status(400).json({ error: galleryResult.error, fields: { galleryImages: galleryResult.error } });
    }

    const hangerFile = req.files?.hangerImage?.[0];
    if (hangerFile) {
      data.image = await processHangerImage(hangerFile.buffer, existing._id);
    }

    Object.assign(existing, data, { galleryImages: galleryResult.gallery });
    await existing.save();

    await Promise.all(galleryResult.removed.map((g) => removePublicFile(g.url).then(() => removePublicFile(g.thumbnailUrl))));

    res.json({ product: toAdminProduct(existing) });
  } catch (err) {
    logger.error('Update product error:', err);
    res.status(500).json({ error: 'Could not update the product. Please try again.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    await product.deleteOne();
    await removePublicFile(product.image);
    await removeGalleryDir(product._id);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete the product. Please try again.' });
  }
});

router.post('/:id/archive', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'hidden' }, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: toAdminProduct(product) });
  } catch (err) {
    res.status(500).json({ error: 'Could not archive the product. Please try again.' });
  }
});

router.post('/:id/unarchive', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'available' }, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: toAdminProduct(product) });
  } catch (err) {
    res.status(500).json({ error: 'Could not unarchive the product. Please try again.' });
  }
});

// Clones a product's fields + its own copies of its image files under a
// new id (see services/imageProcessor.js duplicateHangerImage/
// duplicateGalleryImages — this is a real file copy, not a shared URL, so
// deleting the original later never breaks the duplicate). Always starts
// 'hidden' so a duplicate never silently goes live untouched.
router.post('/:id/duplicate', async (req, res) => {
  try {
    const source = await Product.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ error: 'Product not found.' });

    const newId = newProductId();
    const [image, galleryImages] = await Promise.all([
      duplicateHangerImage(source.image, newId),
      duplicateGalleryImages(source.galleryImages, newId),
    ]);

    const product = await Product.create({
      _id: newId,
      name: `${source.name} (Copy)`,
      category: source.category,
      brand: source.brand,
      description: source.description,
      price: source.price,
      sizes: source.sizes,
      image,
      galleryImages,
      status: 'hidden',
    });

    res.status(201).json({ product: toAdminProduct(product) });
  } catch (err) {
    logger.error('Duplicate product error:', err);
    res.status(500).json({ error: 'Could not duplicate the product. Please try again.' });
  }
});

module.exports = router;
