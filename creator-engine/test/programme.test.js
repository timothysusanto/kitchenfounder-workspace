'use strict';
process.env.DATA_DIR = require('os').tmpdir() + '/creator-engine-prog-' + process.pid;
process.env.SESSION_SECRET = 'test';
process.env.SHOPIFY_CLIENT_SECRET = 'whsec_test';
process.env.APP_URL = 'https://engine.test';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const app = require('../src/server');
const { q } = require('../src/db');
const attribution = require('../src/attribution');
const loop = require('../src/loop');
const { startApp, setupOwner } = require('./helpers');

let server, base, client, brand, storeId, campaignId, slug;
test.before(async () => {
  ({ server, base, client } = await startApp(app));
  await setupOwner(client);
  // a brand customer with its own store, and a product so the programme page has a price
  brand = (await startApp(app)); // second cookie jar
  const r = await brand.client('/signup', { form: { brand_name: 'Chilli Co', email: 'brand@test.local', password: 'password123' } });
  assert.equal(r.status, 302);
  const brandUser = q.userByEmail.get('brand@test.local');
  q.upsertStore.run({ shop: 'owner-only.myshopify.com', access_token: 'fake', scope: '' });
  q.setStoreOwner.run(q.userByEmail.get('owner@test.local').id, q.storeByShop.get('owner-only.myshopify.com').id);
  q.upsertStore.run({ shop: 'chilli.myshopify.com', access_token: 'fake', scope: 'read_orders' });
  storeId = q.storeByShop.get('chilli.myshopify.com').id;
  q.setStoreOwner.run(brandUser.id, storeId);
  q.upsertProduct.run({ store_id: storeId, shopify_id: 'gid://shopify/Product/1', title: 'Restaurant Ops Guide', handle: 'ops-guide', description: '', price: '189.00', currency: 'USD', image_url: null, product_url: 'https://chilli.myshopify.com/products/ops-guide', tags: '', raw_json: '{}', is_subscription: 0, billing_interval: null });
  const product = q.productsByStore.all(storeId)[0];
  const c = loop.createCampaign(storeId, { name: 'Ops guide affiliates', product_id: product.id, kind: 'affiliate', customer_discount_pct: 10, creator_commission_pct: 40 });
  campaignId = c.id;
});
test.after(() => { server.close(); brand.server.close(); });

test('a brand cannot see another account\'s store; the owner can', async () => {
  const r = await brand.client('/stores/1');
  assert.equal(r.status, 404);
  const r2 = await client(`/stores/${storeId}`);
  assert.equal(r2.status, 200);
  const r3 = await brand.client(`/stores/${storeId}`);
  assert.equal(r3.status, 200);
});

test('closed programme page is 404; opening it gives a public link', async () => {
  const before = await fetch(`${base}/join/nothing`);
  assert.equal(before.status, 404);
  const r = await brand.client(`/campaigns/${campaignId}/publish`, { form: { is_public: '1', terms: 'Paid monthly by PayPal.' } });
  assert.equal(r.status, 302);
  const c = q.campaignById.get(campaignId);
  assert.equal(c.is_public, 1);
  assert.match(c.public_slug, /^[a-z0-9]{6,8}$/);
  slug = c.public_slug;
  const page = await (await fetch(`${base}/join/${slug}`)).text();
  assert.match(page, /Chilli Co creator programme|chilli creator programme/i);
  assert.match(page, /40% commission/);
  assert.match(page, /USD 75\.60 per sale/); // 189 × 40%
  assert.match(page, /Paid monthly by PayPal/);
});

test('a creator applies and lands on their portal with a tracked link (code pending because Shopify is fake)', async () => {
  const r = await fetch(`${base}/join/${slug}`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ display_name: 'Sam Cook', platform: 'tiktok', handle: '@Sam.Cooks', email: 'sam@test.local', agree: 'on' }) });
  assert.equal(r.status, 302);
  const loc = r.headers.get('location');
  assert.match(loc, /^\/c\/[A-Za-z0-9_-]{20,}$/);
  const portal = await (await fetch(`${base}${loc}`)).text();
  assert.match(portal, /Hi Sam Cook/);
  assert.match(portal, /utm_source=creator/);
  assert.match(portal, /utm_content=sam\.cooks/);
  assert.match(portal, /Code is being created/);
  const creator = q.creatorByHandle.get(storeId, 'tiktok', 'sam.cooks');
  assert.equal(creator.source, 'applied');
  assert.equal(creator.payout_email, 'sam@test.local');
});

