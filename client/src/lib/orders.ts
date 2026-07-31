export type DepositStatus = 'pending' | 'refunded' | 'forfeited' | 'partially_refunded';

export type Order = {
  _id: string;
  productId: string;
  name: string;
  category: string;
  size: string;
  from: string;
  to: string;
  days: number;
  // rentalTotal is the rental fee alone; total is rentalTotal +
  // securityDeposit — what was actually charged for this order (see
  // server/models/Order.js). depositNote is never sent to this endpoint
  // (server/routes/orders.js strips it) — it's admin-internal.
  rentalTotal: number;
  securityDeposit: number;
  total: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  depositStatus: DepositStatus;
  depositRefundAmount: number;
};

// There is no createOrder() here on purpose — orders are only ever
// created server-side, immediately after a verified Razorpay payment
// (see lib/payments.ts verifyPayment / server/routes/payments.js). A
// client-callable "create this order for this total" endpoint is exactly
// what let checkout be manipulated before this redesign.
export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch('/api/orders', { credentials: 'include' });
  if (!res.ok) throw new Error('Not authenticated');
  const data = await res.json();
  return data.orders || [];
}
