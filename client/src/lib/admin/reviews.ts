// Talks to /api/admin/reviews. Create/update use multipart form-data since
// the customer avatar photo is optional — same shape as lib/admin/
// products.ts's hanger image upload.

export type AdminReview = {
  id: string;
  product: string;
  productName: string;
  productImage: string;
  customerName: string;
  customerImage: string;
  rating: number;
  title: string;
  text: string;
  reviewDate: string;
  verified: boolean;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReviewListParams = {
  q?: string;
  product?: string;
  rating?: number | '';
  published?: 'published' | 'hidden' | '';
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest' | 'rating_desc';
  page?: number;
  limit?: number;
};

export type ReviewFormFields = {
  product: string;
  customerName: string;
  rating: number;
  title: string;
  text: string;
  reviewDate: string;
  verified: boolean;
  featured: boolean;
  published: boolean;
};

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
  const res = await fetch(`/api/admin/reviews${path}`, {
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
  const res = await fetch(`/api/admin/reviews${path}`, {
    method,
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: formData,
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new AdminApiError(data?.error || 'Something went wrong. Please try again.', data?.fields);
  return data as T;
}

function buildReviewFormData(fields: ReviewFormFields, imageFile: File | null): FormData {
  const fd = new FormData();
  fd.append('product', fields.product);
  fd.append('customerName', fields.customerName);
  fd.append('rating', String(fields.rating));
  fd.append('title', fields.title);
  fd.append('text', fields.text);
  fd.append('reviewDate', fields.reviewDate);
  fd.append('verified', String(fields.verified));
  fd.append('featured', String(fields.featured));
  fd.append('published', String(fields.published));
  if (imageFile) fd.append('customerImage', imageFile);
  return fd;
}

export async function fetchAdminReviews(
  params: ReviewListParams = {}
): Promise<{ reviews: AdminReview[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.product) qs.set('product', params.product);
  if (params.rating) qs.set('rating', String(params.rating));
  if (params.published) qs.set('published', params.published);
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params.dateTo) qs.set('dateTo', params.dateTo);
  if (params.sort) qs.set('sort', params.sort);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return jsonRequest(`${query ? `?${query}` : ''}`);
}

export async function fetchAdminReview(id: string): Promise<AdminReview> {
  const data = await jsonRequest<{ review: AdminReview }>(`/${id}`);
  return data.review;
}

export async function createReview(fields: ReviewFormFields, imageFile: File | null): Promise<AdminReview> {
  const fd = buildReviewFormData(fields, imageFile);
  const data = await multipartRequest<{ review: AdminReview }>('', 'POST', fd);
  return data.review;
}

export async function updateReview(id: string, fields: ReviewFormFields, imageFile: File | null): Promise<AdminReview> {
  const fd = buildReviewFormData(fields, imageFile);
  const data = await multipartRequest<{ review: AdminReview }>(`/${id}`, 'PUT', fd);
  return data.review;
}

export async function deleteReview(id: string): Promise<void> {
  await jsonRequest<{ ok: true }>(`/${id}`, { method: 'DELETE' });
}

async function toggle(id: string, action: string): Promise<AdminReview> {
  const data = await jsonRequest<{ review: AdminReview }>(`/${id}/${action}`, { method: 'POST' });
  return data.review;
}

export const publishReview = (id: string) => toggle(id, 'publish');
export const hideReview = (id: string) => toggle(id, 'hide');
export const featureReview = (id: string) => toggle(id, 'feature');
export const unfeatureReview = (id: string) => toggle(id, 'unfeature');
export const verifyReview = (id: string) => toggle(id, 'verify');
export const unverifyReview = (id: string) => toggle(id, 'unverify');
