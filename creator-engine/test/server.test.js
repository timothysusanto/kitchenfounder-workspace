'use strict';
process.env.DATA_DIR = require('os').tmpdir() + '/video-engine-test-' + process.pid;
process.env.SESSION_SECRET = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');

let server, base;
test.before(async () => {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('health endpoint', async () => {
  const r = await fetch(`${base}/healthz`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test('dashboard renders with no stores', async () => {
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /Connect a Shopify store/);
  assert.match(html, /No stores yet/);
});

test('review queue renders empty', async () => {
  const html = await (await fetch(`${base}/review`)).text();
  assert.match(html, /Nothing waiting/);
});

test('invalid shop is rejected', async () => {
  const r = await fetch(`${base}/auth/shopify?shop=evil.com`, { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/');
});

test('settings page shows missing keys', async () => {
  const html = await (await fetch(`${base}/settings`)).text();
  assert.match(html, /ANTHROPIC_API_KEY/);
});
