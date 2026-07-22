require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./server/db');
const authRoutes = require('./server/routes/auth');
const orderRoutes = require('./server/routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const AUTH_DIST_DIR = path.join(__dirname, 'auth-dist');
const isProduction = process.env.NODE_ENV === 'production';

// Hostinger (and most hosts) put the app behind a reverse proxy; this is
// required for secure cookies to be recognized correctly over HTTPS.
app.set('trust proxy', 1);

// CSP is left off on purpose: the plain HTML pages load Tailwind's Play CDN,
// Google Fonts, and jsdelivr (flatpickr) from several external hosts. Add a
// real CSP allowlist once those are self-hosted post-launch.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
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
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// Static site: only files under public/ are servable (fixes the previous
// bug where the whole project root — including server.js and package.json
// source — was downloadable).
app.use(express.static(PUBLIC_DIR));

// React (Vite) auth app: serves the built JS/CSS bundle for the
// /login and /signup pages under its own /auth prefix so it never
// collides with the existing /assets static folder.
app.use('/auth', express.static(AUTH_DIST_DIR));
app.get(['/login', '/signup'], (req, res) => {
  res.sendFile(path.join(AUTH_DIST_DIR, 'index.html'));
});

// Anything else unmatched is a real 404, not a silent homepage fallback.
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

async function start() {
  if (!process.env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET is not set in .env — using an insecure default. Set a real one before deploying.');
  }
  await connectDB();
  app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('=========================================');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
