'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { isValidShop, verifyHmac, authorizeUrl, normaliseProduct } = require('../src/shopify');

test('shop domain validation', () => {
  assert.equal(isValidShop('kitchen-founder.myshopify.com'), true);
  assert.equal(isValidShop('evil.com/?x=.myshopify.com'), false);
  assert.equal(isValidShop('not a shop'), false);
});

test('hmac verification matches Shopify algorithm', () => {
  const secret = 'shh';
  const params = { code: 'abc', shop: 'x.myshopify.com', state: 'n1', timestamp: '1700000000' };
  const msg = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  const hmac = crypto.createHmac('sha256', secret).update(msg).digest('hex');
  assert.equal(verifyHmac({ ...params, hmac }, secret), true);
  assert.equal(verifyHmac({ ...params, hmac: hmac.replace(/^./, '0') }, secret), false);
  assert.equal(verifyHmac({ ...params }, secret), false);
});

test('authorize url has the required params', () => {
  const u = new URL(authorizeUrl('x.myshopify.com', 'nonce1'));
  assert.equal(u.hostname, 'x.myshopify.com');
  assert.equal(u.pathname, '/admin/oauth/authorize');
  assert.equal(u.searchParams.get('state'), 'nonce1');
  assert.ok(u.searchParams.get('redirect_uri').endsWith('/auth/shopify/callback'));
});

test('product normalisation', () => {
  const row = normaliseProduct('x.myshopify.com', {
    id: 'gid://shopify/Product/1', title: 'Oil', handle: 'oil', description: 'd', tags: ['a', 'b'],
    onlineStoreUrl: null, featuredMedia: { preview: { image: { url: 'img' } } }, priceRangeV2: { minVariantPrice: { amount: '12.0', currencyCode: 'AUD' } },
  });
  assert.equal(row.price, '12.0');
  assert.equal(row.currency, 'AUD');
  assert.equal(row.image_url, 'img');
  assert.equal(row.product_url, 'https://x.myshopify.com/products/oil');
  assert.equal(row.tags, 'a, b');
});
