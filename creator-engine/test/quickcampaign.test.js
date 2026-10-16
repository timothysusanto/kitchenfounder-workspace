'use strict';
process.env.DATA_DIR = require('os').tmpdir() + '/creator-engine-quick-' + process.pid;
process.env.SESSION_SECRET = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const { q } = require('../src/db');
const { startApp, setupOwner } = require('./helpers');

let server, client;
test.before(async () => {
  ({ server, client } = await startApp(app));
  await setupOwner(client);
  q.upsertStore.run({ shop: 'quick.myshopify.com', access_token: 'x', scope: '' });
  const store = q.storeByShop.get('quick.myshopify.com');
  q.setStoreOwner.run(q.userByEmail.get('owner@test.local').id, store.id);
  for (const h of ['chef.one', 'chef.two']) q.upsertCreator.run({
    store_id: store.id, platform: 'tiktok', handle: h, profile_url: `https://tiktok.com/@${h}`, followers: 5000, posts_in_sample: 3, median_plays: 2000,
    engagement_pct: 6, tier: 'nano', shop_tagged_posts: 0, sponsored_posts: 0, bio: '', bio_link: '', example_url: '', last_post: null, source_hashtags: 'test', score: 70, score_notes: '',
  });
});
test.after(() => server.close());

test('creators page offers to create a campaign inline when none exist', async () => {
  const html = await (await client('/stores/1/creators')).text();
  assert.match(html, /New campaign name/);
  assert.doesNotMatch(html, /create a campaign first/);
});

test('add-creators with no campaign_id creates the campaign and adds ticked creators', async () => {
  const ids = q.creatorsByStore.all(1).map((c) => String(c.id));
  const form = new URLSearchParams({ name: 'Nov seeding', kind: 'gifted', customer_discount_pct: '15', sample_cost: '25' });
  for (const id of ids) form.append('creator_ids', id);
  const r = await client('/stores/1/campaigns/add-creators', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form.toString() });
  assert.equal(r.status, 302);
  const m = r.headers.get('location').match(/\/campaigns\/(\d+)/);
  assert.ok(m, 'redirects to the new campaign');
  const c = q.campaignById.get(Number(m[1]));
  assert.equal(c.name, 'Nov seeding');
  assert.equal(c.customer_discount_pct, 15);
  assert.equal(q.campaignCreators.all(c.id).length, 2);
});

test('add-creators with an existing campaign_id adds to it', async () => {
  const c = q.campaignsByStore.all(1)[0];
  const r = await client('/stores/1/campaigns/add-creators', { form: { campaign_id: String(c.id), creator_ids: String(q.creatorsByStore.all(1)[0].id) } });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), new RegExp(`/campaigns/${c.id}$`));
  assert.equal(q.campaignsByStore.all(1).length, 1, 'no extra campaign created');
});

test('add-creators with nothing ticked bounces back with an error', async () => {
  const r = await client('/stores/1/campaigns/add-creators', { form: { name: 'x' } });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /\/stores\/1\/creators$/);
});
