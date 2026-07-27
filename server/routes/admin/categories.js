const express = require('express');
const Category = require('../../models/Category');
const Product = require('../../models/Product');

const router = express.Router();

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Could not load categories. Please try again.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const name = String((req.body || {}).name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const slug = slugify(name);
    if (!slug) {
      return res.status(400).json({ error: 'That name produces an empty slug — try adding letters or numbers.' });
    }
    const existing = await Category.findOne({ $or: [{ name }, { slug }] });
    if (existing) {
      return res.status(409).json({ error: 'A category with that name already exists.' });
    }
    const category = await Category.create({ name, slug });
    res.status(201).json({ category });
  } catch (err) {
    res.status(500).json({ error: 'Could not create the category. Please try again.' });
  }
});

// Renames the display name only — slug is intentionally immutable once
// created, since Product.category stores the slug; changing it on rename
// would silently orphan every product already using this category.
router.put('/:id', async (req, res) => {
  try {
    const name = String((req.body || {}).name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const existing = await Category.findOne({ name, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(409).json({ error: 'A category with that name already exists.' });
    }
    const category = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    res.json({ category });
  } catch (err) {
    res.status(500).json({ error: 'Could not update the category. Please try again.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    const inUse = await Product.exists({ category: category.slug });
    if (inUse) {
      return res.status(400).json({ error: 'This category has products in it — move or delete those products first.' });
    }
    await category.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete the category. Please try again.' });
  }
});

module.exports = router;
