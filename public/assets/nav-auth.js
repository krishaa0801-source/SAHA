// Shared by index.html, fit-match.html, contact.html, and policy.html —
// previously copy-pasted into each page separately (vault.html keeps its
// own inline version since it's woven into that page's own real-time cart
// badge updates from add/remove-item actions elsewhere on the page).
// Loaded at the end of <body>, after the nav markup it targets already
// exists in the DOM.

// Auth-aware nav: show "Login" (→ /login) when signed out, leave the
// person icon pointing at account.html as-is when a session exists.
// Admins additionally get an "Admin"/"Admin Panel" link revealed — there
// was previously no way to reach /admin from the site itself. Pages
// without admin nav elements (fit-match/contact/policy) just no-op here.
(function () {
  let loggedIn = false;
  try {
    const auth = JSON.parse(localStorage.getItem('sahas_auth') || 'null');
    loggedIn = Boolean(auth && auth.loggedIn);
  } catch (e) {}

  if (!loggedIn) {
    const desktop = document.getElementById('nav-account-desktop');
    if (desktop) { desktop.href = '/login'; desktop.insertAdjacentHTML('beforeend', '<span>Login</span>'); }

    const mobile = document.getElementById('nav-account-mobile');
    if (mobile) { mobile.href = '/login'; mobile.textContent = 'Login'; }

    const bottom = document.getElementById('nav-account-bottom');
    if (bottom) {
      bottom.href = '/login';
      const label = bottom.querySelector('span:last-child');
      if (label) label.textContent = 'Login';
    }
    return;
  }

  // Signed in — role isn't cached client-side anywhere, so this is the
  // one place worth a real request to find out if the admin links should
  // show.
  fetch('/api/auth/me', { credentials: 'include' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data || !data.user || data.user.role !== 'admin') return;
      const adminDesktop = document.getElementById('nav-admin-desktop');
      if (adminDesktop) adminDesktop.style.display = '';
      const adminMobile = document.getElementById('nav-admin-mobile');
      if (adminMobile) adminMobile.style.display = '';
    })
    .catch(() => {});
})();

// Header cart badge — same guest cart vault.html reads/writes
// (localStorage 'sahas_cart') for signed-out visitors, or the real
// per-account DB cart (server/routes/cart.js) once signed in, so this
// always matches what the Cart page itself would show.
(function () {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  function setBadge(n) {
    badge.textContent = n;
    badge.classList.toggle('show', n > 0);
  }
  function guestCount() {
    try {
      const list = JSON.parse(localStorage.getItem('sahas_cart') || '[]');
      return Array.isArray(list) ? list.length : 0;
    } catch (e) { return 0; }
  }
  let loggedIn = false;
  try {
    const auth = JSON.parse(localStorage.getItem('sahas_auth') || 'null');
    loggedIn = Boolean(auth && auth.loggedIn);
  } catch (e) {}

  setBadge(guestCount());
  if (!loggedIn) return;

  fetch('/api/cart', { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => { if (data && Array.isArray(data.items)) setBadge(data.items.length); })
    .catch(() => {});
})();
