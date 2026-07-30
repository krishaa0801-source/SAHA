const express = require('express');
const { body, param } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const requireAuth = require('../middleware/requireAuth');
const handleValidationErrors = require('../middleware/validate');
const { priceLine } = require('../services/pricing');
const { resolveCart } = require('../services/cartResolver');
const { findValidCoupon } = require('../services/couponService');
const { hasOverlap } = require('../services/booking');

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Type/format sanity checks only — the actual business validation (does
// this size exist, are these dates well-formed and available) already
// happens in services/pricing.js's priceLine() against the live Product,
// which every one of these routes calls right after. This layer just
// rejects obviously-malformed input (wrong type, empty string) earlier
// and with a clearer message.
const addItemValidators = [
  body('itemId').isString().trim().notEmpty().withMessage('Item is required.'),
  body('size').isString().trim().notEmpty().withMessage('Size is required.'),
  body('qty').optional().isInt({ min: 1, max: 5 }).withMessage('Quantity must be between 1 and 5.'),
  body('from').optional({ checkFalsy: true }).matches(DATE_RE).withMessage('Invalid start date.'),
  body('to').optional({ checkFalsy: true }).matches(DATE_RE).withMessage('Invalid end date.'),
];

const patchItemValidators = [
  param('cartId').isString().trim().notEmpty(),
  body('size').optional().isString().trim().notEmpty().withMessage('Size is required.'),
  body('qty').optional().isInt({ min: 1, max: 5 }).withMessage('Quantity must be between 1 and 5.'),
  body('from').optional({ checkFalsy: true }).matches(DATE_RE).withMessage('Invalid start date.'),
  body('to').optional({ checkFalsy: true }).matches(DATE_RE).withMessage('Invalid end date.'),
];

const couponValidators = [body('code').isString().trim().notEmpty().isLength({ max: 30 }).withMessage('Enter a valid code.')];

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [], coupon: '' });
  return cart;
}

async function fetchProduct(productId) {
  if (!productId || typeof productId !== 'string') return null;
  return Product.findOne({ _id: productId, status: { $ne: 'hidden' } });
}

// The only path the frontend ever sees cart data through — price/name/
// etc. are always fresh from the catalog (via resolveCart), never from
// whatever was true when the item was added.
async function toPublicCart(cart) {
  const { lines, totals } = await resolveCart(cart);
  return {
    items: lines.map((l) => ({
      cartId: l.cartId,
      itemId: l.productId,
      name: l.name,
      brand: l.brand,
      image: l.image,
      price: l.unitPrice,
      sizes: l.sizes,
      size: l.size,
      qty: l.qty,
      from: l.from,
      to: l.to,
    })),
    coupon: cart.coupon,
    totals,
  };
}

router.get('/', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.session.userId);
    res.json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not load your cart. Please try again.' });
  }
});

// Body may ONLY contain: itemId (Product id), size, qty, from, to. Any
// price/name/brand/image/sizes the client sends is ignored — the
// product is re-fetched from MongoDB and re-validated every time.
router.post('/items', addItemValidators, handleValidationErrors, async (req, res) => {
  try {
    const { itemId, size, qty, from, to } = req.body || {};
    const product = await fetchProduct(itemId);
    const line = priceLine({ product, size, qty: qty || 1, from, to });
    if (line.error) {
      return res.status(400).json({ error: line.error });
    }
    // Early, friendly rejection — not the race-condition guard (that's
    // reserveBooking() at actual checkout time), just fast feedback so
    // the overwhelming majority of conflicts are caught before anyone
    // even starts paying.
    if (await hasOverlap(product._id, from, to)) {
      return res.status(409).json({ error: `${product.name} is already booked for part of that date range. Try different dates.` });
    }

    const cart = await getOrCreateCart(req.session.userId);
    const existing = cart.items.find((it) => it.productId === product._id && it.size === size);
    if (existing) {
      existing.qty = Math.min(existing.qty + 1, 5);
      if (from) existing.from = from;
      if (to) existing.to = to;
    } else {
      cart.items.push({ productId: product._id, size, qty: 1, from: from || '', to: to || '' });
    }
    await cart.save();
    res.status(201).json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not add that item to your cart. Please try again.' });
  }
});

