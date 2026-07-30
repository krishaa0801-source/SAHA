// Single source of truth for "which image represents this product outside
// the browsing rack" — the first gallery image (by `order`), falling back
// to the hanger photo only when a product has no gallery images at all.
// Used by both the public product API (routes/products.js) and cart
// pricing (services/pricing.js) so the detail sidebar and the cart never
// disagree about which photo is the product's image.
function getDetailImage(product) {
  const gallery = [...(product.galleryImages || [])].sort((a, b) => a.order - b.order);
  return gallery[0]?.url || product.image;
}

module.exports = { getDetailImage };
