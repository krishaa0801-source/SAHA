const express = require('express');
const { body } = require('express-validator');
const FitMatchProfile = require('../models/FitMatchProfile');
const requireAuth = require('../middleware/requireAuth');
const handleValidationErrors = require('../middleware/validate');

const router = express.Router();

function toPublicProfile(profile) {
  if (!profile) return null;
  return {
    height: profile.height,
    bust: profile.bust,
    waist: profile.waist,
    hip: profile.hip,
    shoulderWidth: profile.shoulderWidth,
    recommendedSize: profile.recommendedSize,
    updatedAt: profile.updatedAt,
  };
}

// GET — the logged-in user's saved profile, or { profile: null } if they've
// never run Fit Match. Every query below is scoped to req.session.userId,
// which comes from the server-side session, never from anything the client
// sends — there is no way to read or write another user's profile.
router.get('/', requireAuth, async (req, res) => {
  try {
    const profile = await FitMatchProfile.findOne({ userId: req.session.userId });
    res.json({ profile: toPublicProfile(profile) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load your Fit Match profile.' });
  }
});

const saveValidators = [
  body('height').isFloat({ min: 100, max: 250 }).withMessage('Height must be between 100 and 250 cm.'),
  body('bust').isFloat({ min: 20, max: 60 }).withMessage('Bust must be between 20 and 60 inches.'),
  body('waist').isFloat({ min: 20, max: 60 }).withMessage('Waist must be between 20 and 60 inches.'),
  body('hip').isFloat({ min: 20, max: 70 }).withMessage('Hip must be between 20 and 70 inches.'),
  body('shoulderWidth').isFloat({ min: 10, max: 25 }).withMessage('Shoulder width must be between 10 and 25 inches.'),
  body('recommendedSize').isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL']).withMessage('Invalid recommended size.'),
];

// PUT — create-or-update in one idempotent call (a user only ever has one
// profile), which is what PUT already means semantically; a separate POST
// would just be the same upsert under a different verb, so there's no
// second "create" endpoint here on purpose.
router.put('/', requireAuth, saveValidators, handleValidationErrors, async (req, res) => {
  try {
    const { height, bust, waist, hip, shoulderWidth, recommendedSize } = req.body;
    const profile = await FitMatchProfile.findOneAndUpdate(
      { userId: req.session.userId },
      { userId: req.session.userId, height, bust, waist, hip, shoulderWidth, recommendedSize },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ profile: toPublicProfile(profile) });
  } catch (err) {
    res.status(500).json({ error: 'Could not save your Fit Match profile.' });
  }
});

module.exports = router;
