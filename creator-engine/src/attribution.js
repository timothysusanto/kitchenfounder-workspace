'use strict';
/**
 * Sales attribution: one discount code and one UTM link per creator, then match Shopify orders back.
 * Codes catch the "I saw it on TikTok and typed the code" buyer; UTMs catch the link-in-bio buyer.
 */
const { q } = require('./db');
const shopify = require('./shopify');
const config = require('./config');

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

/** Issue code + link for one campaign creator. Idempotent. The link is always written; the code needs Shopify. */
async function issueTracking(ccId) {
  const cc = q.campaignCreatorById.get(ccId);
  if (!cc) throw new Error('campaign creator not found');
  if (cc.discount_code) return cc;
  const campaign = q.campaignById.get(cc.campaign_id);
  const store = q.storeById.get(campaign.store_id);
  const code = codeFor(cc.handle, campaign.name);
  const link = utmLink(campaign.product_url || `https://${store.shop}`, campaign.name, cc.handle);
  try {
    const gid = await createDiscountCode(store, { code, title: `Creator ${cc.handle} · ${campaign.name}`, percentage: campaign.customer_discount_pct || 10 });
    q.setCampaignCreatorCode.run(code, gid, link, ccId);
  } catch (e) {
    q.setCampaignCreatorCode.run(null, null, link, ccId);
    throw e;
  }
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
  const { orders, utmSupported } = await fetchRecentOrders(store, days);
  let attributed = 0;
  for (const o of orders) if (recordOrder(storeId, o, 'sync')) attributed++;
  q.touchOrderSync.run(storeId);
  return { fetched: orders.length, attributed, utmSupported };
}

// ---- Real-time: Shopify orders/create webhook ----
const crypto = require('crypto');

/** Verify X-Shopify-Hmac-Sha256 (base64 HMAC of the raw body with the app's client secret). */
function verifyWebhookHmac(rawBody, headerValue, secret = config.shopify.clientSecret) {
  if (!headerValue || !secret) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const a = Buffer.from(digest), b = Buffer.from(String(headerValue));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Pure: webhook order payload (REST shape) → the order shape matchOrder understands. UTM comes from landing_site. */
function orderFromWebhook(payload) {
  let utm = {};
  try {
    const u = new URL(String(payload.landing_site || ''), 'https://x.invalid');
    utm = { source: u.searchParams.get('utm_source'), medium: u.searchParams.get('utm_medium'), campaign: u.searchParams.get('utm_campaign'), content: u.searchParams.get('utm_content') };
  } catch { /* no landing site */ }
  const hasUtm = Object.values(utm).some(Boolean);
  return {
    id: payload.admin_graphql_api_id || `gid://shopify/Order/${payload.id}`,
    name: payload.name,
    createdAt: payload.created_at,
    discountCodes: (payload.discount_codes || []).map((d) => d.code).filter(Boolean),
    currentTotalPriceSet: { shopMoney: { amount: payload.current_total_price ?? payload.total_price ?? 0, currencyCode: payload.currency } },
    customerJourneySummary: hasUtm ? { lastVisit: { utmParameters: utm } } : null,
  };
}

/** Attribute one order (from webhook or sync) for a store. Returns the match or null. */
function recordOrder(storeId, order, source) {
  const trackers = q.allCampaignCreatorsForStore.all(storeId);
  const m = matchOrder(order, trackers);
  const u = order.customerJourneySummary?.lastVisit?.utmParameters || {};
  q.upsertAttributedOrder.run({
    store_id: storeId, shopify_order_id: order.id, order_name: order.name, created_at: order.createdAt,
    total: Number(order.currentTotalPriceSet?.shopMoney?.amount || 0), currency: order.currentTotalPriceSet?.shopMoney?.currencyCode || null,
    discount_codes: (order.discountCodes || []).join(','), utm_source: u.source || null, utm_campaign: u.campaign || null, utm_content: u.content || null,
    campaign_creator_id: m ? m.id : null, match_method: m ? m.method : null,
  });
  return m;
}

const WEBHOOK_CREATE = `
mutation Sub($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) { webhookSubscription { id } userErrors { field message } }
}`;
const WEBHOOK_LIST = `{ webhookSubscriptions(first: 20, topics: [ORDERS_CREATE]) { nodes { id endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } } } }`;

/** Make sure this store sends us orders/create. Idempotent: reuses an existing subscription to our URL. */
async function ensureOrderWebhook(store) {
  const callbackUrl = `${config.appUrl}/webhooks/shopify/orders`;
  const existing = await shopify.graphql(store.shop, store.access_token, WEBHOOK_LIST);
  const mine = (existing.webhookSubscriptions?.nodes || []).find((n) => n.endpoint?.callbackUrl === callbackUrl);
  if (mine) { q.setStoreWebhook.run(mine.id, store.id); return mine.id; }
  const data = await shopify.graphql(store.shop, store.access_token, WEBHOOK_CREATE, { topic: 'ORDERS_CREATE', sub: { callbackUrl, format: 'JSON' } });
  const errs = data.webhookSubscriptionCreate.userErrors;
  if (errs && errs.length) throw new Error(`Webhook error: ${errs.map((e) => e.message).join('; ')}`);
  const id = data.webhookSubscriptionCreate.webhookSubscription.id;
  q.setStoreWebhook.run(id, store.id);
  return id;
}

/** Pure: per-creator economics. CAC = all money spent on that creator / orders. */
const SAMPLE_SENT = new Set(['shipped', 'posted', 'amplified']);
function creatorEconomics(row) {
  const sample = row.status === undefined || SAMPLE_SENT.has(row.status) ? Number(row.sample_cost || 0) : 0;
  const spend = Number(row.fee_paid || 0) + Number(row.usage_rights_fee || 0) + Number(row.ad_spend || 0) + sample;
  const orders = Number(row.orders || 0), revenue = Number(row.revenue || 0);
  const commission = row.kind === 'affiliate' ? revenue * Number(row.creator_commission_pct || 0) / 100 : 0;
  const commissionPaid = Number(row.commission_paid || 0);
  const allIn = spend + commission;
  return { spend, commission, commissionPaid, commissionOwed: Math.max(0, commission - commissionPaid), orders, revenue,
    cac: orders ? allIn / orders : null, roas: allIn ? revenue / allIn : null };
}

module.exports = { codeFor, utmLink, createDiscountCode, issueTracking, fetchRecentOrders, matchOrder, syncOrders, creatorEconomics, verifyWebhookHmac, orderFromWebhook, recordOrder, ensureOrderWebhook };
