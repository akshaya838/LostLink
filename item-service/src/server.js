require('dotenv').config();
// Use public DNS so the mongodb+srv:// lookup works on networks/ISPs that block SRV queries
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const itemRoutes = require('./routes/itemRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5001;

const origins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
app.use(cors({ origin: origins.includes('*') ? '*' : origins }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Health check - used by Render and by the Claim Service
app.get('/health', (req, res) => {
  res.json({
    service: 'item-service',
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ service: 'LostLink Item Service', docs: '/api/items', health: '/health' });
});

app.use('/api/items', itemRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('[item-service] JWT_SECRET is not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[item-service] Connected to MongoDB');
    app.listen(PORT, () => console.log(`[item-service] Running on port ${PORT}`));
  } catch (err) {
    console.error('[item-service] Failed to start:', err.message);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;
