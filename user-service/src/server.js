require('dotenv').config();
// Use public DNS so the mongodb+srv:// lookup works on networks/ISPs that block SRV queries
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const userRoutes = require('./routes/userRoutes');
const User = require('./models/User');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5003;

const origins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
app.use(cors({ origin: origins.includes('*') ? '*' : origins }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({
    service: 'user-service',
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ service: 'LostLink User Service', docs: '/api/auth', health: '/health' });
});

app.use('/api', userRoutes);

app.use(notFound);
app.use(errorHandler);

// Creates the admin desk account from environment variables if it doesn't exist yet
async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('[user-service] ADMIN_EMAIL / ADMIN_PASSWORD not set - no admin account created');
    return;
  }
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) return;
  await User.create({ name: ADMIN_NAME || 'Lost and Found Desk', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
  console.log(`[user-service] Admin account created for ${ADMIN_EMAIL}`);
}

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('[user-service] JWT_SECRET is not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[user-service] Connected to MongoDB');
    await ensureAdmin();
    app.listen(PORT, () => console.log(`[user-service] Running on port ${PORT}`));
  } catch (err) {
    console.error('[user-service] Failed to start:', err.message);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;
module.exports.ensureAdmin = ensureAdmin;
