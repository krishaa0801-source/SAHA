// Shared filter/sort builder used by both the public product list
// (server/routes/products.js) and the admin product list
// (server/routes/admin/products.js) so the two never drift apart.

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `includeHidden: true` is admin-only — public callers must never see
// hidden products, and may not override that with a `status` query param.
function buildProductFilter(query = {}, { includeHidden = false } = {}) {
  const filter = {};

  if (includeHidden) {
    if (query.status && ['available', 'rented', 'hidden'].includes(query.status)) {
      filter.status = query.status;
    }
  } else {
    filter.status = { $ne: 'hidden' };
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.q) {
    const re = new RegExp(escapeRegex(String(query.q).trim()), 'i');
    filter.$or = [{ name: re }, { brand: re }];
  }

  const min = query.minPrice !== undefined ? Number(query.minPrice) : NaN;
  const max = query.maxPrice !== undefined ? Number(query.maxPrice) : NaN;
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    filter.price = {};
    if (!Number.isNaN(min)) filter.price.$gte = min;
    if (!Number.isNaN(max)) filter.price.$lte = max;
  }

  return filter;
}

function buildProductSort(sort) {
  switch (sort) {
    case 'oldest':
      return { createdAt: 1 };
    case 'price_asc':
      return { price: 1 };
    case 'price_desc':
      return { price: -1 };
    case 'name':
      return { name: 1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
}

module.exports = { buildProductFilter, buildProductSort };
