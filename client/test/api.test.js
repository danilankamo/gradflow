import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { request } from '../src/api.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('validation arrays become readable messages and retain HTTP status', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: ['Title is required.', 'Choose a department.'] }), { status: 400 });
  await assert.rejects(request('/test'), error => error.status === 400 && error.message === 'Title is required. Choose a department.');
});
test('offline, timeout and invalid server responses have actionable feedback', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(request('/test'), /Check your connection/);
  globalThis.fetch = async () => { throw new DOMException('aborted', 'AbortError'); };
  await assert.rejects(request('/test'), /timed out/);
  globalThis.fetch = async () => new Response('<html>unavailable</html>', { status: 502 });
  await assert.rejects(request('/test'), /Please try again/);
});
test('requests preserve authentication headers and multipart bodies without forcing JSON', async () => {
  const body = new FormData(); body.append('description', 'Deliverable');
  globalThis.fetch = async (url, options) => {
    assert.equal(options.body, body);
    assert.equal(options.credentials, 'include');
    assert.equal(options.headers.Authorization, 'Bearer test');
    assert.ok(options.signal);
    return new Response(JSON.stringify({ success: true }));
  };
  assert.deepEqual(await request('/test', { method: 'POST', body, headers: { Authorization: 'Bearer test' } }), { success: true });
});
