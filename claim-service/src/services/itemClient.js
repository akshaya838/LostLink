// REST client for talking to the Item Service (inter-service communication)
const axios = require('axios');

const client = axios.create({
  baseURL: process.env.ITEM_SERVICE_URL || 'http://localhost:5001',
  timeout: 15000, // Render free tier can cold-start slowly
  headers: { 'x-service-key': process.env.SERVICE_KEY || '' },
});

// Turns axios failures into errors our error handler understands
function toServiceError(err, fallbackMsg) {
  if (err.response) {
    const e = new Error(err.response.data?.message || fallbackMsg);
    e.status = err.response.status === 404 ? 404 : 502;
    return e;
  }
  const e = new Error('Item Service is unavailable. Please try again shortly.');
  e.status = 503;
  return e;
}

async function getItem(itemId) {
  try {
    const { data } = await client.get(`/api/items/${itemId}`);
    return data.data;
  } catch (err) {
    throw toServiceError(err, 'Failed to fetch item');
  }
}

// Returns null instead of throwing - used when enriching lists
async function tryGetItem(itemId) {
  try {
    return await getItem(itemId);
  } catch {
    return null;
  }
}

async function updateItemStatus(itemId, status, claimedBy = '') {
  try {
    const { data } = await client.patch(`/api/items/${itemId}/status`, { status, claimedBy });
    return data.data;
  } catch (err) {
    throw toServiceError(err, 'Failed to update item status');
  }
}

module.exports = { getItem, tryGetItem, updateItemStatus };
