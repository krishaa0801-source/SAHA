const express = require('express');
const Category = require('../models/Category');

const router = express.Router();

// Public — powers the Style Vault's rod grouping and category filter chips.
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json({ categories: categories.map((c) => ({ id: c._id, name: c.name, slug: c.slug })) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load categories. Please try again.' });
  }
});

module.exports = router;
