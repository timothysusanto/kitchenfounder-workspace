'use strict';
process.env.DATA_DIR = require('os').tmpdir() + '/creator-engine-bill-' + process.pid;
process.env.SESSION_SECRET = 'test';
process.env.SHOPIFY_CLIENT_SECRET = 'whsec_test';
process.env.APP_URL = 'https://engine.test';
process.env.STRIPE_SECRET_KEY = 'sk_test_x';
process.env.STRIPE_PRICE_ID = 'price_x';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_stripe';
process.env.TRIAL_DAYS = '14';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const app = require('../src/server');
const { q } = require('../src/db');
const billing = require('../src/billing');
const { startApp, setupOwner } = require('./helpers');

const sign = (body, secret = 'whsec_stripe', t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

test('stripe signature: valid, wrong secret, stale, missing', () => {
  const body = Buffer.from('{"a":1}');
  assert.equal(billing.verifyStripeSignature(body, sign(body.toString()), 'whsec_stripe'), true);
  assert.equal(billing.verifyStripeSignature(body, sign(body.toString(), 'other'), 'whsec_stripe'), false);
  assert.equal(billing.verifyStripeSignature(body, sign(body.toString(), 'whsec_stripe', 1000), 'whsec_stripe'), false);
  assert.equal(billing.verifyStripeSignature(body, '', 'whsec_stripe'), false);
});

test('access: owner exempt, trial by account age, expired after, active when paid', () => {
  const now = Date.parse('2026-11-30T00:00:00Z');
  assert.equal(billing.accessFor({ role: 'owner' }, now).state, 'exempt');
  assert.equal(billing.accessFor({ role: 'brand', created_at: '2026-11-25 00:00:00', billing_status: 'none' }, now).state, 'trial');
  assert.equal(billing.accessFor({ role: 'brand', created_at: '2026-11-25 00:00:00', billing_status: 'none' }, now).daysLeft, 9);
  const old = billing.accessFor({ role: 'brand', created_at: '2026-10-01 00:00:00', billing_status: 'none' }, now);
  assert.equal(old.state, 'expired'); assert.equal(old.allowed, false);
  assert.equal(billing.accessFor({ role: 'brand', created_at: '2026-10-01 00:00:00', billing_status: 'active' }, now).allowed, true);
  assert.equal(billing.accessFor({ role: 'brand', created_at: '2026-10-01 00:00:00', billing_status: 'past_due' }, now).state, 'past_due');
});

test('performance fee is a percentage of attributed revenue', () => {
  assert.equal(billing.performanceFee(1234.5, 10), 123.45);
  assert.equal(billing.performanceFee(0), 0);
});

test('expired brand is blocked from POST actions until a verified Stripe webhook activates it', async () => {
  const owner = await startApp(app); await setupOwner(owner.client);
  const brand = await startApp(app);
  assert.equal((await brand.client('/signup', { form: { brand_name: 'Old Brand', email: 'old@test.local', password: 'password123' } })).status, 302);
  const u = q.userByEmail.get('old@test.local');
  require('../src/db').db.prepare("UPDATE users SET created_at = datetime('now','-30 days') WHERE id = ?").run(u.id);

  const blocked = await brand.client('/stores/999/sync-orders', { method: 'POST', form: {} });
  assert.equal(blocked.status, 302); assert.equal(blocked.headers.get('location'), '/billing');
  const page = await brand.client('/billing');
  assert.equal(page.status, 200); assert.match(await page.text(), /Trial ended/);

  const bad = await fetch(`${brand.base}/webhooks/stripe`, { method: 'POST', body: '{}', headers: { 'Stripe-Signature': 't=1,v1=00' } });
  assert.equal(bad.status, 400);
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { client_reference_id: String(u.id), customer: 'cus_1', subscription: 'sub_1' } } });
  const ok = await fetch(`${brand.base}/webhooks/stripe`, { method: 'POST', body, headers: { 'Stripe-Signature': sign(body) } });
  assert.equal(ok.status, 200);
  assert.equal(q.userById.get(u.id).billing_status, 'active');
  const after = await brand.client('/stores/999/sync-orders', { method: 'POST', form: {} });
  assert.notEqual(after.headers.get('location'), '/billing');

  const cancel = JSON.stringify({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', customer: 'cus_1' } } });
  await fetch(`${brand.base}/webhooks/stripe`, { method: 'POST', body: cancel, headers: { 'Stripe-Signature': sign(cancel) } });
  assert.equal(q.userById.get(u.id).billing_status, 'canceled');
  owner.server.close(); brand.server.close();
});

test('shopify compliance webhooks: bad hmac rejected; shop/redact deletes the store; customers/redact clears ids', async () => {
  const s = await startApp(app);
  q.upsertStore.run({ shop: 'gone.myshopify.com', access_token: 'x', scope: '' });
  const store = q.storeByShop.get('gone.myshopify.com');
  q.upsertAttributedOrder.run({ store_id: store.id, shopify_order_id: 'o1', order_name: '#1', created_at: '2026-10-01', total: 10, currency: 'USD', discount_codes: '', utm_source: null, utm_campaign: null, utm_content: null, campaign_creator_id: null, match_method: null, customer_id: 'gid://shopify/Customer/55' });
  const post = (topic, payload, secret = 'whsec_test') => {
    const body = JSON.stringify(payload);
    return fetch(`${s.base}/webhooks/shopify/compliance`, { method: 'POST', body, headers: { 'X-Shopify-Topic': topic, 'X-Shopify-Hmac-Sha256': crypto.createHmac('sha256', secret).update(body).digest('base64') } });
  };
  assert.equal((await post('shop/redact', { shop_domain: 'gone.myshopify.com' }, 'wrong')).status, 401);
  assert.equal((await post('customers/redact', { shop_domain: 'gone.myshopify.com', customer: { id: 55 } })).status, 200);
  assert.equal(require('../src/db').db.prepare('SELECT customer_id FROM attributed_orders WHERE store_id = ?').get(store.id).customer_id, null);
  assert.equal((await post('customers/data_request', { shop_domain: 'gone.myshopify.com' })).status, 200);
  assert.equal((await post('shop/redact', { shop_domain: 'gone.myshopify.com' })).status, 200);
  assert.equal(q.storeByShop.get('gone.myshopify.com'), undefined);
  s.server.close();
});

test('privacy and terms are public', async () => {
  const s = await startApp(app);
  for (const p of ['/privacy', '/terms']) { const r = await s.client(p); assert.equal(r.status, 200); }
  s.server.close();
});
