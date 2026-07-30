const Product = require('../models/Product');
const { priceLine, calculateTotals } = require('./pricing');
const { findValidCoupon } = require('./couponService');

// Resolves every line in a Cart document against live Product data —
// the one place both the cart display (server/routes/cart.js) and
// checkout (server/routes/payments.js) get pricing from, so they can
// never disagree. Any cart line whose product/size is no longer valid
// is dropped and the cart is pruned to match; what's returned is only
// ever built from MongoDB, never from anything the client sent.
//
// The stored coupon code is re-validated on every resolve too (quiet
// path): if it's since expired, hit its usage limit, etc., it's silently
// cleared from the cart — same self-healing convention as a dropped line
// item above, not a loud error. PUT /api/cart/coupon (server/routes/
// cart.js) is the loud path that surfaces a specific rejection reason.
async function resolveCart(cart) {
  const ids = [...new Set(cart.items.map((it) => it.productId))];
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [p._id, p]));

  const kept = [];
  const lines = [];
  for (const it of cart.items) {
    const line = priceLine({ product: byId.get(it.productId), size: it.size, qty: it.qty, from: it.from, to: it.to });
    if (line.error) continue;
    kept.push(it);
    lines.push({ ...line, cartId: it._id.toString() });
  }

  if (kept.length !== cart.items.length) {
    cart.items = kept;
    await cart.save();
  }

  let coupon = null;
  if (cart.coupon) {
    const base = lines.reduce((sum, l) => sum + l.lineSubtotal + l.lineRentalCharge, 0);
    const result = await findValidCoupon(cart.coupon, {
      userId: cart.user,
      base,
      cartProductIds: lines.map((l) => l.productId),
      cartCategorySlugs: lines.map((l) => l.category),
    });
    if (result.coupon) {
      coupon = result.coupon;
    } else {
      cart.coupon = '';
      await cart.save();
    }
  }

  return { lines, totals: calculateTotals(lines, coupon) };
}

module.exports = { resolveCart };
