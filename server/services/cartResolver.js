const Product = require('../models/Product');
const { priceLine, calculateTotals } = require('./pricing');

// Resolves every line in a Cart document against live Product data —
// the one place both the cart display (server/routes/cart.js) and
// checkout (server/routes/payments.js) get pricing from, so they can
// never disagree. Any cart line whose product/size is no longer valid
// is dropped and the cart is pruned to match; what's returned is only
// ever built from MongoDB, never from anything the client sent.
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

  return { lines, totals: calculateTotals(lines, cart.coupon) };
}

module.exports = { resolveCart };
