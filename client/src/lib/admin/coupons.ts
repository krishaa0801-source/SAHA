// Talks to /api/admin/coupons. Plain JSON — no files involved, unlike
// products/reviews.

export type DiscountType = 'percentage' | 'flat';
export type CouponStatus = 'active' | 'expired' | 'disabled' | 'exhausted' | 'scheduled';

export type AdminCoupon = {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate: string | null;
  expiryDate: string | null;
  isActive: boolean;
  firstOrderOnly: boolean;
  singleUsePerCustomer: boolean;
  restrictedProducts: string[];
  restrictedCategories: string[];
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
};

export type CouponListParams = {
  q?: string;
  status?: CouponStatus | '';
  discountType?: DiscountType | '';
  sort?: 'newest' | 'oldest' | 'expiry';
  page?: number;
  limit?: number;
};

export type CouponFormFields = {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  firstOrderOnly: boolean;
  singleUsePerCustomer: boolean;
  restrictedProducts: string[];
  restrictedCategories: string[];
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
  const res = await fetch(`/api/admin/coupons${path}`, {
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

function toPayload(fields: CouponFormFields) {
  return {
    code: fields.code,
    discountType: fields.discountType,
    discountValue: fields.discountValue,
    minOrderAmount: fields.minOrderAmount,
    maxDiscount: fields.maxDiscount,
    usageLimit: fields.usageLimit,
    startDate: fields.startDate || null,
    expiryDate: fields.expiryDate || null,
    isActive: fields.isActive,
    firstOrderOnly: fields.firstOrderOnly,
    singleUsePerCustomer: fields.singleUsePerCustomer,
    restrictedProducts: fields.restrictedProducts,
    restrictedCategories: fields.restrictedCategories,
  };
}

export async function fetchAdminCoupons(
  params: CouponListParams = {}
): Promise<{ coupons: AdminCoupon[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.discountType) qs.set('discountType', params.discountType);
  if (params.sort) qs.set('sort', params.sort);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return jsonRequest(`${query ? `?${query}` : ''}`);
}

export async function fetchAdminCoupon(id: string): Promise<AdminCoupon> {
  const data = await jsonRequest<{ coupon: AdminCoupon }>(`/${id}`);
  return data.coupon;
}

export async function createCoupon(fields: CouponFormFields): Promise<AdminCoupon> {
  const data = await jsonRequest<{ coupon: AdminCoupon }>('', { method: 'POST', body: JSON.stringify(toPayload(fields)) });
  return data.coupon;
}

export async function updateCoupon(id: string, fields: CouponFormFields): Promise<AdminCoupon> {
  const data = await jsonRequest<{ coupon: AdminCoupon }>(`/${id}`, { method: 'PUT', body: JSON.stringify(toPayload(fields)) });
  return data.coupon;
}

export async function deleteCoupon(id: string): Promise<void> {
  await jsonRequest<{ ok: true }>(`/${id}`, { method: 'DELETE' });
}

export async function toggleCoupon(id: string): Promise<AdminCoupon> {
  const data = await jsonRequest<{ coupon: AdminCoupon }>(`/${id}/toggle`, { method: 'POST' });
  return data.coupon;
}

export async function duplicateCoupon(id: string): Promise<AdminCoupon> {
  const data = await jsonRequest<{ coupon: AdminCoupon }>(`/${id}/duplicate`, { method: 'POST' });
  return data.coupon;
}
