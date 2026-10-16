'use strict';
/**
 * Free creator report (public lead magnet): a niche + email in, a ranked list of real creators out.
 * Spend is capped: results are cached 7 days per market+hashtags, each IP gets a few per day, and there is a global daily cap on live Apify runs.
 */
const crypto = require('crypto');
const config = require('./config');
const { q } = require('./db');
const discovery = require('./discovery');

let discover = (tags) => discovery.discoverTikTok(tags, 30);
const setDiscover = (fn) => { discover = fn; };

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
const cleanTags = (raw) => [...new Set(String(raw || '').split(/[\s,#]+/).map((t) => t.toLowerCase().replace(/[^a-z0-9_]/g, '')).filter((t) => t.length >= 3 && t.length <= 40))].slice(0, 3);

/** Hashtags for the form: a custom list wins; otherwise the seed list for the chosen niche (first 3). */
function pickTags(market, niche, custom) {
  const own = cleanTags(custom);
  if (own.length) return own;
  const seed = (discovery.SEED_HASHTAGS[market] || {})[niche];
  return seed ? seed.slice(0, 3) : [];
}

/** Start a report. Returns { token } or throws a user-facing Error. `cached` runs cost nothing. */
function start({ email, market, niche, custom, ip }) {
  email = String(email || '').trim().toLowerCase();
  if (!validEmail(email)) throw new Error('Enter a valid email so we can send you the full list.');
  market = market === 'US' ? 'US' : 'AU';
  const tags = pickTags(market, niche, custom);
  if (!tags.length) throw new Error('Pick a niche or type up to 3 hashtags.');
  const key = [...tags].sort().join(',');
  if (q.reportsTodayByIp.get(ip || '').n >= config.report.perIpPerDay) throw new Error('You have run the maximum reports for today. Try again tomorrow.');

  const token = crypto.randomBytes(12).toString('base64url');
  const cached = q.cachedReport.get(market, key);
  if (cached) {
    const info = q.insertReport.run({ token, email, market, hashtags: key, status: 'done', result_json: cached.result_json, ip: ip || '' });
    q.finishReport.run('done', cached.result_json, 'cached', info.lastInsertRowid);
    return { token };
  }
  if (q.liveRunsToday.get().n >= config.report.dailyCap) throw new Error('We are at capacity for free reports today. Please try again tomorrow.');
  const info = q.insertReport.run({ token, email, market, hashtags: key, status: 'running', result_json: null, ip: ip || '' });
  const id = info.lastInsertRowid;
  Promise.resolve().then(() => discover(tags)).then((rows) => {
    const scored = rows.map((r) => { const { score, notes } = discovery.scoreCreator(r, market); return { ...r, score, score_notes: notes.join('; ') }; });
    q.finishReport.run('done', JSON.stringify(scored.sort((a, b) => b.score - a.score).slice(0, 25)), null, id);
  }).catch((e) => { console.error('report failed', e.message); q.finishReport.run('error', null, 'Discovery failed. Please try again in a few minutes.', id); });
  return { token };
}

/** Pure: what the public page shows. Top 10, plus honest totals; no invented sales forecast. */
function summarise(rows, sampleCost = 30, testSize = 30) {
  const top = rows.slice(0, 10);
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };
  return {
    top, found: rows.length,
    smallOnes: rows.filter((r) => r.tier === 'nano' || r.tier === 'micro').length,
    combinedMedianReach: top.reduce((a, r) => a + (r.median_plays || 0), 0),
    medianEngagement: Math.round(median(top.map((r) => r.engagement_pct)) * 100) / 100,
    testCost: sampleCost * testSize, testSize, sampleCost,
  };
}

module.exports = { start, summarise, pickTags, cleanTags, validEmail, setDiscover };
