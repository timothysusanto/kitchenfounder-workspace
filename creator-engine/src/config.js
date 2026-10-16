'use strict';
require('dotenv').config();
const path = require('path');

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const config = {
  appUrl: env('APP_URL', 'http://localhost:3000').replace(/\/$/, ''),
  port: Number(env('PORT', 3000)),
  sessionSecret: env('SESSION_SECRET', 'dev-only-secret-change-me'),
  dataDir: path.resolve(env('DATA_DIR', './data')),
  shopify: {
    clientId: env('SHOPIFY_CLIENT_ID', ''),
    clientSecret: env('SHOPIFY_CLIENT_SECRET', ''),
    scopes: env('SHOPIFY_SCOPES', 'read_products,read_orders,write_discounts'),
    apiVersion: env('SHOPIFY_API_VERSION', '2026-10'),
    // Single-store shortcut: a custom app's Admin API token (Shopify admin → Settings → Apps → Develop apps).
    // When both are set the store is connected on boot and OAuth is not needed.
    shop: env('SHOPIFY_SHOP', '').trim().toLowerCase(),
    accessToken: env('SHOPIFY_ACCESS_TOKEN', ''),
  },
  anthropic: {
    apiKey: env('ANTHROPIC_API_KEY', ''),
    model: env('ANTHROPIC_MODEL', 'claude-sonnet-5-5'),
  },
  apify: {
    token: env('APIFY_TOKEN', ''),
    tiktokActor: env('APIFY_TIKTOK_ACTOR', 'clockworks~tiktok-hashtag-scraper'),
    instagramActor: env('APIFY_INSTAGRAM_ACTOR', 'apify~instagram-hashtag-scraper'),
  },
  defaultMarket: env('DEFAULT_MARKET', 'AU'),
  allowSignup: env('ALLOW_SIGNUP', 'true') !== 'false',
  autoSyncMinutes: Number(env('AUTO_SYNC_MINUTES', 60)),
  heygen: {
    apiKey: env('HEYGEN_API_KEY', ''),
    avatarId: env('HEYGEN_AVATAR_ID', ''),
    voiceId: env('HEYGEN_VOICE_ID', ''),
  },
  brand: {
    name: env('BRAND_NAME', 'Your brand'),
    voice: env('BRAND_VOICE', 'Clear, friendly, specific. No hype.'),
    disclosure: env('AI_DISCLOSURE', 'This video features an AI presenter.'),
  },
};

module.exports = config;
