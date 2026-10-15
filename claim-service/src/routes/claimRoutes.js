const express = require('express');
const Claim = require('../models/Claim');
const serviceAuth = require('../middleware/serviceAuth');
const { requireAuth } = require('../middleware/auth');
const itemClient = require('../services/itemClient');
const userClient = require('../services/userClient');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const EDITABLE = ['claimantPhone', 'rollNumber', 'proofDescription'];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const isOwner = (user, claim) => user && claim.claimantId && claim.claimantId === user.id;

// Adds the live item record (from the Item Service) to each claim
async function withItems(claims) {
  const uniqueIds = [...new Set(claims.map((c) => c.itemId))];
  const items = await Promise.all(uniqueIds.map((id) => itemClient.tryGetItem(id)));
  const itemMap = Object.fromEntries(uniqueIds.map((id, i) => [id, items[i]]));
  return claims.map((c) => ({ ...c, item: itemMap[c.itemId] || null }));
}

// GET /api/claims?status=pending&itemId=...  (admin desk)
router.get('/', requireAuth('admin'), wrap(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.itemId) filter.itemId = req.query.itemId;
  const claims = await Claim.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: claims.length, data: claims });
}));

/**
 * GET /api/claims/with-items  (admin desk)
 * INTER-SERVICE: returns every claim enriched with the live item record
 * fetched from the Item Service over REST.
 */
router.get('/with-items', requireAuth('admin'), wrap(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.awaitingReply === 'true') filter.awaitingReply = true;
  const claims = await Claim.find(filter).sort({ updatedAt: -1 }).lean();
  const data = await withItems(claims);
  res.json({ success: true, count: data.length, data });
}));

// GET /api/claims/stats  (admin desk)
router.get('/stats', requireAuth('admin'), wrap(async (req, res) => {
  const [total, pending, approved, rejected, awaitingReply] = await Promise.all([
    Claim.countDocuments(),
    Claim.countDocuments({ status: 'pending' }),
    Claim.countDocuments({ status: 'approved' }),
    Claim.countDocuments({ status: 'rejected' }),
    Claim.countDocuments({ status: 'pending', awaitingReply: true }),
  ]);
  res.json({ success: true, data: { total, pending, approved, rejected, awaitingReply } });
}));

// GET /api/claims/mine - the logged-in student's own claims, with item details
router.get('/mine', requireAuth(), wrap(async (req, res) => {
  const claims = await Claim.find({ claimantId: req.user.id }).sort({ updatedAt: -1 }).lean();
  const data = await withItems(claims);
  res.json({ success: true, count: data.length, data });
}));

// GET /api/claims/item/:itemId - INTERNAL: all claims for one item (called by Item Service)
router.get('/item/:itemId', serviceAuth, wrap(async (req, res) => {
  const claims = await Claim.find({ itemId: req.params.itemId }).sort({ createdAt: -1 });
  res.json({ success: true, count: claims.length, data: claims });
}));

// DELETE /api/claims/item/:itemId - INTERNAL cascade delete (called by Item Service)
router.delete('/item/:itemId', serviceAuth, wrap(async (req, res) => {
  const result = await Claim.deleteMany({ itemId: req.params.itemId });
  res.json({ success: true, deletedCount: result.deletedCount });
}));

// GET /api/claims/:id - single claim with its item (admin desk or the claimant)
router.get('/:id', requireAuth(), wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id).lean();
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
  if (req.user.role !== 'admin' && !isOwner(req.user, claim)) {
    return res.status(403).json({ success: false, message: 'You can only view your own claims.' });
  }
  const item = await itemClient.tryGetItem(claim.itemId);
  res.json({ success: true, data: { ...claim, item } });
}));

/**
 * POST /api/claims  (logged-in students)
 * INTER-SERVICE:
 *  1. calls the Item Service to check the item exists and is still open
 *  2. calls the User Service to copy the student's name, email and roll number
 */