test('applying twice with the same handle reuses the same portal', async () => {
  const r = await fetch(`${base}/join/${slug}`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ display_name: 'Sam', platform: 'tiktok', handle: 'sam.cooks', email: 'sam@test.local', agree: 'on' }) });
  const cc = q.campaignCreatorByPair.get(campaignId, q.creatorByHandle.get(storeId, 'tiktok', 'sam.cooks').id);
  assert.equal(r.headers.get('location'), `/c/${cc.portal_token}`);
  assert.equal(q.campaignCreators.all(campaignId).length, 1);
});

test('bad applications are rejected with the form re-shown', async () => {
  const r = await fetch(`${base}/join/${slug}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ display_name: 'X', platform: 'tiktok', handle: 'has space', email: 'sam@test.local', agree: 'on' }) });
  assert.equal(r.status, 400);
  assert.match(await r.text(), /without spaces/);
});

function signed(body) { return crypto.createHmac('sha256', 'whsec_test').update(body).digest('base64'); }

test('orders/create webhook: bad HMAC is refused', async () => {
  const body = JSON.stringify({ id: 1 });
  const r = await fetch(`${base}/webhooks/shopify/orders`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Hmac-Sha256': 'nope', 'X-Shopify-Shop-Domain': 'chilli.myshopify.com' }, body });
  assert.equal(r.status, 401);
});

test('orders/create webhook attributes by UTM landing site, then a second order by code', async () => {
  const cc = q.campaignCreators.all(campaignId)[0];
  // simulate the code having been issued
  q.setCampaignCreatorCode.run('SAMCOOKS-OPSGUI', 'gid://shopify/DiscountCodeNode/1', cc.utm_link, cc.id);
  const o1 = JSON.stringify({ id: 1001, admin_graphql_api_id: 'gid://shopify/Order/1001', name: '#1001', created_at: '2026-10-16T01:00:00Z', current_total_price: '189.00', currency: 'USD', discount_codes: [],
    landing_site: '/products/ops-guide?utm_source=creator&utm_medium=affiliate&utm_campaign=ops-guide-affiliates&utm_content=sam.cooks' });
  let r = await fetch(`${base}/webhooks/shopify/orders`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Hmac-Sha256': signed(o1), 'X-Shopify-Shop-Domain': 'chilli.myshopify.com' }, body: o1 });
  assert.equal(r.status, 200);
  const o2 = JSON.stringify({ id: 1002, name: '#1002', created_at: '2026-10-16T02:00:00Z', current_total_price: '170.10', currency: 'USD', discount_codes: [{ code: 'samcooks-opsgui', amount: '18.90', type: 'percentage' }], landing_site: '/' });
  r = await fetch(`${base}/webhooks/shopify/orders`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Hmac-Sha256': signed(o2), 'X-Shopify-Shop-Domain': 'chilli.myshopify.com' }, body: o2 });
  assert.equal(r.status, 200);
  const rows = q.campaignCreators.all(campaignId);
  assert.equal(rows[0].orders, 2);
  assert.equal(Number(rows[0].revenue).toFixed(2), '359.10');
  const portal = await (await fetch(`${base}/c/${rows[0].portal_token}`)).text();
  assert.match(portal, /#1001/);
  assert.match(portal, /USD 143\.64<\/b> earned at 40%/); // 359.10 × 40%
});

test('report shows commission owed and the brand can mark it paid', async () => {
  let rep = loop.report(storeId);
  assert.equal(rep.commission.toFixed(2), '143.64');
  assert.equal(rep.commissionOwed.toFixed(2), '143.64');
  assert.equal(rep.blendedRoas.toFixed(2), '2.50'); // 359.10 / 143.64
  const cc = q.campaignCreators.all(campaignId)[0];
  const r = await brand.client(`/campaign-creators/${cc.id}`, { form: { status: 'posted', fee_paid: '0', usage_rights_fee: '0', post_url: '', ad_platform: '', ad_auth_code: '', ad_spend: '0', notes: '', commission_paid: '100' } });
  assert.equal(r.status, 302);
  rep = loop.report(storeId);
  assert.equal(rep.commissionOwed.toFixed(2), '43.64');
  const csv = loop.reportCsv(storeId);
  assert.match(csv, /sam\.cooks/);
  assert.match(csv, /"43\.64"/);
  assert.match(csv, /sam@test\.local/);
});

test('orderFromWebhook is pure and handles missing fields', () => {
  const o = attribution.orderFromWebhook({ id: 5, name: '#5', created_at: 'x', total_price: '10.00', currency: 'AUD' });
  assert.equal(o.id, 'gid://shopify/Order/5');
  assert.deepEqual(o.discountCodes, []);
  assert.equal(o.customerJourneySummary, null);
  assert.equal(o.currentTotalPriceSet.shopMoney.amount, '10.00');
});

test('membership renewals with no code or UTM are attributed to the creator who brought the customer (lifetime attribution)', async () => {
  const cc = q.campaignCreators.all(campaignId)[0];
  const before = cc.orders;
  const first = JSON.stringify({ id: 2001, name: '#2001', created_at: '2026-10-16T03:00:00Z', current_total_price: '8.99', currency: 'USD',
    discount_codes: [{ code: 'SAMCOOKS-OPSGUI' }], landing_site: '/', customer: { id: 777, admin_graphql_api_id: 'gid://shopify/Customer/777' } });
  let r = await fetch(`${base}/webhooks/shopify/orders`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Hmac-Sha256': signed(first), 'X-Shopify-Shop-Domain': 'chilli.myshopify.com' }, body: first });
  assert.equal(r.status, 200);
  const renewal = JSON.stringify({ id: 2002, name: '#2002', created_at: '2026-11-16T03:00:00Z', current_total_price: '9.99', currency: 'USD', discount_codes: [], landing_site: null, customer: { id: 777 } });
  r = await fetch(`${base}/webhooks/shopify/orders`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Hmac-Sha256': signed(renewal), 'X-Shopify-Shop-Domain': 'chilli.myshopify.com' }, body: renewal });
  assert.equal(r.status, 200);
  const stranger = JSON.stringify({ id: 2003, name: '#2003', created_at: '2026-11-16T04:00:00Z', current_total_price: '9.99', currency: 'USD', discount_codes: [], landing_site: null, customer: { id: 888 } });
  r = await fetch(`${base}/webhooks/shopify/orders`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Shopify-Hmac-Sha256': signed(stranger), 'X-Shopify-Shop-Domain': 'chilli.myshopify.com' }, body: stranger });
  const after = q.campaignCreators.all(campaignId)[0];
  assert.equal(after.orders, before + 2, 'first order + renewal, not the stranger');
  const orders = q.portalOrders.all(cc.id);
  assert.equal(orders.find((o) => o.order_name === '#2002').match_method, 'customer');
  const portal = await (await fetch(`${base}/c/${cc.portal_token}`)).text();
  assert.match(portal, /renewal \/ repeat/);
});

test('discount codes for subscription products are created with appliesOnSubscription', async () => {
  const calls = [];
  const shopify = require('../src/shopify');
  const orig = shopify.graphql;
  shopify.graphql = async (shop, token, query, vars) => { calls.push(vars); return { discountCodeBasicCreate: { codeDiscountNode: { id: 'gid://x' }, userErrors: [] } }; };
  try {
    await attribution.createDiscountCode({ shop: 'x.myshopify.com', access_token: 't' }, { code: 'A', title: 'A', percentage: 10, subscription: true });
    await attribution.createDiscountCode({ shop: 'x.myshopify.com', access_token: 't' }, { code: 'B', title: 'B', percentage: 10 });
  } finally { shopify.graphql = orig; }
  assert.equal(calls[0].basicCodeDiscount.customerGets.appliesOnSubscription, true);
  assert.equal(calls[0].basicCodeDiscount.recurringCycleLimit, 1);
  assert.equal(calls[1].basicCodeDiscount.customerGets.appliesOnSubscription, false);
  assert.equal(calls[1].basicCodeDiscount.recurringCycleLimit, undefined);
});
