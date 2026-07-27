// One-time convenience seed of starter categories so the admin isn't
// typing them all in by hand. Fully editable/deletable afterward from the
// Categories admin page — this is not hardcoded product data, just a
// starting list of names. Safe to re-run: skips any name that already
// exists.
//
// Usage: node scripts/seedCategories.js   (or: npm run seed:categories)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../server/db');
const Category = require('../server/models/Category');

const STARTER_CATEGORIES = [
  'Shirts',
  'T-Shirts',
  'Suits',
  'Jackets',
  'Hoodies',
  'Dresses',
  'Sarees',
  'Kurtas',
  'Pants',
  'Jeans',
  'Accessories',
];

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seed() {
  await connectDB();

  let created = 0;
  for (const name of STARTER_CATEGORIES) {
    const slug = slugify(name);
    const existing = await Category.findOne({ $or: [{ name }, { slug }] });
    if (existing) continue;
    await Category.create({ name, slug });
    created += 1;
  }

  console.log(`Created ${created} categor${created === 1 ? 'y' : 'ies'} (${STARTER_CATEGORIES.length - created} already existed).`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding categories failed:', err);
  process.exit(1);
});
