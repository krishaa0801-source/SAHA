// Warms/clears the same sessionStorage cache public/assets/fitmatch-client.js
// reads (key and shape must match exactly — see that file for why
// sessionStorage, not localStorage, is used here). This is what makes "load
// automatically whenever the user logs in" work: the product sidebar on
// vault.html doesn't have to make its own request the first time it opens
// after login, since this already populated the cache.
const CACHE_KEY = 'sahas_fitmatch_cache';

export async function refreshFitMatchCache(): Promise<void> {
  try {
    const res = await fetch('/api/fit-match', {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!res.ok) return;
    const data = await res.json();
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.profile));
  } catch {
    // best-effort — the sidebar falls back to fetching it itself on a cache miss
  }
}

export function clearFitMatchCache(): void {
  sessionStorage.removeItem(CACHE_KEY);
}
