// Fixed windows with bounded storage; clients cannot choose the key via forwarded headers.
const rateLimit = ({ limit, windowMs }) => {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of clients) if (value.reset <= now) clients.delete(key);
    const key = req.ip;
    let entry = clients.get(key);
    if (!entry) {
      if (clients.size >= 10000) return res.status(503).json({ success: false, message: 'Please try again later' });
      entry = { count: 0, reset: now + windowMs };
      clients.set(key, entry);
    }
    if (++entry.count > limit) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }
    next();
  };
};

const safeInput = (req, res, next) => {
  const valid = (value, depth = 0) => {
    if (depth > 15) return false;
    if (typeof value === 'string') return value.length <= 20000 && !value.includes('\0');
    if (!value || typeof value !== 'object') return true;
    return Object.entries(value).every(([key, child]) =>
      !key.startsWith('$') && !key.includes('.') &&
      !['__proto__', 'constructor', 'prototype'].includes(key) && valid(child, depth + 1));
  };
  if (!valid(req.body) || !valid(req.query)) {
    return res.status(400).json({ success: false, message: 'Invalid request input' });
  }
  next();
};

module.exports = { rateLimit, safeInput };
