'use strict';
/** The creator-sales loop as plain functions: discover → campaign → brief → tracking → orders → report. */
const { db, q } = require('./db');
const config = require('./config');
const discovery = require('./discovery');
const briefs = require('./briefs');
const attribution = require('./attribution');
const crypto = require('crypto');

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
    commission_months: body.commission_months ? Number(body.commission_months) : null,
    creator_commission_after_pct: body.creator_commission_after_pct !== undefined && body.creator_commission_after_pct !== '' ? Number(body.creator_commission_after_pct) : null,
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
  const commission = rows.reduce((a, r) => a + r.commission, 0);
  const commissionOwed = rows.reduce((a, r) => a + r.commissionOwed, 0);
  const allIn = spend + commission;
  const attributedRevenue = rows.reduce((a, r) => a + r.revenue, 0);
  const attributedOrders = rows.reduce((a, r) => a + r.orders, 0);
  const winners = rows.filter((r) => r.orders >= 2 && r.roas !== null && r.roas >= 2);
  return {
    rows, totals, spend, commission, commissionOwed, allIn, attributedRevenue, attributedOrders,
    blendedCac: attributedOrders ? allIn / attributedOrders : null,
    blendedRoas: allIn ? attributedRevenue / allIn : null,
    posted: rows.filter((r) => r.post_url).length,
    applied: rows.filter((r) => r.source === 'applied').length,
    winners,
  };
}

// ---- Public programme: creators sign themselves up ----
const slug = () => crypto.randomBytes(4).toString('hex'); // 8 chars, always [0-9a-f]

function publishCampaign(campaignId, { isPublic, terms }) {
  const c = q.campaignById.get(campaignId);
  if (!c) throw new Error('campaign not found');
  q.setCampaignPublic.run(isPublic ? 1 : 0, c.public_slug || slug(), terms === undefined ? null : String(terms).slice(0, 2000), campaignId);
  return q.campaignById.get(campaignId);
}

const cleanHandle = (h) => String(h || '').trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\/@?/, '').replace(/[?#/].*$/, '').toLowerCase().slice(0, 60);
const PROFILE = { tiktok: (h) => `https://www.tiktok.com/@${h}`, instagram: (h) => `https://www.instagram.com/${h}/`, youtube: (h) => `https://www.youtube.com/@${h}` };

/**
 * A creator applies on the public page. Creates the creator if new, puts them in the campaign, issues code + link,
 * and returns the portal token. The code needs Shopify; if that fails the link still works and the code is retried later.
 */
async function joinProgramme(campaign, body) {
  const platform = ['tiktok', 'instagram', 'youtube'].includes(body.platform) ? body.platform : 'tiktok';
  const handle = cleanHandle(body.handle);
  if (!/^[a-z0-9._-]{2,60}$/.test(handle)) throw new Error('Enter your handle without spaces (letters, numbers, dots, underscores)');
  const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email so we can pay you');
  if (!body.agree) throw new Error('Please tick the disclosure agreement');
  q.insertAppliedCreator.run({
    store_id: campaign.store_id, platform, handle, profile_url: PROFILE[platform](handle),
    display_name: String(body.display_name || '').trim().slice(0, 80) || null, email,
    payout_email: String(body.payout_email || '').trim().toLowerCase().slice(0, 120) || email,
  });
  const creator = q.creatorByHandle.get(campaign.store_id, platform, handle);
  q.addCampaignCreator.run(campaign.id, creator.id);
  const cc = q.campaignCreatorByPair.get(campaign.id, creator.id);
  if (!cc.portal_token) q.setPortalToken.run(crypto.randomBytes(18).toString('base64url'), cc.id);
  let codeError = null;
  try { await attribution.issueTracking(cc.id); } catch (e) { codeError = e.message; }
  return { token: q.campaignCreatorById.get(cc.id).portal_token || q.campaignCreatorByPair.get(campaign.id, creator.id).portal_token, codeError };
}

/** Retry codes for programme members whose Shopify code failed earlier. */
async function retryMissingCodes(storeId) {
  const rows = q.allCampaignCreatorsForStore.all(storeId).filter((r) => !r.discount_code && r.utm_link);
  let n = 0;
  for (const r of rows) { try { await attribution.issueTracking(r.id); n++; } catch { /* next time */ } }
  return n;
}

function reportCsv(storeId) {
  const r = report(storeId);
  const head = ['campaign', 'market', 'creator', 'platform', 'tier', 'followers', 'source', 'status', 'code', 'posted', 'fee_paid', 'usage_rights_fee', 'ad_spend', 'sample_cost', 'spend', 'orders', 'revenue', 'commission', 'commission_paid', 'commission_owed', 'payout_email', 'cac', 'roas'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.join(',')];
  for (const x of r.rows) lines.push([x.campaign_name, x.market, x.handle, x.platform, x.tier, x.followers, x.source, x.status, x.discount_code, x.post_url ? 'yes' : 'no', x.fee_paid, x.usage_rights_fee, x.ad_spend, x.sample_cost, x.spend.toFixed(2), x.orders, x.revenue.toFixed(2), x.commission.toFixed(2), x.commissionPaid.toFixed(2), x.commissionOwed.toFixed(2), x.payout_email, x.cac === null ? '' : x.cac.toFixed(2), x.roas === null ? '' : x.roas.toFixed(2)].map(esc).join(','));
  return lines.join('\n');
}

module.exports = { discover, createCampaign, brief, addCreators, issueAllTracking, syncOrders: attribution.syncOrders, report, reportCsv, publishCampaign, joinProgramme, retryMissingCodes, cleanHandle };
