'use strict';
process.env.DATA_DIR = require('os').tmpdir() + '/video-engine-test-' + process.pid;
process.env.SESSION_SECRET = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const { startApp, setupOwner } = require('./helpers');

let server, base, client;
test.before(async () => { ({ server, base, client } = await startApp(app)); });
test.after(() => server.close());

test('health endpoint needs no login', async () => {
  const r = await fetch(`${base}/healthz`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});

test('with no accounts, pages redirect to /setup', async () => {
  const r = await client('/');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/setup');
});

test('setup creates the owner and logs in; dashboard renders with no stores', async () => {
  await setupOwner(client);
  const html = await (await client('/')).text();
  assert.match(html, /Connect a Shopify store/);
  assert.match(html, /No stores yet/);
  assert.match(html, /owner@test.local/);
});

test('setup is one-time', async () => {
  const r = await client('/setup');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/login');
});

test('review queue renders empty for the owner', async () => {
  const html = await (await client('/review')).text();
  assert.match(html, /Nothing waiting/);
});

test('invalid shop is rejected', async () => {
  const r = await client('/auth/shopify?shop=evil.com');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/');
});

test('settings page shows missing keys', async () => {
  const html = await (await client('/settings')).text();
  assert.match(html, /ANTHROPIC_API_KEY/);
});

test('logout ends the session and the next visit needs login', async () => {
  const r = await client('/logout', { form: {} });
  assert.equal(r.headers.get('location'), '/login');
  const r2 = await client('/settings');
  assert.equal(r2.status, 302);
  assert.match(r2.headers.get('location'), /^\/login\?next=%2Fsettings/);
});

test('wrong password is refused; right password logs in', async () => {
  const bad = await client('/login', { form: { email: 'owner@test.local', password: 'nope-nope' } });
  assert.equal(bad.status, 401);
  const ok = await client('/login?next=%2Freview', { form: { email: 'owner@test.local', password: 'password123' } });
  assert.equal(ok.status, 302);
  assert.equal(ok.headers.get('location'), '/review');
});
