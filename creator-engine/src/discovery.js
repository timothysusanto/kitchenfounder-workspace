'use strict';
/**
 * Creator discovery: run Apify hashtag scrapers, collapse posts into creators, score them.
 * Scoring is a pure function so it can be tested and tuned without touching the network.
 */
const config = require('./config');

const APIFY_BASE = 'https://api.apify.com/v2';

async function runActorSync(actorId, input, { limit = 500, timeoutSec = 280 } = {}) {
  if (!config.apify.token) throw new Error('APIFY_TOKEN is not set');
  const url = `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${encodeURIComponent(config.apify.token)}&clean=true&format=json&limit=${limit}&timeout=${timeoutSec}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error(`Apify ${actorId} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const median = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const get = (o, path) => {
  if (!o) return undefined;
  if (o[path] !== undefined) return o[path]; // flattened key, e.g. "authorMeta.name"
  return path.split('.').reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), o);
};

function tierFor(followers) {
  if (followers < 10000) return 'nano';
  if (followers < 100000) return 'micro';
  if (followers < 500000) return 'mid';
  return 'macro';
}

/** TikTok hashtag-scraper items -> per-creator rows. Accepts flattened ("authorMeta.name") or nested items. */
function collapseTikTok(items, hashtags) {
  const by = new Map();
  for (const it of items) {
    const name = get(it, 'authorMeta.name'); if (!name) continue;
    const plays = Number(get(it, 'playCount') || 0);
    const eng = Number(get(it, 'diggCount') || 0) + Number(get(it, 'commentCount') || 0) + Number(get(it, 'shareCount') || 0);
    const r = by.get(name) || { handle: name, platform: 'tiktok', profile_url: `https://www.tiktok.com/@${name}`, followers: Number(get(it, 'authorMeta.fans') || 0), bio: String(get(it, 'authorMeta.signature') || '').replace(/\s+/g, ' ').slice(0, 160), bio_link: get(it, 'authorMeta.bioLink') || '', example_url: get(it, 'webVideoUrl') || '', plays: [], ers: [], shop: 0, sponsored: 0, last: '' };
    r.plays.push(plays); r.ers.push(plays ? eng / plays : 0);
    if (get(it, 'hasTikTokShopProduct')) r.shop++;
    if (get(it, 'isAd') || get(it, 'isSponsored')) r.sponsored++;
    const when = String(get(it, 'createTimeISO') || '').slice(0, 10); if (when > r.last) r.last = when;
    by.set(name, r);
  }
  return [...by.values()].map((r) => finish(r, hashtags));
}

/** Instagram hashtag-scraper items -> per-creator rows (posts carry likes/comments, not views). */
function collapseInstagram(items, hashtags) {
  const by = new Map();
  for (const it of items) {
    const name = it.ownerUsername; if (!name) continue;
    const likes = Number(it.likesCount || 0), comments = Number(it.commentsCount || 0);
    const r = by.get(name) || { handle: name, platform: 'instagram', profile_url: `https://www.instagram.com/${name}/`, followers: Number(it.ownerFollowersCount || 0), bio: String(it.ownerFullName || ''), bio_link: '', example_url: it.url || '', plays: [], ers: [], shop: 0, sponsored: 0, last: '' };
    r.plays.push(likes + comments); // reach proxy when views are not exposed
    r.ers.push(r.followers ? (likes + comments) / r.followers : 0);
    if (it.paidPartnership) r.sponsored++;
    const when = String(it.timestamp || '').slice(0, 10); if (when > r.last) r.last = when;
    by.set(name, r);
  }
  return [...by.values()].map((r) => finish(r, hashtags));
}

function finish(r, hashtags) {
  const row = {
    platform: r.platform, handle: r.handle, profile_url: r.profile_url, followers: r.followers,
    posts_in_sample: r.plays.length, median_plays: Math.round(median(r.plays)), engagement_pct: Math.round(median(r.ers) * 10000) / 100,
    tier: tierFor(r.followers), shop_tagged_posts: r.shop, sponsored_posts: r.sponsored,
    bio: r.bio, bio_link: r.bio_link, example_url: r.example_url, last_post: r.last, source_hashtags: hashtags.join(','),
  };
  const { score, notes } = scoreCreator(row);
  row.score = score; row.score_notes = notes.join('; ');
  return row;
}

