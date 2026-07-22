const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

function toPublicUser(user) {
  return {
    fname: user.fname,
    lname: user.lname,
    email: user.email,
    phone: user.phone,
    address: user.address,
    city: user.city,
    pin: user.pin,
  };
}

router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body || {};
    if (!fullName || !email || !password || String(password).length < 6) {
      return res.status(400).json({
        error: 'Full name, a valid email, and a password of at least 6 characters are required.',
      });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const [fname, ...rest] = String(fullName).trim().split(/\s+/);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fname,
      lname: rest.join(' '),
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : '',
      passwordHash,
    });
    req.session.userId = user._id.toString();
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    req.session.userId = user._id.toString();
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: toPublicUser(user) });
});

router.put('/me', requireAuth, async (req, res) => {
  const { fname, lname, phone, address, city, pin } = req.body || {};
  const user = await User.findByIdAndUpdate(
    req.session.userId,
    { fname, lname, phone, address, city, pin },
    { new: true, runValidators: true }
  );
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: toPublicUser(user) });
});

module.exports = router;
