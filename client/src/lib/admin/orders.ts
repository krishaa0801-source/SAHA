// Talks to /api/admin/orders. Orders themselves are never created or
// priced from here — only status transitions (mark completed/cancelled)
// and, once completed, security deposit resolution. See
// server/routes/admin/orders.js.
export type OrderStatus = 'confirmed' | 'completed' | 'cancelled';
export type DepositStatus = 'pending' | 'refunded' | 'forfeited' | 'partially_refunded';
export type DepositAction = 'refund_full' | 'refund_partial' | 'forfeit';

export type AdminOrder = {
  id: string;
  user: { id: string; name: string; email: string } | null;
  productId: string;
  name: string;
  category: string;
  size: string;
  from: string;
  to: string;
  days: number;
  basePrice: number;
  tierMultiplier: number;
  tierLabel: string;
  rentalTotal: number;
  securityDeposit: number;
  total: number;
  status: OrderStatus;
  depositStatus: DepositStatus;
  depositRefundAmount: number;
  depositNote: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderListParams = {
  status?: OrderStatus | '';
  depositStatus?: DepositStatus | '';
  page?: number;
  limit?: number;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/orders${path}`, {
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

export async function fetchAdminOrders(params: OrderListParams = {}): Promise<{ orders: AdminOrder[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.depositStatus) qs.set('depositStatus', params.depositStatus);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return request(`${query ? `?${query}` : ''}`);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<AdminOrder> {
  const data = await request<{ order: AdminOrder }>(`/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  return data.order;
}

export async function resolveDeposit(id: string, action: DepositAction, reason: string, amount?: number): Promise<AdminOrder> {
  const data = await request<{ order: AdminOrder }>(`/${id}/deposit`, {
    method: 'POST',
    body: JSON.stringify({ action, reason, ...(amount != null ? { amount } : {}) }),
  });
  return data.order;
}
