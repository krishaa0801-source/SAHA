const { rateLimit, MINUTE, HOUR } = require('express-rate-limit');

// 5 failed login attempts per IP per 15 minutes. skipSuccessfulRequests
// means a successful login never counts against the limit, so a normal
// user logging in repeatedly (or after a single mistyped password) is
// never affected — only repeated *failures* from the same IP add up.
const loginLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
  },
});

// 5 signup attempts per IP per hour. Every attempt counts (not just
// failures) — this caps mass account creation from one IP, which a
// legitimate visitor signing up once is never going to hit.
const signupLimiter = rateLimit({
  windowMs: HOUR,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many accounts created from this IP. Please try again in an hour.' });
  },
});

module.exports = { loginLimiter, signupLimiter };
