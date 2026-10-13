'use strict';
/**
 * Sales attribution: one discount code and one UTM link per creator, then match Shopify orders back.
 * Codes catch the "I saw it on TikTok and typed the code" buyer; UTMs catch the link-in-bio buyer.
 */
const { q } = require('./db');
const shopify = require('./shopify');

function codeFor(handle, campaignName) {
  const h = String(handle).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12) || 'CREATOR';
  const c = String(campaignName).replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
  return `${h}${c ? '-' + c : ''}`;
}

function utmLink(productUrl, campaignName, handle) {
  const u = new URL(productUrl);
  u.searchParams.set('utm_source', 'creator');
  u.searchParams.set('utm_medium', 'affiliate');
  u.searchParams.set('utm_campaign', String(campaignName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  u.searchParams.set('utm_content', String(handle).toLowerCase());
  return u.toString();
}

const CREATE_CODE = `
mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
    codeDiscountNode { id }
    userErrors { field message }
  }
}`;

async function createDiscountCode(store, { code, title, percentage }) {
  const data = await shopify.graphql(store.shop, store.access_token, CREATE_CODE, {
    basicCodeDiscount: {
      title, code, startsAt: new Date().toISOString(),
      customerSelection: { all: true },
      customerGets: { value: { percentage: percentage / 100 }, items: { all: true } },
      appliesOncePerCustomer: true,
    },
  });
  const errs = data.discountCodeBasicCreate.userErrors;
  if (errs && errs.length) throw new Error(`Shopify discount error: ${errs.map((e) => e.message).join('; ')}`);
  return data.discountCodeBasicCreate.codeDiscountNode.id;
}

/** Issue code + link for one campaign creator. Idempotent. */
async function issueTracking(ccId) {
  const cc = q.campaignCreatorById.get(ccId);
  if (!cc) throw new Error('campaign creator not found');
  if (cc.discount_code) return cc;
  const campaign = q.campaignById.get(cc.campaign_id);
  const store = q.storeById.get(campaign.store_id);
  const code = codeFor(cc.handle, campaign.name);
  const gid = await createDiscountCode(store, { code, title: `Creator ${cc.handle} · ${campaign.name}`, percentage: campaign.customer_discount_pct || 10 });
  const link = utmLink(campaign.product_url || `https://${store.shop}`, campaign.name, cc.handle);
  q.setCampaignCreatorCode.run(code, gid, link, ccId);
  return q.campaignCreatorById.get(ccId);
}

const ORDERS_FULL = `
query Orders($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id name createdAt discountCodes
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      customerJourneySummary { lastVisit { utmParameters { source medium campaign content } } firstVisit { utmParameters { source medium campaign content } } }
    }
  }
}`;
const ORDERS_CODES_ONLY = `
query Orders($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes { id name createdAt discountCodes currentTotalPriceSet { shopMoney { amount currencyCode } } }
  }
}`;

async function fetchRecentOrders(store, days = 60) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const out = []; let after = null; let query = ORDERS_FULL; let utmSupported = true;
  for (let page = 0; page < 20; page++) {
    let data;
    try { data = await shopify.graphql(store.shop, store.access_token, query, { first: 100, after, query: `created_at:>=${since}` }); }
    catch (e) {
      if (utmSupported && /customerJourneySummary|utmParameters/i.test(e.message)) { utmSupported = false; query = ORDERS_CODES_ONLY; page--; continue; }
      throw e;
    }
    for (const n of data.orders.nodes) out.push(n);
    if (!data.orders.pageInfo.hasNextPage) break;
    after = data.orders.pageInfo.endCursor;
  }
  return { orders: out, utmSupported };
}

/** Pure: decide which campaign creator an order belongs to. Code wins over UTM. */
function matchOrder(order, trackers) {
  const codes = (order.discountCodes || []).map((c) => String(c).toUpperCase());
  for (const t of trackers) if (t.discount_code && codes.includes(t.discount_code.toUpperCase())) return { id: t.id, method: 'code' };
  const visits = [order.customerJourneySummary?.lastVisit, order.customerJourneySummary?.firstVisit].filter(Boolean);
  for (const v of visits) {
    const u = v.utmParameters || {};
    if (String(u.source || '').toLowerCase() === 'creator' && u.content) {
      const t = trackers.find((x) => x.handle.toLowerCase() === String(u.content).toLowerCase());
      if (t) return { id: t.id, method: 'utm' };
    }
  }
  return null;
}

async function syncOrders(storeId, days = 60) {
  const store = q.storeById.get(storeId);
  if (!store) throw new Error('store not found');
  const trackers = q.allCampaignCreatorsForStore.all(storeId);
  const { orders, utmSupported } = await fetchRecentOrders(store, days);
  let attributed = 0;
  for (const o of orders) {
    const m = matchOrder(o, trackers);
    const u = o.customerJourneySummary?.lastVisit?.utmParameters || {};
    q.upsertAttributedOrder.run({
      store_id: storeId, shopify_order_id: o.id, order_name: o.name, created_at: o.createdAt,
      total: Number(o.currentTotalPriceSet?.shopMoney?.amount || 0), currency: o.currentTotalPriceSet?.shopMoney?.currencyCode || null,
      discount_codes: (o.discountCodes || []).join(','), utm_source: u.source || null, utm_campaign: u.campaign || null, utm_content: u.content || null,
      campaign_creator_id: m ? m.id : null, match_method: m ? m.method : null,
    });
    if (m) attributed++;
  }
  return { fetched: orders.length, attributed, utmSupported };
}

/** Pure: per-creator economics. CAC = all money spent on that creator / orders. */
const SAMPLE_SENT = new Set(['shipped', 'posted', 'amplified']);
function creatorEconomics(row) {
  const sample = row.status === undefined || SAMPLE_SENT.has(row.status) ? Number(row.sample_cost || 0) : 0;
  const spend = Number(row.fee_paid || 0) + Number(row.usage_rights_fee || 0) + Number(row.ad_spend || 0) + sample;
  const orders = Number(row.orders || 0), revenue = Number(row.revenue || 0);
  return { spend, orders, revenue, cac: orders ? spend / orders : null, roas: spend ? revenue / spend : null };
}

module.exports = { codeFor, utmLink, createDiscountCode, issueTracking, fetchRecentOrders, matchOrder, syncOrders, creatorEconomics };
