// Talks to the real Express + MongoDB backend under /api/cart. The cart is
// per-account and lives in the database — localStorage is only used as a
// guest-cart holding pen (see mergeGuestCartIfAny) until the guest logs in.
//
// Every price/name field below is server-computed — the backend
// re-derives it from the Product catalog on every request. Nothing this
// module sends to the server ever includes a price.
const GUEST_CART_KEY = 'sahas_cart';

export type CartItem = {
  cartId: string;
  itemId: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  // Refundable — never discounted, never taxed, never part of `price` ×
  // days math. Already qty-multiplied by the server (server/services/
  // pricing.js).
  securityDeposit: number;
  sizes: string[];
  size: string;
  qty: number;
  from: string;
  to: string;
};

export type CartTotals = {
  subtotal: number;
  rentalCharges: number;
  deliveryCharge: number;
  discount: number;
  tax: number;
  securityDeposit: number;
  total: number;
};

export type CartState = {
  items: CartItem[];
  coupon: string;
  totals: CartTotals;
};

async function parseJsonResponse(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function request(path: string, init?: RequestInit): Promise<CartState> {
  const res = await fetch(`/api/cart${path}`, {
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...init,
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data?.error || 'Something went wrong with your cart. Please try again.');
  return data as CartState;
}

export function fetchCart(): Promise<CartState> {
  return request('');
}

export function updateCartItem(cartId: string, patch: Partial<Pick<CartItem, 'qty' | 'size' | 'from' | 'to'>>): Promise<CartState> {
  return request(`/items/${cartId}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function removeCartItem(cartId: string): Promise<CartState> {
  return request(`/items/${cartId}`, { method: 'DELETE' });
}

export function applyCoupon(code: string): Promise<CartState> {
  return request('/coupon', { method: 'PUT', body: JSON.stringify({ code }) });
}

export function removeCoupon(): Promise<CartState> {
  return request('/coupon', { method: 'DELETE' });
}

export function clearCart(): Promise<CartState> {
  return request('', { method: 'DELETE' });
}

// Guest cart entries carry whatever the vault page cached in localStorage
// for its own UI (name, price, image, ...) — none of that is trusted here.
// Only itemId/size/qty/from/to are forwarded; the server re-validates and
// re-prices every entry against MongoDB and ignores the rest.
export async function mergeGuestCartIfAny(): Promise<void> {
  let guestItems: any[] = [];
  try {
    guestItems = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]') || [];
  } catch {
    guestItems = [];
  }
  if (!Array.isArray(guestItems) || !guestItems.length) return;
  const items = guestItems.map((it) => ({
    itemId: it?.itemId,
    size: it?.size,
    qty: it?.qty,
    from: it?.from,
    to: it?.to,
  }));
  await request('/merge', { method: 'POST', body: JSON.stringify({ items }) });
  localStorage.removeItem(GUEST_CART_KEY);
}
