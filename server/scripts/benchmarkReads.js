// Read-only API timing probe against the configured database. Never prints records or tokens.
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const createApp = require('../app');

(async () => {
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000, autoIndex: false });
    server = createApp().listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    for (const role of ['student', 'supervisor', 'coordinator', 'examiner']) {
      const user = await User.findOne({ role }).select('_id');
      if (!user) { console.log(`${role}: no existing account to measure`); continue; }
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '2m' });
      const paths = ['/api/projects/dashboard', '/api/notifications', '/api/defenses', '/api/projects/archive'];
      if (role === 'student') paths.push('/api/projects/my');
      for (const path of paths) {
        const times = [];
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { headers: { Authorization: `Bearer ${token}` } });
          await response.arrayBuffer();
          if (!response.ok) throw new Error(`${role} ${path}: HTTP ${response.status}`);
          times.push(performance.now() - start);
        }
        const sorted = [...times].sort((a, b) => a - b);
        console.log(`${role} ${path}: median=${sorted[2].toFixed(1)}ms max=${sorted[4].toFixed(1)}ms (5 reads)`);
      }
    }
  } catch (error) {
    console.error(`API timing probe failed (${error.name}); database access or configuration is unavailable.`);
    process.exitCode = 1;
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }
})();
