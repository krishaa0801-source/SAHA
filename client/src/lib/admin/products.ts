// Talks to /api/admin/products. Create/update use multipart form-data
// (a hanger image file + gallery image files + a JSON `sizes` field +
// a JSON `galleryImagesMeta` field describing the final gallery order —
// see server/routes/admin/products.js resolveGalleryImages for how the
// server reads that shape).
export type ProductStatus = 'available' | 'rented' | 'hidden';

export type SizeRow = { size: string; quantity: number };

export type GalleryImage = { url: string; thumbnailUrl: string };

export type AdminProduct = {
  id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  price: number;
  // Refundable, entirely separate from `price` — see server/services/pricing.js.
  securityDeposit: number;
  sizes: SizeRow[];
  image: string;
  galleryImages: GalleryImage[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductListParams = {
  q?: string;
  category?: string;
  status?: ProductStatus | '';
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name';
  page?: number;
  limit?: number;
};

export type ProductFormFields = {
  name: string;
  category: string;
  brand: string;
  description: string;
  price: number;
  securityDeposit: number;
  status: ProductStatus;
  sizes: SizeRow[];
};

export type GalleryEntry = { type: 'existing'; url: string; thumbnailUrl: string } | { type: 'new'; file: File };

export class AdminApiError extends Error {
  fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.fields = fields;
  }
}

async function parseJsonResponse(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/products${path}`, {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...init,
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new AdminApiError(data?.error || 'Something went wrong. Please try again.', data?.fields);
  return data as T;
}

async function multipartRequest<T>(path: string, method: 'POST' | 'PUT', formData: FormData): Promise<T> {
  const res = await fetch(`/api/admin/products${path}`, {
    method,
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: formData,
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new AdminApiError(data?.error || 'Something went wrong. Please try again.', data?.fields);
  return data as T;
}

function buildProductFormData(fields: ProductFormFields, hangerFile: File | null, galleryEntries: GalleryEntry[]): FormData {
  const fd = new FormData();
  fd.append('name', fields.name);
  fd.append('category', fields.category);
  fd.append('brand', fields.brand);
  fd.append('description', fields.description);
  fd.append('price', String(fields.price));
  fd.append('securityDeposit', String(fields.securityDeposit));
  fd.append('status', fields.status);
  fd.append('sizes', JSON.stringify(fields.sizes));

  if (hangerFile) fd.append('hangerImage', hangerFile);

  const meta = galleryEntries.map((g) =>
    g.type === 'existing' ? { type: 'existing', url: g.url, thumbnailUrl: g.thumbnailUrl } : { type: 'new' }
  );
  fd.append('galleryImagesMeta', JSON.stringify(meta));
  galleryEntries.forEach((g) => {
    if (g.type === 'new') fd.append('galleryImages', g.file);
  });

  return fd;
}

export async function fetchAdminProducts(
  params: ProductListParams = {}
): Promise<{ products: AdminProduct[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.status) qs.set('status', params.status);
  if (params.sort) qs.set('sort', params.sort);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return jsonRequest(`${query ? `?${query}` : ''}`);
}

export async function fetchAdminProduct(id: string): Promise<AdminProduct> {
  const data = await jsonRequest<{ product: AdminProduct }>(`/${id}`);
  return data.product;
}

export async function createProduct(fields: ProductFormFields, hangerFile: File, galleryFiles: File[]): Promise<AdminProduct> {
  const entries: GalleryEntry[] = galleryFiles.map((file) => ({ type: 'new', file }));
  const fd = buildProductFormData(fields, hangerFile, entries);
  const data = await multipartRequest<{ product: AdminProduct }>('', 'POST', fd);
  return data.product;
}

export async function updateProduct(
  id: string,
  fields: ProductFormFields,
  hangerFile: File | null,
  galleryEntries: GalleryEntry[]
): Promise<AdminProduct> {
  const fd = buildProductFormData(fields, hangerFile, galleryEntries);
  const data = await multipartRequest<{ product: AdminProduct }>(`/${id}`, 'PUT', fd);
  return data.product;
}

export async function deleteProduct(id: string): Promise<void> {
  await jsonRequest<{ ok: true }>(`/${id}`, { method: 'DELETE' });
}

export async function archiveProduct(id: string): Promise<AdminProduct> {
  const data = await jsonRequest<{ product: AdminProduct }>(`/${id}/archive`, { method: 'POST' });
  return data.product;
}

export async function unarchiveProduct(id: string): Promise<AdminProduct> {
  const data = await jsonRequest<{ product: AdminProduct }>(`/${id}/unarchive`, { method: 'POST' });
  return data.product;
}

export async function duplicateProduct(id: string): Promise<AdminProduct> {
  const data = await jsonRequest<{ product: AdminProduct }>(`/${id}/duplicate`, { method: 'POST' });
  return data.product;
}
