import axios from 'axios';

// Each microservice has its own base URL - the frontend talks to both directly.
export const ITEM_URL = import.meta.env.VITE_ITEM_SERVICE_URL || 'http://localhost:5001';
export const CLAIM_URL = import.meta.env.VITE_CLAIM_SERVICE_URL || 'http://localhost:5002';

const itemApi = axios.create({ baseURL: `${ITEM_URL}/api/items`, timeout: 30000 });
const claimApi = axios.create({ baseURL: `${CLAIM_URL}/api/claims`, timeout: 30000 });

// Pulls a readable message out of any axios error
export function errMsg(err) {
  if (err.response?.data?.errors) return err.response.data.errors.join(', ');
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ECONNABORTED') return 'Request timed out - the server may be waking up, try again.';
  return err.message || 'Something went wrong';
}

export const items = {
  list: (params) => itemApi.get('/', { params }).then((r) => r.data),
  stats: () => itemApi.get('/stats').then((r) => r.data.data),
  categories: () => itemApi.get('/categories').then((r) => r.data.data),
  get: (id) => itemApi.get(`/${id}`).then((r) => r.data.data),
  withClaims: (id) => itemApi.get(`/${id}/with-claims`).then((r) => r.data.data),
  create: (body) => itemApi.post('/', body).then((r) => r.data),
  update: (id, body) => itemApi.put(`/${id}`, body).then((r) => r.data),
  resolve: (id) => itemApi.patch(`/${id}/resolve`).then((r) => r.data),
  remove: (id) => itemApi.delete(`/${id}`).then((r) => r.data),
};

export const claims = {
  list: (params) => claimApi.get('/', { params }).then((r) => r.data),
  withItems: (params) => claimApi.get('/with-items', { params }).then((r) => r.data.data),
  stats: () => claimApi.get('/stats').then((r) => r.data.data),
  create: (body) => claimApi.post('/', body).then((r) => r.data),
  approve: (id, adminNote) => claimApi.patch(`/${id}/approve`, { adminNote }).then((r) => r.data),
  reject: (id, adminNote) => claimApi.patch(`/${id}/reject`, { adminNote }).then((r) => r.data),
  remove: (id) => claimApi.delete(`/${id}`).then((r) => r.data),
};

export const health = {
  item: () => axios.get(`${ITEM_URL}/health`, { timeout: 30000 }).then((r) => r.data),
  claim: () => axios.get(`${CLAIM_URL}/health`, { timeout: 30000 }).then((r) => r.data),
};
