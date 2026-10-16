'use strict';
process.env.DATA_DIR = require('os').tmpdir() + '/creator-engine-boot-' + process.pid;
process.env.SESSION_SECRET = 'test';
process.env.OWNER_EMAIL = 'Owner@Test.Local';
process.env.OWNER_PASSWORD = 'bootpass123';
process.env.APP_URL = 'https://engine.test';
const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const { q } = require('../src/db');
const auth = require('../src/auth');
const { bootstrapProgramme, parseSpec } = require('../src/bootstrap');

test('owner is created from env, password re-synced on change, unowned stores claimed', () => {
  q.upsertStore.run({ shop: 'boot.myshopify.com', access_token: 'fake', scope: '' });
  const owner = auth.syncOwnerFromEnv(config);
  assert.equal(owner.email, 'owner@test.local');
  assert.equal(owner.role, 'owner');
  assert.ok(auth.login('owner@test.local', 'bootpass123'));
  assert.equal(q.storeByShop.get('boot.myshopify.com').user_id, owner.id);
  const again = auth.syncOwnerFromEnv({ ...config, ownerPassword: 'newpass456' });
  assert.equal(again.id, owner.id);
  assert.ok(auth.login('owner@test.local', 'newpass456'));
  assert.equal(auth.login('owner@test.local', 'bootpass123'), null);
  assert.equal(q.userCount.get().n, 1);
});

test('bootstrap builds campaign + brief attempt + open programme + test creator, and is idempotent', async () => {
  const store = q.storeByShop.get('boot.myshopify.com');
  q.upsertProduct.run({ store_id: store.id, shopify_id: 'gid://shopify/Product/9', title: 'The Japanese Omakase & Izakaya Guide', handle: 'omakase', description: '', price: '189.00', currency: 'USD', image_url: null, product_url: 'https://boot.myshopify.com/products/omakase', tags: '', raw_json: '{}' });
  const logs = [];
  const spec = parseSpec('{"name":"Guide affiliates","product":"omakase","kind":"affiliate","commission":40,"discount":10,"test_creator":"kf.test"}');
  const out = await bootstrapProgramme(spec, (m) => logs.push(m));
  assert.ok(out.webhookError, 'fake store: webhook fails but the rest continues');
  assert.match(out.joinUrl, /^https:\/\/engine\.test\/join\/[a-z0-9]{6,8}$/);
  assert.match(out.portalUrl, /^https:\/\/engine\.test\/c\//);
  const c = q.campaignsByStore.all(store.id);
  assert.equal(c.length, 1);
  assert.equal(c[0].kind, 'affiliate');
  assert.equal(c[0].creator_commission_pct, 40);
  assert.equal(c[0].is_public, 1);
  assert.equal(q.campaignCreators.all(c[0].id).length, 1);
  assert.ok(logs.some((l) => /programme open/.test(l)));
  const out2 = await bootstrapProgramme(spec, () => {});
  assert.equal(q.campaignsByStore.all(store.id).length, 1, 'second run creates nothing new');
  assert.equal(out2.joinUrl, out.joinUrl);
  assert.equal(q.campaignCreators.all(c[0].id).length, 1);
});

test('bad JSON spec is ignored', () => {
  assert.equal(parseSpec('{nope'), null);
  assert.equal(parseSpec(''), null);
});
