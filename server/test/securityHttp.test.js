const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const createApp = require('../app');
const { hasValidContent, persistFile } = require('../middleware/upload');

test('HTTP security controls through the production Express app', async t => {
  process.env.JWT_SECRET = 'security-test-secret-only';
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const originalFind = User.findById;
  t.after(() => { User.findById = originalFind; });
  const id = '507f1f77bcf86cd799439011';
  User.findById = () => ({ select: async () => new User({ _id: id, name: 'Student', email: 's@example.com', role: 'student' }) });
  const token = jwt.sign({ id, role: 'coordinator' }, process.env.JWT_SECRET);
  const request = (path, method = 'GET', body, auth = false, extra = {}) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}), ...extra },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });

  await t.test('every protected route rejects anonymous requests', async () => {
    const groups = [['/api/users', 'users'], ['/api/projects', 'projects'], ['/api', 'milestones'], ['/api', 'submissions'], ['/api/defenses', 'defenses'], ['/api', 'evaluations'], ['/api/notifications', 'notifications']];
    for (const [prefix, name] of groups) {
      for (const layer of require(`../routes/${name}`).stack.filter(item => item.route)) {
        for (const method of Object.keys(layer.route.methods)) {
          const response = await request(prefix + (layer.route.path === '/' ? '' : layer.route.path.replace(':id', id)), method.toUpperCase());
          assert.equal(response.status, 401, `${method} ${prefix}${layer.route.path}`);
        }
      }
    }
    assert.equal((await request('/uploads/private.pdf')).status, 401);
  });
  await t.test('JWT role claims cannot override the database role', async () => {
    for (const [path, method] of [['/api/users', 'GET'], ['/api/users/supervisors', 'POST'], ['/api/projects/coordinator/review', 'GET'], ['/api/defenses', 'POST'], [`/api/submissions/${id}/review`, 'PATCH'], [`/api/defenses/${id}/evaluations`, 'POST']]) {
      assert.equal((await request(path, method, undefined, true)).status, 403);
    }
    assert.equal((await request('/api/users/507f1f77bcf86cd799439012', 'GET', undefined, true)).status, 403);
  });
  await t.test('invalid, expired, and deleted-user tokens fail', async () => {
    for (const value of ['invalid', jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
      assert.equal((await request('/api/users/me', 'GET', undefined, false, { Authorization: `Bearer ${value}` })).status, 401);
    }
    User.findById = () => ({ select: async () => null });
    assert.equal((await request('/api/users/me', 'GET', undefined, true)).status, 401);
    User.findById = () => ({ select: async () => new User({ _id: id, role: 'student' }) });
  });
  await t.test('private downloads hide other students files and server errors', async () => {
    const Submission = require('../models/Submission');
    const Project = require('../models/Project');
    const originalSubmission = Submission.findOne;
    const originalProject = Project.findById;
    try {
      Submission.findOne = async () => ({ projectId: id });
      Project.findById = async () => ({ students: ['other-student'] });
      assert.equal((await request('/uploads/private.pdf', 'GET', undefined, true)).status, 404);
      Submission.findOne = async () => { throw new Error('database-password-secret'); };
      const response = await request('/uploads/private.pdf', 'GET', undefined, true);
      assert.equal(response.status, 500);
      assert.equal((await response.text()).includes('database-password-secret'), false);
    } finally {
      Submission.findOne = originalSubmission;
      Project.findById = originalProject;
    }
  });
  await t.test('operator injection, malformed JSON, oversized bodies, and foreign origins fail', async () => {
    assert.equal((await request('/api/auth/login', 'POST', { email: { $ne: null }, password: 'password' })).status, 400);
    assert.equal((await request('/api/auth/login', 'POST', '{')).status, 400);
    assert.equal((await request('/api/auth/login', 'POST', { value: 'x'.repeat(270000) })).status, 413);
    assert.equal((await request('/api/auth/login', 'POST', {}, false, { Origin: 'https://untrusted.example' })).status, 403);
  });
  await t.test('public registration ignores privileged roles and never returns hashes', async () => {
    const originalCreate = User.create;
    const originalFindOne = User.findOne;
    t.after(() => { User.create = originalCreate; User.findOne = originalFindOne; });
    User.findOne = async () => null;
    User.create = async data => {
      assert.equal(data.role, 'student');
      return new User({ ...data, _id: id });
    };
    const response = await request('/api/auth/register', 'POST', { name: 'Student', email: 's@example.com', password: 'strong-password', role: 'coordinator' });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.user.role, 'student');
    assert.equal(JSON.stringify(body).includes('passwordHash'), false);
    assert.equal(JSON.stringify(new User({ passwordHash: 'secret' })).includes('secret'), false);
  });
  await t.test('authentication and write limits return retry guidance', async () => {
    let response;
    for (let i = 0; i < 31; i++) response = await request('/api/auth/login', 'POST', {});
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('retry-after')) > 0);
    for (let i = 0; i < 121; i++) response = await request('/api/projects', 'POST', {});
    assert.equal(response.status, 429);
  });
});

test('upload content checks reject disguised executable files and oversize buffers', async () => {
  const disguised = { originalname: 'report.pdf', mimetype: 'application/pdf', buffer: Buffer.from('MZ executable') };
  assert.equal(hasValidContent(disguised), false);
  await assert.rejects(persistFile(disguised), /File content/);
  await assert.rejects(persistFile({ ...disguised, buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }), /File content/);
  assert.equal(hasValidContent({ ...disguised, buffer: Buffer.from('%PDF-1.7\n') }), true);
});
