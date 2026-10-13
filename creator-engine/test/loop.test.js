'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { collapseTikTok, scoreCreator, tierFor } = require('../src/discovery');
const { checkBrief, parseBrief } = require('../src/briefs');
const { codeFor, utmLink, matchOrder, creatorEconomics } = require('../src/attribution');

test('tiers', () => {
  assert.equal(tierFor(900), 'nano'); assert.equal(tierFor(50000), 'micro'); assert.equal(tierFor(200000), 'mid'); assert.equal(tierFor(2e6), 'macro');
});

test('collapse flattened TikTok items into creators with engagement', () => {
  const items = [
    { 'authorMeta.name': 'a', 'authorMeta.fans': 5000, playCount: 10000, diggCount: 800, commentCount: 100, shareCount: 100, createTimeISO: '2026-10-01T00:00:00Z', hasTikTokShopProduct: true },
    { 'authorMeta.name': 'a', 'authorMeta.fans': 5000, playCount: 20000, diggCount: 1000, commentCount: 0, shareCount: 0, createTimeISO: '2026-09-01T00:00:00Z' },
    { 'authorMeta.name': 'b', 'authorMeta.fans': 800000, playCount: 1000000, diggCount: 5000, commentCount: 0, shareCount: 0, createTimeISO: '2026-05-01T00:00:00Z' },
  ];
  const rows = collapseTikTok(items, ['x']);
  const a = rows.find((r) => r.handle === 'a');
  assert.equal(a.posts_in_sample, 2);
  assert.equal(a.median_plays, 15000);
  assert.equal(a.engagement_pct, 7.5); // median of 10% and 5%
  assert.equal(a.shop_tagged_posts, 1);
  assert.equal(a.last_post, '2026-10-01');
  assert.equal(a.tier, 'nano');
});

test('scoring rewards engaged micro creators and penalises finds accounts', () => {
  const good = { engagement_pct: 8, median_plays: 50000, followers: 30000, tier: 'micro', last_post: new Date().toISOString().slice(0, 10), shop_tagged_posts: 0, posts_in_sample: 3, platform: 'tiktok' };
  const finds = { engagement_pct: 0.8, median_plays: 500000, followers: 4000, tier: 'nano', last_post: new Date().toISOString().slice(0, 10), shop_tagged_posts: 3, posts_in_sample: 3, platform: 'tiktok' };
  const g = scoreCreator(good, 'AU'), f = scoreCreator(finds, 'AU');
  assert.ok(g.score > f.score, `${g.score} > ${f.score}`);
  assert.ok(f.notes.some((n) => /aggregator/.test(n)));
  // in the US, proof of TikTok Shop sales adds points
  assert.ok(scoreCreator(finds, 'US').score > f.score);
});

test('brief compliance: good brief passes', () => {
  const brief = '## Disclosure (required)\nSay "ad" in the first 3 seconds and put #ad at the start of the caption. Share your honest experience in your own words.';
  const r = checkBrief(brief, '#ad Tried the chilli oil, code {code} gets you 10% off {link}', 'AU');
  assert.equal(r.status, 'pass', r.notes.join('; '));
});

test('brief compliance: coercion or missing disclosure fails', () => {
  assert.equal(checkBrief('Share your honest experience. Say ad up front.', 'Loved it {code} {link}', 'AU').status, 'fail');
  assert.equal(checkBrief('Say ad up front. Share your honest experience. Only post if you love it.', '#ad {code} {link}', 'US').status, 'fail');
  assert.equal(checkBrief('Say ad up front. Share your honest experience. It is clinically proven.', '#ad {code} {link}', 'US').status, 'review');
});

test('parseBrief tolerates fences', () => {
  const o = parseBrief('```json\n{"brief":"B","caption_template":"#ad {code}"}\n```');
  assert.equal(o.brief, 'B');
});

test('codes and utm links', () => {
  assert.equal(codeFor('chels_eatravel', 'Nov Chilli'), 'CHELSEATRAVE-NOVCHI');
  const u = new URL(utmLink('https://shop.example.com/products/oil', 'Nov Chilli', 'Chels_EatRavel'));
  assert.equal(u.searchParams.get('utm_source'), 'creator');
  assert.equal(u.searchParams.get('utm_campaign'), 'nov-chilli');
  assert.equal(u.searchParams.get('utm_content'), 'chels_eatravel');
});

test('order matching: code beats utm, utm fallback works', () => {
  const trackers = [{ id: 1, handle: 'alice', discount_code: 'ALICE-NOV' }, { id: 2, handle: 'bob', discount_code: 'BOB-NOV' }];
  assert.deepEqual(matchOrder({ discountCodes: ['bob-nov'] }, trackers), { id: 2, method: 'code' });
  assert.deepEqual(matchOrder({ discountCodes: [], customerJourneySummary: { lastVisit: { utmParameters: { source: 'creator', content: 'ALICE' } } } }, trackers), { id: 1, method: 'utm' });
  assert.equal(matchOrder({ discountCodes: ['WELCOME10'], customerJourneySummary: { lastVisit: { utmParameters: { source: 'google' } } } }, trackers), null);
});

test('creator economics', () => {
  const e = creatorEconomics({ fee_paid: 100, usage_rights_fee: 50, ad_spend: 250, sample_cost: 30, orders: 10, revenue: 1200 });
  assert.equal(e.spend, 430);
  assert.equal(e.cac, 43);
  assert.ok(Math.abs(e.roas - 2.79) < 0.01);
  assert.equal(creatorEconomics({ orders: 0, revenue: 0 }).cac, null);
});
