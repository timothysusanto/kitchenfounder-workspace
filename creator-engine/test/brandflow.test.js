'use strict';
process.env.DATA_DIR = require('os').tmpdir() + '/creator-engine-flow-' + process.pid;
process.env.SESSION_SECRET = 'test';
process.env.SHOPIFY_CLIENT_SECRET = 'whsec_test';
process.env.APP_URL = 'https://engine.test';
process.env.REPORT_DAILY_CAP = '2';
process.env.REPORT_PER_IP_DAILY = '4';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const { q, db } = require('../src/db');
const digest = require('../src/digest');
const freeReport = require('../src/report');
const attribution = require('../src/attribution');
const { startApp, setupOwner } = require('./helpers');

test('digest timing: Monday at/after the hour in the configured timezone, one key per week', () => {
  const cfg = { timezone: 'Australia/Sydney', hour: 8 };
  assert.equal(digest.isSendTime(new Date('2026-10-18T21:30:00Z'), cfg), true);  // Mon 19 Oct 08:30 Sydney
  assert.equal(digest.isSendTime(new Date('2026-10-18T20:30:00Z'), cfg), false); // Mon 07:30 Sydney
  assert.equal(digest.isSendTime(new Date('2026-10-20T00:00:00Z'), cfg), false); // Tuesday
  assert.equal(digest.weekKey(new Date('2026-10-18T21:30:00Z'), 'Australia/Sydney'), '2026-10-19');
  assert.equal(digest.weekKey(new Date('2026-10-24T05:00:00Z'), 'Australia/Sydney'), '2026-10-19'); // Saturday same week
});

test('wizard opens a programme from three answers; digest then reports it and is idempotent per week', async () => {
  const s = await startApp(app); await setupOwner(s.client);
  attribution.ensureOrderWebhook = async () => 'gid://shopify/WebhookSubscription/1';
  q.upsertStore.run({ shop: 'wiz.myshopify.com', access_token: 'fake', scope: 'read_orders' });
  const store = q.storeByShop.get('wiz.myshopify.com');
  q.setStoreOwner.run(q.userByEmail.get('owner@test.local').id, store.id);
  q.upsertProduct.run({ store_id: store.id, shopify_id: 'gid://shopify/Product/9', title: 'Coffee Beans', handle: 'beans', description: '', price: '25.00', currency: 'USD', image_url: null, product_url: 'https://wiz.myshopify.com/products/beans', tags: '', raw_json: '{}', is_subscription: 0, billing_interval: null });
  const product = q.productsByStore.all(store.id)[0];

  assert.match(await (await s.client(`/stores/${store.id}`)).text(), /Set up my programme/);
  assert.equal((await s.client(`/stores/${store.id}/setup`)).status, 200);
  const bad = await s.client(`/stores/${store.id}/setup`, { form: { product_id: product.id, discount: '10', commission: '20', commission_months: '12', commission_after: '' } });
  assert.equal(bad.status, 400);
  const ok = await s.client(`/stores/${store.id}/setup`, { form: { product_id: product.id, discount: '15', commission: '30', commission_months: '', commission_after: '' } });
  assert.equal(ok.status, 302);
  const c = q.campaignsByStore.all(store.id)[0];
  assert.equal(c.is_public, 1); assert.equal(c.customer_discount_pct, 15); assert.equal(c.creator_commission_pct, 30); assert.ok(c.public_slug);
  assert.equal(q.storeById.get(store.id).id, store.id);
  assert.doesNotMatch(await (await s.client(`/stores/${store.id}`)).text(), /Set up my programme/);

  const owner = q.userByEmail.get('owner@test.local');
  const sent = [];
  const now = new Date('2026-10-18T22:00:00Z');
  const first = await digest.sendFor(owner, { now, send: async (to, d) => { sent.push(to); return 'email'; } });
  assert.equal(first.via, 'email'); assert.match(first.text, /wiz\.myshopify\.com|Coffee|orders/i);
  assert.equal(await digest.sendFor(owner, { now, send: async () => 'email' }), null); // same week: no duplicate
  assert.deepEqual(sent, ['owner@test.local']);
  assert.match(await (await s.client('/digest')).text(), /Weekly digest/);
  s.server.close();
});

