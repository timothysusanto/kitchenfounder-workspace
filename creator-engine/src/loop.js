'use strict';
/** The creator-sales loop as plain functions: discover → campaign → brief → tracking → orders → report. */
const { db, q } = require('./db');
const config = require('./config');
const discovery = require('./discovery');
const briefs = require('./briefs');
const attribution = require('./attribution');

async function discover(storeId, { platform = 'tiktok', hashtags, perTag = 60 }) {
  const store = q.storeById.get(storeId);
  if (!store) throw new Error('store not found');
  const tags = (hashtags || []).map((h) => String(h).replace(/^#/, '').trim()).filter(Boolean);
  if (!tags.length) throw new Error('give at least one hashtag');
  const rows = platform === 'instagram' ? await discovery.discoverInstagram(tags, perTag) : await discovery.discoverTikTok(tags, perTag);
  const scored = rows.map((r) => { const { score, notes } = discovery.scoreCreator(r, store.market || config.defaultMarket); return { ...r, score, score_notes: notes.join('; ') }; });
  const tx = db.transaction((items) => { for (const r of items) q.upsertCreator.run({ store_id: storeId, ...r }); });
  tx(scored);
  return scored.length;
}

function createCampaign(storeId, body) {
  const store = q.storeById.get(storeId);
  const info = q.insertCampaign.run({
    store_id: storeId,
    product_id: body.product_id ? Number(body.product_id) : null,
    name: String(body.name || 'Seeding').slice(0, 60),
    market: body.market || store.market || config.defaultMarket,
    kind: ['gifted', 'paid', 'affiliate'].includes(body.kind) ? body.kind : 'gifted',
    customer_discount_pct: Number(body.customer_discount_pct || 10),
    creator_commission_pct: Number(body.creator_commission_pct || 10),
    fee_per_post: Number(body.fee_per_post || 0),
    sample_cost: Number(body.sample_cost || 0),
  });
  return q.campaignById.get(info.lastInsertRowid);
}

async function brief(campaignId) {
  const c = q.campaignById.get(campaignId);
  if (!c) throw new Error('campaign not found');
  const product = c.product_id ? q.productById.get(c.product_id) : null;
  const out = await briefs.generateBrief(c, product);
  q.setCampaignBrief.run(out.brief, out.caption_template, out.compliance.status, out.compliance.notes.join('\n'), campaignId);
  return out;
}

function addCreators(campaignId, creatorIds) {
  const tx = db.transaction((ids) => { for (const id of ids) { q.addCampaignCreator.run(campaignId, Number(id)); q.setCreatorStatus.run('shortlisted', null, Number(id)); } });
  tx(creatorIds);
}

async function issueAllTracking(campaignId) {
  const c = q.campaignById.get(campaignId);
  if (c.compliance_status === 'fail') throw new Error('fix the brief before issuing codes');
  const rows = q.campaignCreators.all(campaignId);
  let n = 0; const errors = [];
  for (const cc of rows) {
    if (cc.discount_code) continue;
    try { await attribution.issueTracking(cc.id); n++; } catch (e) { errors.push(`${cc.handle}: ${e.message}`); }
  }
  return { issued: n, errors };
}

function report(storeId) {
  const rows = q.storeReport.all(storeId).map((r) => ({ ...r, ...attribution.creatorEconomics(r) }));
  const totals = q.storeOrderTotals.get(storeId);
  const spend = rows.reduce((a, r) => a + r.spend, 0);
  const attributedRevenue = rows.reduce((a, r) => a + r.revenue, 0);
  const attributedOrders = rows.reduce((a, r) => a + r.orders, 0);
  const winners = rows.filter((r) => r.orders >= 2 && r.roas !== null && r.roas >= 2);
  return {
    rows, totals, spend, attributedRevenue, attributedOrders,
    blendedCac: attributedOrders ? spend / attributedOrders : null,
    blendedRoas: spend ? attributedRevenue / spend : null,
    posted: rows.filter((r) => r.post_url).length,
    winners,
  };
}

function reportCsv(storeId) {
  const r = report(storeId);
  const head = ['campaign', 'market', 'creator', 'platform', 'tier', 'followers', 'status', 'code', 'posted', 'fee_paid', 'usage_rights_fee', 'ad_spend', 'sample_cost', 'spend', 'orders', 'revenue', 'cac', 'roas'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.join(',')];
  for (const x of r.rows) lines.push([x.campaign_name, x.market, x.handle, x.platform, x.tier, x.followers, x.status, x.discount_code, x.post_url ? 'yes' : 'no', x.fee_paid, x.usage_rights_fee, x.ad_spend, x.sample_cost, x.spend.toFixed(2), x.orders, x.revenue.toFixed(2), x.cac === null ? '' : x.cac.toFixed(2), x.roas === null ? '' : x.roas.toFixed(2)].map(esc).join(','));
  return lines.join('\n');
}

module.exports = { discover, createCampaign, brief, addCreators, issueAllTracking, syncOrders: attribution.syncOrders, report, reportCsv };