router.post('/', requireAuth('student'), wrap(async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ success: false, message: 'itemId is required' });

  const item = await itemClient.getItem(itemId); // throws 404 / 503 on failure
  if (item.status !== 'open') {
    return res.status(409).json({ success: false, message: `This item is already ${item.status}; it cannot be claimed.` });
  }
  if (item.reporterId && item.reporterId === req.user.id) {
    return res.status(409).json({ success: false, message: 'You reported this item yourself, so you cannot claim it.' });
  }

  const duplicate = await Claim.findOne({ itemId, claimantId: req.user.id, status: 'pending' });
  if (duplicate) {
    return res.status(409).json({ success: false, message: 'You already have a pending claim for this item.' });
  }

  // Profile from the User Service; fall back to the verified token if it's unreachable
  const profile = (await userClient.tryGetUser(req.user.id)) || {};
  const claim = await Claim.create({
    ...pick(req.body, EDITABLE),
    itemId,
    itemTitle: item.title,
    claimantId: req.user.id,
    claimantName: profile.name || req.user.name,
    claimantEmail: profile.email || req.user.email,
    rollNumber: req.body.rollNumber || profile.rollNumber || '',
    claimantPhone: req.body.claimantPhone || profile.phone || '',
  });
  res.status(201).json({ success: true, message: 'Claim submitted successfully', data: claim });
}));

// PUT /api/claims/:id - the claimant edits their claim while it's pending
router.put('/:id', requireAuth(), wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
  if (!isOwner(req.user, claim)) return res.status(403).json({ success: false, message: 'You can only edit your own claims.' });
  if (claim.status !== 'pending') {
    return res.status(409).json({ success: false, message: 'Only pending claims can be edited' });
  }
  Object.assign(claim, pick(req.body, EDITABLE));
  await claim.save();
  res.json({ success: true, message: 'Claim updated', data: claim });
}));

/**
 * POST /api/claims/:id/messages
 * The admin desk asks the claimant a question, or the claimant answers.
 * Only allowed while the claim is pending.
 */
router.post('/:id/messages', requireAuth(), wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !isOwner(req.user, claim)) {
    return res.status(403).json({ success: false, message: 'You can only reply to your own claims.' });
  }
  if (claim.status !== 'pending') {
    return res.status(409).json({ success: false, message: `This claim is already ${claim.status}; the conversation is closed.` });
  }
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ success: false, message: 'Write a message first.' });

  claim.messages.push({ from: isAdmin ? 'admin' : 'student', authorName: req.user.name, text });
  claim.awaitingReply = isAdmin; // a desk question waits for the student; a student reply clears it
  await claim.save();
  res.status(201).json({
    success: true,
    message: isAdmin ? 'Question sent to the student' : 'Reply sent to the desk',
    data: claim,
  });
}));

/**
 * PATCH /api/claims/:id/approve  (admin desk)
 * INTER-SERVICE: approving a claim tells the Item Service to mark the item
 * "claimed". Other pending claims on the same item are auto-rejected.
 */
router.patch('/:id/approve', requireAuth('admin'), wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
  if (claim.status !== 'pending') {
    return res.status(409).json({ success: false, message: `Claim is already ${claim.status}` });
  }

  // Update the other service first; if it fails, nothing changes here.
  const item = await itemClient.updateItemStatus(claim.itemId, 'claimed', claim.claimantName);

  claim.status = 'approved';
  claim.awaitingReply = false;
  claim.adminNote = req.body.adminNote || '';
  claim.reviewedAt = new Date();
  await claim.save();

  const others = await Claim.updateMany(
    { itemId: claim.itemId, _id: { $ne: claim._id }, status: 'pending' },
    { status: 'rejected', awaitingReply: false, adminNote: 'Another claim for this item was approved', reviewedAt: new Date() }
  );

  res.json({
    success: true,
    message: 'Claim approved and item marked as claimed',
    data: { claim, item, autoRejected: others.modifiedCount },
  });
}));

// PATCH /api/claims/:id/reject  (admin desk)
router.patch('/:id/reject', requireAuth('admin'), wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
  if (claim.status !== 'pending') {
    return res.status(409).json({ success: false, message: `Claim is already ${claim.status}` });
  }
  claim.status = 'rejected';
  claim.awaitingReply = false;
  claim.adminNote = req.body.adminNote || '';
  claim.reviewedAt = new Date();
  await claim.save();
  res.json({ success: true, message: 'Claim rejected', data: claim });
}));

/**
 * DELETE /api/claims/:id
 * The admin desk can delete any claim; a student can withdraw their own pending claim.
 * If an approved claim is deleted, the item is re-opened in the Item Service.
 */
router.delete('/:id', requireAuth(), wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !(isOwner(req.user, claim) && claim.status === 'pending')) {
    return res.status(403).json({ success: false, message: 'You can only withdraw your own pending claims.' });
  }

  let itemReopened = false;
  if (claim.status === 'approved') {
    await itemClient.updateItemStatus(claim.itemId, 'open');
    itemReopened = true;
  }
  await claim.deleteOne();
  res.json({ success: true, message: isAdmin ? 'Claim deleted' : 'Claim withdrawn', itemReopened });
}));

module.exports = router;
