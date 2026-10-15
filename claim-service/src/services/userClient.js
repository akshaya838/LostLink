// REST client for talking to the User Service (inter-service communication)
const axios = require('axios');

const client = axios.create({
  baseURL: process.env.USER_SERVICE_URL || 'http://localhost:5003',
  timeout: 15000, // Render free tier can cold-start slowly
  headers: { 'x-service-key': process.env.SERVICE_KEY || '' },
});

// Fetches a user's profile. Returns null if the User Service can't be reached,
// so the caller can fall back to the details inside the login token.
async function tryGetUser(userId) {
  try {
    const { data } = await client.get(`/api/users/${userId}`);
    return data.data;
  } catch (err) {
    console.warn('[claim-service] User Service lookup failed:', err.response?.status || err.message);
    return null;
  }
}

module.exports = { tryGetUser };
