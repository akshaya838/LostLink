require('dotenv').config();
// Use public DNS so the mongodb+srv:// lookup works on networks/ISPs that block SRV queries
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const claimRoutes = require('./routes/claimRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5002;

const origins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
app.use(cors({ origin: origins.includes('*') ? '*' : origins }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({
    service: 'claim-service',
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ service: 'LostLink Claim Service', docs: '/api/claims', health: '/health' });
});

app.use('/api/claims', claimRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('[claim-service] JWT_SECRET is not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[claim-service] Connected to MongoDB');
    app.listen(PORT, () => console.log(`[claim-service] Running on port ${PORT}`));
  } catch (err) {
    console.error('[claim-service] Failed to start:', err.message);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;