/**
 * Score 0-100 for "worth seeding for a small brand". Pure.
 * Rewards: real engagement, enough reach to matter, recent posting, (US) proof they sell via TikTok Shop.
 * Penalises: huge reach with tiny engagement (finds/aggregator accounts), silence, oversized accounts that cost too much.
 */
function scoreCreator(c, market = config.defaultMarket) {
  const notes = [];
  let s = 0;
  const er = Number(c.engagement_pct || 0), plays = Number(c.median_plays || 0), f = Number(c.followers || 0);
  // engagement (0-40)
  const erPts = Math.min(40, Math.round(er * 5)); s += erPts; if (er >= 5) notes.push(`strong engagement ${er}%`);
  // reach (0-25) on a log scale: 1K plays = 8, 10K = 15, 100K = 22, 1M = 25
  const reachPts = plays <= 0 ? 0 : Math.min(25, Math.round(8 + 7 * Math.log10(Math.max(plays, 1000) / 1000))); s += reachPts;
  // affordability (0-15): nano/micro cost gifted-$500, mid/macro cost real money
  const tierPts = { nano: 12, micro: 15, mid: 8, macro: 3 }[c.tier] ?? 0; s += tierPts; if (c.tier === 'macro') notes.push('macro: expect $1K+ per post');
  // recency (0-10)
  if (c.last_post) { const days = (Date.now() - Date.parse(c.last_post)) / 86400000; if (days <= 30) s += 10; else if (days <= 90) s += 5; else notes.push('no post in 90 days'); }
  // commerce proof (0-10): only meaningful where TikTok Shop exists
  if (market === 'US' && c.platform === 'tiktok' && c.shop_tagged_posts > 0) { s += 10; notes.push('already sells via TikTok Shop'); }
  // penalties
  if (plays >= 100000 && er < 1.5) { s -= 15; notes.push('high reach, low engagement: likely a finds/aggregator account'); }
  if (f >= 1000000) { s -= 30; notes.push('1M+ followers: media or celebrity account, not reachable by seeding or commission'); }
  else if (f >= 500000) { s -= 10; notes.push('500K+ followers: agency-managed, expect a rate card'); }
  if (/(news|official|magazine|network|radio|channel)\b|\btv\b/i.test(`${c.handle || ''} ${c.bio || ''}`)) { s -= 20; notes.push('looks like a media/brand account'); }
  if (c.posts_in_sample === 1) notes.push('one post in sample: verify profile before contacting');
  s = Math.max(0, Math.min(100, s));
  return { score: s, notes };
}

async function discoverTikTok(hashtags, perTag = 60) {
  const items = await runActorSync(config.apify.tiktokActor, { hashtags, resultsPerPage: perTag });
  return collapseTikTok(items, hashtags);
}

async function discoverInstagram(hashtags, perTag = 40) {
  const items = await runActorSync(config.apify.instagramActor, { hashtags, resultsType: 'posts', resultsLimit: perTag });
  return collapseInstagram(items, hashtags);
}

/** Hashtag starting points by market and niche, from the Oct 2026 research. */
const SEED_HASHTAGS = {
  AU: {
    'hospitality business (restaurant guides, courses, software)': ['restaurantowner', 'cafeowner', 'openingarestaurant', 'hospitalitylife', 'cheflifeaustralia', 'smallbusinessaustralia', 'foodtruckaustralia'],
    food: ['sydneyfoodie', 'melbournefoodie', 'brisbanefoodie', 'homecookau', 'aussiefood'], cookware: ['kitchenaustralia', 'homecookau', 'mealprepaustralia'], coffee: ['sydneycoffee', 'melbournecoffee', 'coffeeaustralia'],
  },
  US: {
    'hospitality business (restaurant guides, courses, software)': ['restaurantowner', 'openingarestaurant', 'cafeowner', 'chefstiktok', 'foodtruckbusiness', 'restaurantlife', 'smallbusinessowner', 'ghostkitchen'],
    food: ['foodtok', 'homecook', 'easyrecipes', 'tiktokshopfinds'], cookware: ['kitchenfinds', 'kitchentok', 'tiktokmademebuyit', 'kitchenmusthaves'], coffee: ['coffeetok', 'homebarista', 'coffeefinds'],
  },
};

module.exports = { runActorSync, collapseTikTok, collapseInstagram, scoreCreator, tierFor, discoverTikTok, discoverInstagram, SEED_HASHTAGS };
