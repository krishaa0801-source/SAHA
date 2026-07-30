import { CartTotals } from './cart';
import { Order } from './orders';

export async function getRazorpayKey(): Promise<string> {
  const res = await fetch('/api/payments/key', { credentials: 'include' });
  const data = await res.json();
  return data.key_id;
}

// Takes no amount/currency/receipt — the server prices this entirely from
// the signed-in user's own cart. `summary` is the same server-computed
// breakdown as CartState.totals, returned here too so the checkout flow
// has it without an extra round trip.
export async function createRazorpayOrder(): Promise<{ order_id: string; amount: number; currency: string; summary: CartTotals }> {
  const res = await fetch('/api/payments/create-order', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data?.error || 'Could not start payment. Please try again.');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export type VerifyPaymentInput = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type VerifyPaymentResult = {
  success: boolean;
  orders: Order[];
};

// On success, the server has already created the Order documents from
// the cart it just charged — `orders` here is exactly that, so the
// confirmation page can show what was just booked without a second
// round trip.
export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const res = await fetch('/api/payments/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  return { success: res.ok && Boolean(data.success), orders: data.orders || [] };
}
