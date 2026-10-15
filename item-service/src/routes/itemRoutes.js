const express = require('express');
const Item = require('../models/Item');
const serviceAuth = require('../middleware/serviceAuth');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const claimClient = require('../services/claimClient');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Fields a user may set/edit. Reporter name/email come from the login token, and
// status is controlled by the Claim Service.
const EDITABLE = ['title', 'description', 'type', 'category', 'location', 'date', 'imageUrl', 'reporterPhone'];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

const canManage = (user, item) => user && (user.role === 'admin' || (item.reporterId && item.reporterId === user.id));

/**
 * GET /api/items  (public)
 * Query: type, category, status, search, page, limit
 */
router.get('/', wrap(async (req, res) => {
  const { type, category, status, search } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

  const filter = {};
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }

  const [items, total] = await Promise.all([
    Item.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Item.countDocuments(filter),
  ]);
  res.json({ success: true, count: items.length, total, page, data: items });
}));

// GET /api/items/stats - counters for the home page (public)
router.get('/stats', wrap(async (req, res) => {
  const [total, lost, found, open, claimed, resolved] = await Promise.all([
    Item.countDocuments(),
    Item.countDocuments({ type: 'lost' }),
    Item.countDocuments({ type: 'found' }),
    Item.countDocuments({ status: 'open' }),
    Item.countDocuments({ status: 'claimed' }),
    Item.countDocuments({ status: 'resolved' }),
  ]);
  res.json({ success: true, data: { total, lost, found, open, claimed, resolved } });
}));

// GET /api/items/categories (public)
router.get('/categories', (req, res) => {
  res.json({ success: true, data: Item.CATEGORIES });
});

// GET /api/items/mine - items reported by the logged-in user
router.get('/mine', requireAuth(), wrap(async (req, res) => {
  const items = await Item.find({ reporterId: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, count: items.length, data: items });
}));

// GET /api/items/:id (public)
router.get('/:id', wrap(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, data: item });
}));

/**
 * GET /api/items/:id/with-claims
 * INTER-SERVICE: Item Service fetches the item from its own DB, then calls the
 * Claim Service over REST to get every claim filed for it, and merges both.
 * Proof and contact details are only shown to the admin desk and to each claim's
 * own author; everyone else sees a short, anonymised summary.
 */
router.get('/:id/with-claims', optionalAuth, wrap(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

  let claims = [];
  let claimServiceAvailable = true;
  try {
    claims = await claimClient.getClaimsForItem(item._id);
  } catch (err) {
    // Graceful degradation: still return the item if the Claim Service is down
    claimServiceAvailable = false;
    console.warn('[item-service] Claim Service unreachable:', err.message);
  }

  const user = req.user;
  const visible = claims.map((c) => {
    const mine = user && c.claimantId && c.claimantId === user.id;
    if ((user && user.role === 'admin') || mine) return { ...c, mine: !!mine };
    return {
      _id: c._id,
      status: c.status,
      createdAt: c.createdAt,
      claimantName: String(c.claimantName || 'A student').split(' ')[0],
      mine: false,
    };
  });

  res.json({
    success: true,
    data: { item, claims: visible, claimCount: visible.length, claimServiceAvailable, canManage: !!canManage(user, item) },
  });
}));

// POST /api/items - report a lost or found item (logged-in students and admins)
router.post('/', requireAuth('student', 'admin'), wrap(async (req, res) => {
  const item = await Item.create({
    ...pick(req.body, EDITABLE),
    reporterId: req.user.id,
    reporterName: req.user.name,
    reporterEmail: req.user.email,
  });
  res.status(201).json({ success: true, message: 'Item reported successfully', data: item });
}));

// PUT /api/items/:id - update item details (the reporter or the admin desk)
router.put('/:id', requireAuth(), wrap(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  if (!canManage(req.user, item)) return res.status(403).json({ success: false, message: 'Only the person who reported this item can edit it.' });

  Object.assign(item, pick(req.body, EDITABLE));
  await item.save();
  res.json({ success: true, message: 'Item updated', data: item });
}));

/**
 * PATCH /api/items/:id/status
 * INTERNAL: called by the Claim Service when a claim is approved or removed.
 * Protected with the shared x-service-key header.
 */
router.patch('/:id/status', serviceAuth, wrap(async (req, res) => {
  const { status, claimedBy = '' } = req.body;
  if (!['open', 'claimed', 'resolved'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be open, claimed or resolved' });
  }
  const item = await Item.findByIdAndUpdate(
    req.params.id,
    { status, claimedBy: status === 'open' ? '' : claimedBy },
    { new: true }
  );
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, message: `Item marked ${status}`, data: item });
}));

// PATCH /api/items/:id/resolve - admin desk confirms the item was handed over
router.patch('/:id/resolve', requireAuth('admin'), wrap(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  if (item.status !== 'claimed') {
    return res.status(409).json({ success: false, message: 'Only claimed items can be marked returned' });
  }
  item.status = 'resolved';
  await item.save();
  res.json({ success: true, message: 'Item marked as returned to its owner', data: item });
}));

/**
 * DELETE /api/items/:id (the reporter or the admin desk)
 * Deletes the item and asks the Claim Service to remove its claims (cascade over REST).
 */
router.delete('/:id', requireAuth(), wrap(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  if (!canManage(req.user, item)) return res.status(403).json({ success: false, message: 'Only the person who reported this item can delete it.' });
  await Item.findByIdAndDelete(item._id);

  let claimsDeleted = 0;
  try {
    const result = await claimClient.deleteClaimsForItem(item._id);
    claimsDeleted = result.deletedCount || 0;
  } catch (err) {
    console.warn('[item-service] Could not cascade-delete claims:', err.message);
  }
  res.json({ success: true, message: 'Item deleted', claimsDeleted });
}));

module.exports = router;
