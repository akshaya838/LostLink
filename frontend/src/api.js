import axios from 'axios';

// Each microservice has its own base URL - the frontend talks to all three directly.
export const ITEM_URL = import.meta.env.VITE_ITEM_SERVICE_URL || 'http://localhost:5001';
export const CLAIM_URL = import.meta.env.VITE_CLAIM_SERVICE_URL || 'http://localhost:5002';
export const USER_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:5003';

const TOKEN_KEY = 'lostlink_token';

// Login token kept in the browser so the student stays logged in between visits.
// Wrapped in try/catch because storage can be blocked (private mode, strict settings).
export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(t) {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

function makeClient(baseURL) {
  const c = axios.create({ baseURL, timeout: 30000 });
  // Attach the login token to every request
  c.interceptors.request.use((cfg) => {
    const t = tokenStore.get();
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
  });
  // If a stored token has expired, log out cleanly
  c.interceptors.response.use(undefined, (err) => {
    if (err.response?.status === 401 && tokenStore.get() && !err.config.url.includes('/auth/login')) {
      tokenStore.set(null);
      window.dispatchEvent(new Event('lostlink:logout'));
    }
    return Promise.reject(err);
  });
  return c;
}

const itemApi = makeClient(`${ITEM_URL}/api/items`);
const claimApi = makeClient(`${CLAIM_URL}/api/claims`);
const userApi = makeClient(`${USER_URL}/api`);

// Pulls a readable message out of any axios error
export function errMsg(err) {
  if (err.response?.data?.errors) return err.response.data.errors.join(', ');
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ECONNABORTED') return 'The server took too long to answer. It may be waking up, so try again in a few seconds.';
  if (err.message === 'Network Error') return 'Couldn’t reach the server. Check your connection, or wait a few seconds while it wakes up.';
  return err.message || 'Something went wrong';
}

export const auth = {
  login: (email, password) => userApi.post('/auth/login', { email, password }).then((r) => r.data.data),
  register: (body) => userApi.post('/auth/register', body).then((r) => r.data.data),
  me: () => userApi.get('/auth/me').then((r) => r.data.data),
  updateMe: (body) => userApi.put('/auth/me', body).then((r) => r.data.data),
};

export const items = {
  list: (params) => itemApi.get('/', { params }).then((r) => r.data),
  mine: () => itemApi.get('/mine').then((r) => r.data.data),
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
  withItems: (params) => claimApi.get('/with-items', { params }).then((r) => r.data.data),
  mine: () => claimApi.get('/mine').then((r) => r.data.data),
  stats: () => claimApi.get('/stats').then((r) => r.data.data),
  create: (body) => claimApi.post('/', body).then((r) => r.data),
  message: (id, text) => claimApi.post(`/${id}/messages`, { text }).then((r) => r.data),
  approve: (id, adminNote) => claimApi.patch(`/${id}/approve`, { adminNote }).then((r) => r.data),
  reject: (id, adminNote) => claimApi.patch(`/${id}/reject`, { adminNote }).then((r) => r.data),
  remove: (id) => claimApi.delete(`/${id}`).then((r) => r.data),
};

export const health = {
  item: () => axios.get(`${ITEM_URL}/health`, { timeout: 30000 }).then((r) => r.data),
  claim: () => axios.get(`${CLAIM_URL}/health`, { timeout: 30000 }).then((r) => r.data),
  user: () => axios.get(`${USER_URL}/health`, { timeout: 30000 }).then((r) => r.data),
};
