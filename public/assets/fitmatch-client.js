// Shared Fit Match client — used by fit-match.html (save/update) and
// vault.html's product sidebar (read/display), so both talk to the API
// and cache the result the same way instead of two copies drifting apart.
//
// sessionStorage (not localStorage) backs the cache: it survives normal
// navigation between pages within one visit — which is all "reuse across
// product pages instead of unnecessary API calls" requires — but clears
// itself when the tab closes, so it can never leak into a different
// person's session on a shared browser. The server-side session cookie
// remains the actual source of truth either way; this cache only exists
// to avoid re-fetching /api/fit-match every time a shopper opens another
// product's sidebar.
const FitMatchClient = (function () {
  const CACHE_KEY = 'sahas_fitmatch_cache';

  function isLoggedIn() {
    try {
      const auth = JSON.parse(localStorage.getItem('sahas_auth') || 'null');
      return Boolean(auth && auth.loggedIn);
    } catch (e) {
      return false;
    }
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      // undefined = never cached yet (must fetch); null = cached "no profile".
      return raw === null ? undefined : JSON.parse(raw);
    } catch (e) {
      return undefined;
    }
  }

  function writeCache(profile) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    } catch (e) {
      // ignore (private browsing / storage full) — falls back to fetching every time
    }
  }

  function clearCache() {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch (e) {}
  }

  // Returns the saved profile, or null if the user isn't logged in or has
  // never completed Fit Match. Uses the session cache unless `force` is set.
  async function getProfile(opts) {
    const force = Boolean(opts && opts.force);
    if (!isLoggedIn()) return null;
    if (!force) {
      const cached = readCache();
      if (cached !== undefined) return cached;
    }
    try {
      const res = await fetch('/api/fit-match', {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!res.ok) return null;
      const data = await res.json();
      writeCache(data.profile);
      return data.profile;
    } catch (e) {
      return null;
    }
  }

  // Saves (creates or overwrites) the profile and refreshes the cache so
  // anything reading it next (e.g. a sidebar already open) sees the update.
  async function saveProfile(measurements) {
    const res = await fetch('/api/fit-match', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(measurements),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not save your Fit Match profile.');
    writeCache(data.profile);
    return data.profile;
  }

  return { getProfile, saveProfile, clearCache, isLoggedIn };
})();
