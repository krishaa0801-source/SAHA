require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const { validateEnv, INSECURE_SESSION_SECRET } = require('./server/config/env');
const logger = require('./server/utils/logger');
const connectDB = require('./server/db');
const requireCsrfHeader = require('./server/middleware/csrf');
const { apiLimiter } = require('./server/middleware/rateLimiters');
const authRoutes = require('./server/routes/auth');
const orderRoutes = require('./server/routes/orders');
const paymentRoutes = require('./server/routes/payments');
const cartRoutes = require('./server/routes/cart');
const productRoutes = require('./server/routes/products');
const categoryRoutes = require('./server/routes/categories');
const fitMatchRoutes = require('./server/routes/fitMatch');
const adminRoutes = require('./server/routes/admin');
const requireAuth = require('./server/middleware/requireAuth');
const requireAdmin = require('./server/middleware/requireAdmin');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const AUTH_DIST_DIR = path.join(__dirname, 'auth-dist');
const isProduction = process.env.NODE_ENV === 'production';

// Hostinger (and most hosts) put the app behind a reverse proxy; this is
// required for secure cookies to be recognized correctly over HTTPS.
app.set('trust proxy', 1);

// Real CSP allowlist — the plain HTML pages load Tailwind's Play CDN and
// Google Fonts, and Razorpay's checkout needs its own script/frame/API
// hosts. script-src/style-src keep 'unsafe-inline' because every static
// page's interactivity lives in inline <script> blocks (and Tailwind's
// CDN injects inline <style>) — dropping it would mean externalizing
// every one of those first, a much larger migration. script-src-attr needs
// its own 'unsafe-inline' too — it's a separate directive from script-src
// (governs onclick="..."/onerror="..." attributes specifically) that
// Helmet defaults to 'none' when not listed explicitly, which was silently
// blocking every onclick handler on the static pages (hamburger menus,
// "Rent Now" buttons, hover swaps, image onerror fallbacks — all of it)
// with no console-visible symptom beyond a CSP violation notice. Everything
// else (object-src, frame-ancestors, base-uri, and the default host list)
// is genuinely locked down, which is the meaningful improvement over having
// no CSP at all.
//
// COOP is relaxed to same-origin-allow-popups: Helmet's default
// "same-origin" severs window.opener for any popup we open, which breaks
// Razorpay's card 3D-Secure/OTP popup (it needs window.opener to hand
// control back to the parent) — the popup renders as about:blank#blocked.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://*.razorpay.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://img.icons8.com', 'https://lh3.googleusercontent.com', 'https://*.razorpay.com'],
        connectSrc: ["'self'", 'https://*.razorpay.com'],
        frameSrc: ["'self'", 'https://*.razorpay.com'],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

// No ALLOWED_ORIGINS configured = no cross-origin grant at all, which is
// the correct default for this app: the frontend and API are served from
// the same origin, so nothing legitimate needs CORS. Set ALLOWED_ORIGINS
// (comma-separated) only if a separate frontend origin is ever added.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  })
);

app.use(compression());
// The verify callback stashes the exact raw bytes on req.rawBody — needed
// by the Razorpay webhook route (server/routes/payments.js) to compute its
// HMAC signature. Razorpay signs the literal bytes it sent; re-serializing
// the already-parsed req.body with JSON.stringify() can produce different
// bytes (key order, whitespace) and silently fail verification.
app.use(express.json({ limit: '2mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
// Strips any $/. keys from req.body/query/params — defense-in-depth
// against NoSQL-injection-style payloads on top of the explicit String()
// casts routes already apply before building Mongo queries.
app.use(mongoSanitize());

app.use(
  session({
    name: 'saha.sid',
    secret: process.env.SESSION_SECRET || INSECURE_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  })
);

// Real backend API
app.use('/api', apiLimiter, requireCsrfHeader);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/fit-match', fitMatchRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

// Static site: only files under public/ are servable (fixes the previous
// bug where the whole project root — including server.js and package.json
// source — was downloadable).
app.use(express.static(PUBLIC_DIR));

// React (Vite) app: serves the built JS/CSS bundle for the
// /login, /signup, /account, and /cart pages under its own /auth prefix so
// it never collides with the existing /assets static folder.
app.use('/auth', express.static(AUTH_DIST_DIR));
app.get(['/login', '/signup', '/account', '/account.html', '/cart', '/cart.html', '/order-confirmed', '/admin', '/admin/*'], (req, res) => {
  res.sendFile(path.join(AUTH_DIST_DIR, 'index.html'));
});

// Anything else unmatched is a real 404, not a silent homepage fallback.
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

async function start() {
  validateEnv();
  await connectDB();
  app.listen(PORT, () => {
    logger.info('=========================================');
    logger.info(`Server running at http://localhost:${PORT}`);
    logger.info('=========================================');
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