router.patch('/items/:cartId', patchItemValidators, handleValidationErrors, async (req, res) => {
  try {
    const { qty, size, from, to } = req.body || {};
    const cart = await getOrCreateCart(req.session.userId);
    const item = cart.items.id(req.params.cartId);
    if (!item) return res.status(404).json({ error: 'Cart item not found.' });

    const nextSize = size !== undefined ? size : item.size;
    const nextFrom = from !== undefined ? from : item.from;
    const nextTo = to !== undefined ? to : item.to;
    const nextQty = qty !== undefined ? qty : item.qty;

    const product = await fetchProduct(item.productId);
    const line = priceLine({ product, size: nextSize, qty: nextQty, from: nextFrom, to: nextTo });
    if (line.error) {
      return res.status(400).json({ error: line.error });
    }
    // Only re-check availability when the dates actually changed — a
    // plain qty/size edit doesn't need it, and the authoritative check
    // still happens at checkout regardless.
    if ((from !== undefined || to !== undefined) && (await hasOverlap(product._id, nextFrom, nextTo))) {
      return res.status(409).json({ error: `${product.name} is already booked for part of that date range. Try different dates.` });
    }

    item.size = nextSize;
    item.from = nextFrom;
    item.to = nextTo;
    item.qty = line.qty;
    await cart.save();
    res.json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not update that item. Please try again.' });
  }
});

router.delete('/items/item/:itemId', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.session.userId);
    cart.items = cart.items.filter((it) => it.productId !== req.params.itemId);
    await cart.save();
    res.json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not remove that item. Please try again.' });
  }
});

router.delete('/items/:cartId', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.session.userId);
    const item = cart.items.id(req.params.cartId);
    if (!item) return res.status(404).json({ error: 'Cart item not found.' });
    item.deleteOne();
    await cart.save();
    res.json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not remove that item. Please try again.' });
  }
});

router.put('/coupon', couponValidators, handleValidationErrors, async (req, res) => {
  try {
    const code = String((req.body || {}).code || '').trim().toUpperCase();
    const cart = await getOrCreateCart(req.session.userId);

    // Price the cart as it stands today (ignoring whatever coupon may
    // already be applied) so minOrderAmount/product/category restrictions
    // are checked against the real, current cart — not stale numbers.
    const { lines } = await resolveCart(cart);
    const base = lines.reduce((sum, l) => sum + l.lineSubtotal + l.lineRentalCharge, 0);

    const { error } = await findValidCoupon(code, {
      userId: req.session.userId,
      base,
      cartProductIds: lines.map((l) => l.productId),
      cartCategorySlugs: lines.map((l) => l.category),
    });
    if (error) {
      return res.status(400).json({ error });
    }

    cart.coupon = code;
    await cart.save();
    res.json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not apply that code. Please try again.' });
  }
});

router.delete('/coupon', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.session.userId);
    cart.coupon = '';
    await cart.save();
    res.json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not remove that code. Please try again.' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.session.userId);
    cart.items = [];
    cart.coupon = '';
    await cart.save();
    res.json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not clear your cart. Please try again.' });
  }
});

// Guest-cart merge on login. Each incoming entry is treated exactly like
// POST /items — only itemId/size/qty/from/to are read, and each is
// re-validated against MongoDB. Anything else the guest's localStorage
// cart might contain (price, name, ...) is ignored.
router.post('/merge', async (req, res) => {
  try {
    const incoming = Array.isArray((req.body || {}).items) ? req.body.items : [];
    const cart = await getOrCreateCart(req.session.userId);

    for (const entry of incoming) {
      if (!entry || !entry.itemId || !entry.size) continue;
      const product = await fetchProduct(entry.itemId);
      const line = priceLine({ product, size: entry.size, qty: entry.qty || 1, from: entry.from, to: entry.to });
      if (line.error) continue; // silently skip invalid/tampered guest entries

      const existing = cart.items.find((it) => it.productId === product._id && it.size === entry.size);
      if (existing) {
        existing.qty = Math.min(existing.qty + line.qty, 5);
        if (entry.from) existing.from = entry.from;
        if (entry.to) existing.to = entry.to;
      } else {
        cart.items.push({ productId: product._id, size: entry.size, qty: line.qty, from: entry.from || '', to: entry.to || '' });
      }
    }
    await cart.save();
    res.json(await toPublicCart(cart));
  } catch (err) {
    res.status(500).json({ error: 'Could not merge your guest cart. Please try again.' });
  }
});

module.exports = router;
