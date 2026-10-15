'use strict';
process.env.DATA_DIR = require('os').tmpdir() + '/creator-engine-envstore-' + process.pid;
process.env.SESSION_SECRET = 'test';
process.env.SHOPIFY_SHOP = 'Example-Store.myshopify.com';
process.env.SHOPIFY_ACCESS_TOKEN = 'shpat_testtoken';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const { q } = require('../src/db');

test('SHOPIFY_SHOP + SHOPIFY_ACCESS_TOKEN connect the store on boot without OAuth', async () => {
  const store = await app.connectStoreFromEnv(); // product sync fails offline; store must still be saved
  assert.ok(store);
  assert.equal(store.shop, 'example-store.myshopify.com');
  assert.equal(store.access_token, 'shpat_testtoken');
  assert.equal(q.stores.all().length, 1);
  const again = await app.connectStoreFromEnv();
  assert.equal(again.id, store.id);
  assert.equal(q.stores.all().length, 1, 'idempotent');
});
