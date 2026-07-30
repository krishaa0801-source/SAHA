const AUTH_KEY = 'sahas_auth';
const GUEST_CART_KEY = 'sahas_cart';

function isLoggedIn(): boolean {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    return Boolean(auth && auth.loggedIn);
  } catch {
    return false;
  }
}

function guestCartCount(): number {
  try {
    const list = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

// The header badge's one source of truth for how many lines are in the
// cart: the same guest localStorage cart vault.html reads/writes for
// signed-out visitors, or the real per-account DB cart (server/routes/
// cart.js) once signed in — whichever one CartPage itself would show.
export async function fetchCartCount(): Promise<number> {
  if (!isLoggedIn()) return guestCartCount();
  try {
    const res = await fetch('/api/cart', { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (!res.ok) return guestCartCount();
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items.length : 0;
  } catch {
    return guestCartCount();
  }
}
