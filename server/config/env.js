const INSECURE_SESSION_SECRET = 'dev-only-insecure-secret-change-me';
const REQUIRED_VARS = ['MONGODB_URI', 'SESSION_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];

// Fails fast on missing/insecure configuration instead of booting anyway
// and failing confusingly later (e.g. mid-checkout when Razorpay keys
// turn out to be unset). Development stays permissive (warns only) so
// the app is still runnable with a partial .env while iterating.
function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (!isProduction) {
    if (missing.length) {
      console.warn(`WARNING: missing environment variable(s): ${missing.join(', ')}. Some features (payments, sessions) won't work until they're set.`);
    }
    return;
  }

  if (missing.length) {
    throw new Error(`Missing required environment variable(s) for production: ${missing.join(', ')}. Set them before starting the server.`);
  }
  if (process.env.SESSION_SECRET === INSECURE_SESSION_SECRET) {
    throw new Error('SESSION_SECRET is still the insecure development default. Generate a real one before deploying to production.');
  }
}

module.exports = { validateEnv, INSECURE_SESSION_SECRET };
