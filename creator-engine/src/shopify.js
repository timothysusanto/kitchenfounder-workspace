'use strict';
const crypto = require('crypto');
const config = require('./config');

const SHOP_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

function isValidShop(shop) {
  return typeof shop === 'string' && SHOP_RE.test(shop);
}

function makeNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/** URL to send the merchant to so they can approve the app (authorization code grant, offline token). */
function authorizeUrl(shop, nonce) {
  const p = new URLSearchParams({
    client_id: config.shopify.clientId,
    scope: config.shopify.scopes,
    redirect_uri: `${config.appUrl}/auth/shopify/callback`,
    state: nonce,
  });
  return `https://${shop}/admin/oauth/authorize?${p.toString()}`;
}

/**
 * Verify the HMAC Shopify attaches to the callback query string.
 * Remove `hmac`, sort remaining params as key=value, join with '&', HMAC-SHA256 with the client secret.
 */
function verifyHmac(query, secret = config.shopify.clientSecret) {
  const { hmac, ...rest } = query;
  if (!hmac || typeof hmac !== 'string') return false;
  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(',') : rest[k]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const a = Buffer.from(digest, 'utf8');
  const b = Buffer.from(hmac, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function exchangeCode(shop, code) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: config.shopify.clientId,
      client_secret: config.shopify.clientSecret,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Shopify token exchange failed: ${res.status} ${await res.text()}`);
  return res.json(); // { access_token, scope }
}

async function graphql(shop, accessToken, query, variables = {}) {
  const res = await fetch(`https://${shop}/admin/api/${config.shopify.apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify GraphQL HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const PRODUCTS_QUERY = `
query Products($first: Int!, $after: String) {
  products(first: $first, after: $after, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      title
      handle
      description
      tags
      onlineStoreUrl
      featuredMedia { preview { image { url } } }
      priceRangeV2 { minVariantPrice { amount currencyCode } }
    }
  }
}`;

/** Fetch every active product (paginated) and return rows ready for the products table. */
async function fetchAllProducts(shop, accessToken) {
  const rows = [];
  let after = null;
  for (let page = 0; page < 40; page++) {
    const data = await graphql(shop, accessToken, PRODUCTS_QUERY, { first: 50, after });
    for (const n of data.products.nodes) rows.push(normaliseProduct(shop, n));
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  return rows;
}

function normaliseProduct(shop, n) {
  return {
    shopify_id: n.id,
    title: n.title,
    handle: n.handle,
    description: (n.description || '').slice(0, 4000),
    price: n.priceRangeV2?.minVariantPrice?.amount ?? null,
    currency: n.priceRangeV2?.minVariantPrice?.currencyCode ?? null,
    image_url: n.featuredMedia?.preview?.image?.url ?? null,
    product_url: n.onlineStoreUrl || `https://${shop}/products/${n.handle}`,
    tags: Array.isArray(n.tags) ? n.tags.join(', ') : '',
    raw_json: JSON.stringify(n),
  };
}

module.exports = { isValidShop, makeNonce, authorizeUrl, verifyHmac, exchangeCode, graphql, fetchAllProducts, normaliseProduct };
