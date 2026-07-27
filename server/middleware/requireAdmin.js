const User = require('../models/User');

// Must run after requireAuth (needs req.session.userId already set).
// Re-checks the role from the database on every request rather than
// trusting anything cached client-side — the session only ever proves
// *who* is signed in, never what they're allowed to do.
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.session.userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Could not verify admin access.' });
  }
}

module.exports = requireAdmin;
