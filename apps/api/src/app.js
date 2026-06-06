require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const searchRouter = require('./routes/search');

const app = express();

// Trust Railway's load balancer proxy so express-rate-limit can identify client IPs correctly
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? (process.env.FRONTEND_URL || true) : true,
  credentials: true,
}));
app.use(express.json());

app.use('/api/search', rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down.' },
}));

app.use('/api/search', searchRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built frontend in production
const frontendDist = path.join(__dirname, '../../../apps/web/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] http://0.0.0.0:${PORT}  (${process.env.NODE_ENV || 'development'})`);
  });

  // Tidy up the shared headless browser on shutdown so it doesn't linger.
  const { closeBrowser } = require('./utils/browser');
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, async () => {
      await closeBrowser();
      process.exit(0);
    });
  }
}
