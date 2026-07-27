export type Order = {
  _id: string;
  productId: string;
  name: string;
  category: string;
  size: string;
  from: string;
  to: string;
  days: number;
  total: number;
  status: 'confirmed' | 'completed' | 'cancelled';
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
