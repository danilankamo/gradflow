const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { rateLimit, safeInput } = require('./middleware/security');

const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(value => value.trim());
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) {
      return res.status(403).json({ success: false, message: 'Origin is not allowed' });
    }
    next();
  });
  app.use(cors({ origin: origins, credentials: true }));
  const authentication = rateLimit({ limit: 30, windowMs: 15 * 60 * 1000 });
  app.use(['/api/auth/login', '/api/auth/register'], authentication);
  const writes = rateLimit({ limit: 120, windowMs: 60 * 1000 });
  app.use('/api', (req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : writes(req, res, next));
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb', parameterLimit: 100 }));
  app.use(cookieParser());
  app.use(safeInput);
  app.use('/uploads', require('./routes/files'));
  app.get('/', (req, res) => res.json({ message: 'GradFlow API is running...' }));
  app.use('/api', require('./routes'));
  app.use(require('./middleware/error'));
  return app;
};

module.exports = createApp;
