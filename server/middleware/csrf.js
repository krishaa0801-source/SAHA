const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Server-to-server callbacks that can't attach our custom header (no
// browser involved, so there's nothing to protect against CSRF-wise) but
// authenticate themselves another way. Currently just the Razorpay
// webhook, which verifies an HMAC signature instead — see
// server/routes/payments.js.
const EXEMPT_PATHS = new Set(['/payments/webhook']);

// Lightweight CSRF gate for a same-origin, fetch-only JSON API: a plain
// cross-site <form> submission (the classic CSRF vector) cannot attach a
// custom header without triggering a CORS preflight — and this app never
// grants cross-origin CORS access (see server.js's cors() config) — so
// requiring this header on every state-changing request is sufficient
// here without a full token-issuance system. Every legitimate client
// call already funnels through a small number of shared fetch helpers
// (client/src/lib/*, public/vault.html's fetch() calls), so adding the
// header there covers every real request.
function requireCsrfHeader(req, res, next) {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PATHS.has(req.path)) return next();
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Request rejected — missing required header.' });
  }
  next();
}

module.exports = requireCsrfHeader;
