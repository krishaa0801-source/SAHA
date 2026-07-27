import { CartTotals } from './cart';

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

// On success, the server has already created the Order documents from
// the cart it just charged — there is nothing further for the client to
// submit.
export async function verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
  const res = await fetch('/api/payments/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && Boolean(data.success);
}
