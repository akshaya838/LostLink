const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const serviceAuth = require('../middleware/serviceAuth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function issueToken(user) {
  return jwt.sign(
    { sub: String(user._id), name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/register
 * Students create their own account. Admin accounts cannot be created here.
 */
router.post('/auth/register', wrap(async (req, res) => {
  const { name, email, password, rollNumber, phone } = req.body;
  const exists = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  if (exists) return res.status(409).json({ success: false, message: 'An account with this email already exists. Log in instead.' });

  const user = await User.create({ name, email, password, rollNumber, phone, role: 'student' });
  res.status(201).json({ success: true, message: 'Account created', data: { token: issueToken(user), user: user.toPublic() } });
}));

// POST /api/auth/login - works for both students and the admin desk
router.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.checkPassword(password))) {
    return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
  }
  res.json({ success: true, message: 'Logged in', data: { token: issueToken(user), user: user.toPublic() } });
}));

// GET /api/auth/me - the logged-in user's profile
router.get('/auth/me', requireAuth(), wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
  res.json({ success: true, data: user.toPublic() });
}));

// PUT /api/auth/me - update own name / roll number / phone
router.put('/auth/me', requireAuth(), wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
  ['name', 'rollNumber', 'phone'].forEach((k) => { if (req.body[k] !== undefined) user[k] = req.body[k]; });
  await user.save();
  res.json({ success: true, message: 'Profile updated', data: { token: issueToken(user), user: user.toPublic() } });
}));

// GET /api/users - admin: list all accounts
router.get('/users', requireAuth('admin'), wrap(async (req, res) => {
  const filter = req.query.role ? { role: req.query.role } : {};
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users.map((u) => u.toPublic()) });
}));

// GET /api/users/stats - admin: account counts
router.get('/users/stats', requireAuth('admin'), wrap(async (req, res) => {
  const [students, admins] = await Promise.all([User.countDocuments({ role: 'student' }), User.countDocuments({ role: 'admin' })]);
  res.json({ success: true, data: { students, admins } });
}));

/**
 * GET /api/users/:id
 * INTERNAL: other microservices look up a user's profile (x-service-key required).
 * Used by the Claim Service to attach the student's details to a claim.
 */
router.get('/users/:id', serviceAuth, wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user.toPublic() });
}));

// DELETE /api/users/:id - admin removes a student account
router.delete('/users/:id', requireAuth('admin'), wrap(async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, message: 'Account deleted' });
}));

module.exports = router;
module.exports.issueToken = issueToken;
