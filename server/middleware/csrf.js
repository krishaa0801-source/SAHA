const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Request rejected — missing required header.' });
  }
  next();
}

module.exports = requireCsrfHeader;
