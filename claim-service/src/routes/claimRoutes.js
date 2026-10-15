const express = require('express');
const Claim = require('../models/Claim');
const serviceAuth = require('../middleware/serviceAuth');
const itemClient = require('../services/itemClient');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const EDITABLE = ['claimantName', 'claimantEmail', 'claimantPhone', 'rollNumber', 'proofDescription'];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// GET /api/claims?status=pending&itemId=...
router.get('/', wrap(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.itemId) filter.itemId = req.query.itemId;
  const claims = await Claim.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: claims.length, data: claims });
}));

/**
 * GET /api/claims/with-items
 * INTER-SERVICE: returns every claim enriched with the live item record
 * fetched from the Item Service over REST.
 */
router.get('/with-items', wrap(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const claims = await Claim.find(filter).sort({ createdAt: -1 }).lean();

  const uniqueIds = [...new Set(claims.map((c) => c.itemId))];
  const items = await Promise.all(uniqueIds.map((id) => itemClient.tryGetItem(id)));
  const itemMap = Object.fromEntries(uniqueIds.map((id, i) => [id, items[i]]));

  const data = claims.map((c) => ({ ...c, item: itemMap[c.itemId] || null }));
  res.json({ success: true, count: data.length, data });
}));

// GET /api/claims/stats
router.get('/stats', wrap(async (req, res) => {
  const [total, pending, approved, rejected] = await Promise.all([
    Claim.countDocuments(),
    Claim.countDocuments({ status: 'pending' }),
    Claim.countDocuments({ status: 'approved' }),
    Claim.countDocuments({ status: 'rejected' }),
  ]);
  res.json({ success: true, data: { total, pending, approved, rejected } });
}));

// GET /api/claims/item/:itemId - all claims for one item (called by Item Service)
router.get('/item/:itemId', wrap(async (req, res) => {
  const claims = await Claim.find({ itemId: req.params.itemId }).sort({ createdAt: -1 });
  res.json({ success: true, count: claims.length, data: claims });
}));

// DELETE /api/claims/item/:itemId - INTERNAL cascade delete (called by Item Service)
router.delete('/item/:itemId', serviceAuth, wrap(async (req, res) => {
  const result = await Claim.deleteMany({ itemId: req.params.itemId });
  res.json({ success: true, deletedCount: result.deletedCount });
}));

// GET /api/claims/:id - single claim with its item (fetched from Item Service)
router.get('/:id', wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id).lean();
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
  const item = await itemClient.tryGetItem(claim.itemId);
  res.json({ success: true, data: { ...claim, item } });
}));

/**
 * POST /api/claims
 * INTER-SERVICE: before saving, the Claim Service calls the Item Service to
 * check that the item exists and is still open.
 */
router.post('/', wrap(async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ success: false, message: 'itemId is required' });

  const item = await itemClient.getItem(itemId); // throws 404 / 503 on failure
  if (item.status !== 'open') {
    return res.status(409).json({ success: false, message: `This item is already ${item.status}; it cannot be claimed.` });
  }

  const email = String(req.body.claimantEmail || '').toLowerCase().trim();
  const duplicate = await Claim.findOne({ itemId, claimantEmail: email, status: 'pending' });
  if (duplicate) {
    return res.status(409).json({ success: false, message: 'You already have a pending claim for this item.' });
  }

  const claim = await Claim.create({ ...pick(req.body, EDITABLE), itemId, itemTitle: item.title });
  res.status(201).json({ success: true, message: 'Claim submitted successfully', data: claim });
}));

// PUT /api/claims/:id - edit a claim (only while pending)
router.put('/:id', wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
  if (claim.status !== 'pending') {
    return res.status(409).json({ success: false, message: 'Only pending claims can be edited' });
  }
  Object.assign(claim, pick(req.body, EDITABLE));
  await claim.save();
  res.json({ success: true, message: 'Claim updated', data: claim });
}));

/**
 * PATCH /api/claims/:id/approve
 * INTER-SERVICE: approving a claim tells the Item Service to mark the item
 * "claimed". Other pending claims on the same item are auto-rejected.
 */
router.patch('/:id/approve', wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
  if (claim.status !== 'pending') {
    return res.status(409).json({ success: false, message: `Claim is already ${claim.status}` });
  }

  // Update the other service first; if it fails, nothing changes here.
  const item = await itemClient.updateItemStatus(claim.itemId, 'claimed', claim.claimantName);

  claim.status = 'approved';
  claim.adminNote = req.body.adminNote || '';
  claim.reviewedAt = new Date();
  await claim.save();

  const others = await Claim.updateMany(
    { itemId: claim.itemId, _id: { $ne: claim._id }, status: 'pending' },
    { status: 'rejected', adminNote: 'Another claim for this item was approved', reviewedAt: new Date() }
  );

  res.json({
    success: true,
    message: 'Claim approved and item marked as claimed',
    data: { claim, item, autoRejected: others.modifiedCount },
  });
}));

// PATCH /api/claims/:id/reject
router.patch('/:id/reject', wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
  if (claim.status !== 'pending') {
    return res.status(409).json({ success: false, message: `Claim is already ${claim.status}` });
  }
  claim.status = 'rejected';
  claim.adminNote = req.body.adminNote || '';
  claim.reviewedAt = new Date();
  await claim.save();
  res.json({ success: true, message: 'Claim rejected', data: claim });
}));

/**
 * DELETE /api/claims/:id
 * If an approved claim is deleted, the item is re-opened in the Item Service.
 */
router.delete('/:id', wrap(async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });

  let itemReopened = false;
  if (claim.status === 'approved') {
    await itemClient.updateItemStatus(claim.itemId, 'open');
    itemReopened = true;
  }
  await claim.deleteOne();
  res.json({ success: true, message: 'Claim deleted', itemReopened });
}));

module.exports = router;