test('digest says what to do next and lists who to pay', () => {
  const data = { stores: [{ name: 'Brand', shop: 'b.myshopify.com', orders: 3, revenue: 120, top: [{ handle: 'ana', orders: 3, revenue: 120 }], newCreators: 1, owed: 24, payouts: [{ handle: 'ana', owed: 24, email: 'ana@x.com' }], chase: [], totalCreators: 2, attributedOrders: 3, attributedRevenue: 120, programmeOpen: true }] };
  const d = digest.render({ email: 'a@b.c' }, data);
  assert.match(d.subject, /3 creator orders, \$120\.00/);
  assert.match(d.text, /Pay @ana: \$24\.00 → ana@x\.com/);
  assert.match(d.text, /Next: Pay 1 creator \(\$24\.00 owed\)/);
});

test('free report: validation, caching, per-IP and daily caps, and a public result page', async () => {
  const s = await startApp(app);
  let calls = 0;
  freeReport.setDiscover(async () => { calls++; return [
    { platform: 'tiktok', handle: 'ana', profile_url: 'https://www.tiktok.com/@ana', followers: 8000, posts_in_sample: 4, median_plays: 20000, engagement_pct: 6.5, tier: 'nano', shop_tagged_posts: 0, sponsored_posts: 0, bio: '', bio_link: '', example_url: '', last_post: new Date().toISOString().slice(0, 10), source_hashtags: 'x' },
    { platform: 'tiktok', handle: 'bo', profile_url: 'https://www.tiktok.com/@bo', followers: 40000, posts_in_sample: 3, median_plays: 30000, engagement_pct: 4.1, tier: 'micro', shop_tagged_posts: 0, sponsored_posts: 0, bio: '', bio_link: '', example_url: '', last_post: new Date().toISOString().slice(0, 10), source_hashtags: 'x' },
  ]; });
  const form = (o) => s.client('/report', { form: { email: 'lead@x.com', market: 'AU', niche: '', custom: 'coffeetok, homebarista', ...o } });

  assert.equal((await form({ email: 'nope' })).status, 400);
  assert.equal((await form({ custom: '', niche: 'nothing' })).status, 400);

  const r1 = await form({}); assert.equal(r1.status, 303);
  await new Promise((r) => setTimeout(r, 50));
  const page = await s.client(r1.headers.get('location'));
  const html = await page.text();
  assert.equal(page.status, 200); assert.match(html, /@ana/); assert.match(html, /creators found/);
  assert.equal(calls, 1);

  const r2 = await form({ email: 'other@x.com' }); assert.equal(r2.status, 303); // same tags: served from cache
  assert.equal(calls, 1);

  const r3 = await form({ custom: 'tea, matcha' }); assert.equal(r3.status, 303); // second live run (cap is 2)
  await new Promise((r) => setTimeout(r, 50));
  const r4 = await form({ custom: 'tea, matcha', email: 'c@x.com' }); assert.equal(r4.status, 303); // cached again (fourth report from this IP)
  assert.equal(calls, 2);
  const r5 = await form({ custom: 'bread, bakery' }); // fifth request from one IP: over the per-IP limit
  assert.equal(r5.status, 400); assert.match(await r5.text(), /maximum reports/);
  // a different IP asking for something new: third live run today is over the daily cap of 2
  assert.throws(() => freeReport.start({ email: 'd@x.com', market: 'AU', custom: 'bread, bakery', ip: '9.9.9.9' }), /capacity/);

  assert.equal((await s.client('/leads')).status, 302); // not logged in => login
  const sum = freeReport.summarise(JSON.parse(q.reportByToken.get(r1.headers.get('location').split('/').pop()).result_json));
  assert.equal(sum.smallOnes, 2); assert.equal(sum.combinedMedianReach, 50000); assert.equal(sum.testCost, 900);
  s.server.close();
});
