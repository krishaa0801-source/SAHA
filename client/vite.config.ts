import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the auth SPA (login/signup) that mounts inside the existing
// static Saha's Wardrobe site. Output goes to ../auth-dist so server.js
// can serve it alongside the plain HTML pages without touching them.
export default defineConfig({
  plugins: [react()],
  // Distinct prefix so built JS/CSS assets never collide with the
  // existing static /assets/ folder (logo, gif) served from repo root.
  base: '/auth/',
  server: {
    // Forwards /api calls to the Express server during `npm run dev` so the
    // login/signup pages can be developed against the real backend without
    // a separate CORS setup.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: '../auth-dist',
    emptyOutDir: true,
  },
});
