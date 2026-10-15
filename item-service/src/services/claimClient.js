// REST client for talking to the Claim Service (inter-service communication)
const axios = require('axios');

const client = axios.create({
  baseURL: process.env.CLAIM_SERVICE_URL || 'http://localhost:5002',
  timeout: 15000, // Render free tier can cold-start slowly
  headers: { 'x-service-key': process.env.SERVICE_KEY || '' },
});

async function getClaimsForItem(itemId) {
  const { data } = await client.get(`/api/claims/item/${itemId}`);
  return data.data;
}

async function deleteClaimsForItem(itemId) {
  const { data } = await client.delete(`/api/claims/item/${itemId}`);
  return data;
}

async function getClaimServiceHealth() {
  const { data } = await client.get('/health');
  return data;
}

module.exports = { getClaimsForItem, deleteClaimsForItem, getClaimServiceHealth };
