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

// Broad DoS backstop across the whole API — generous enough that no
// legitimate session gets anywhere near it, just a guard against scripted
// abuse hammering any single endpoint.
const apiLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
  },
});

// Image processing (sharp, in server/services/imageProcessor.js) is
// CPU-heavy — a tighter limit on product create/update specifically
// keeps a burst of uploads from starving the event loop for everyone
// else on the same process.
const uploadLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many uploads. Please wait a few minutes and try again.' });
  },
});

// Payment endpoints are the one place a scripted retry loop could cause
// real financial or Razorpay-API-quota damage, not just annoyance.
const paymentLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many payment attempts. Please wait a few minutes and try again.' });
  },
});

module.exports = { loginLimiter, signupLimiter, apiLimiter, uploadLimiter, paymentLimiter };
