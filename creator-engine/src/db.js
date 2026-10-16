'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(path.join(config.dataDir, 'videos'), { recursive: true });

const db = new Database(path.join(config.dataDir, 'engine.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  scope TEXT,
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_sync_at TEXT
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_id TEXT NOT NULL,
  title TEXT NOT NULL,
  handle TEXT,
  description TEXT,
  price TEXT,
  currency TEXT,
  image_url TEXT,
  product_url TEXT,
  tags TEXT,
  raw_json TEXT,
  UNIQUE(store_id, shopify_id)
);
CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  angle TEXT,
  hook TEXT,
  body TEXT,
  cta TEXT,
  on_screen_text TEXT,
  caption TEXT,
  claims_json TEXT,
  compliance_status TEXT NOT NULL DEFAULT 'pending',
  compliance_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  script_id INTEGER NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'heygen',
  provider_video_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  video_url TEXT,
  thumbnail_url TEXT,
  duration REAL,
  local_path TEXT,
  review_status TEXT NOT NULL DEFAULT 'unreviewed',
  review_note TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scripts_product ON scripts(product_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE TABLE IF NOT EXISTS creators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  profile_url TEXT,
  followers INTEGER DEFAULT 0,
  posts_in_sample INTEGER DEFAULT 0,
  median_plays INTEGER DEFAULT 0,
  engagement_pct REAL DEFAULT 0,
  tier TEXT,
  shop_tagged_posts INTEGER DEFAULT 0,
  sponsored_posts INTEGER DEFAULT 0,
  bio TEXT,
  bio_link TEXT,
  example_url TEXT,
  last_post TEXT,
  source_hashtags TEXT,
  score INTEGER DEFAULT 0,
  score_notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  contact TEXT,
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(store_id, platform, handle)
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'AU',
  kind TEXT NOT NULL DEFAULT 'gifted',
  customer_discount_pct REAL DEFAULT 10,
  creator_commission_pct REAL DEFAULT 10,
  fee_per_post REAL DEFAULT 0,
  sample_cost REAL DEFAULT 0,
  brief TEXT,
  caption_template TEXT,
  compliance_status TEXT NOT NULL DEFAULT 'pending',
  compliance_notes TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS campaign_creators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'shortlisted',
  discount_code TEXT,
  discount_gid TEXT,
  utm_link TEXT,
  fee_paid REAL DEFAULT 0,
  usage_rights INTEGER DEFAULT 0,
  usage_rights_fee REAL DEFAULT 0,
  post_url TEXT,
  posted_at TEXT,
  ad_platform TEXT,
  ad_auth_code TEXT,
  ad_spend REAL DEFAULT 0,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(campaign_id, creator_id)
);
CREATE TABLE IF NOT EXISTS attributed_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL,
  order_name TEXT,
  created_at TEXT,
  total REAL DEFAULT 0,
  currency TEXT,
  discount_codes TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  campaign_creator_id INTEGER REFERENCES campaign_creators(id) ON DELETE SET NULL,
  match_method TEXT,
  UNIQUE(store_id, shopify_order_id)
);
CREATE INDEX IF NOT EXISTS idx_creators_store ON creators(store_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_cc_campaign ON campaign_creators(campaign_id);
CREATE INDEX IF NOT EXISTS idx_orders_cc ON attributed_orders(campaign_creator_id);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'brand',
  brand_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
`);
// additive column migrations for existing databases
for (const sql of [
  "ALTER TABLE stores ADD COLUMN market TEXT NOT NULL DEFAULT 'AU'",
  "ALTER TABLE stores ADD COLUMN brand_name TEXT",
  'ALTER TABLE stores ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL',
  'ALTER TABLE stores ADD COLUMN webhook_id TEXT',
  'ALTER TABLE stores ADD COLUMN last_order_sync_at TEXT',
  'ALTER TABLE creators ADD COLUMN email TEXT',
  'ALTER TABLE creators ADD COLUMN payout_email TEXT',
  'ALTER TABLE creators ADD COLUMN display_name TEXT',
  "ALTER TABLE creators ADD COLUMN source TEXT NOT NULL DEFAULT 'discovered'",
  'ALTER TABLE campaigns ADD COLUMN public_slug TEXT',
  'ALTER TABLE campaigns ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE campaigns ADD COLUMN terms TEXT',
  'ALTER TABLE campaign_creators ADD COLUMN portal_token TEXT',
  'ALTER TABLE campaign_creators ADD COLUMN commission_paid REAL DEFAULT 0',
  'ALTER TABLE campaign_creators ADD COLUMN joined_at TEXT',
  'ALTER TABLE attributed_orders ADD COLUMN source TEXT',
]) { try { db.exec(sql); } catch (e) { /* column exists */ } }
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_slug ON campaigns(public_slug)');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cc_portal ON campaign_creators(portal_token)');


const q = {
  upsertStore: db.prepare(`INSERT INTO stores (shop, access_token, scope) VALUES (@shop, @access_token, @scope)
    ON CONFLICT(shop) DO UPDATE SET access_token=excluded.access_token, scope=excluded.scope`),
  storeByShop: db.prepare('SELECT * FROM stores WHERE shop = ?'),
  storeById: db.prepare('SELECT * FROM stores WHERE id = ?'),
  stores: db.prepare('SELECT id, shop, scope, installed_at, last_sync_at FROM stores ORDER BY id'),
  touchSync: db.prepare(`UPDATE stores SET last_sync_at = datetime('now') WHERE id = ?`),
  upsertProduct: db.prepare(`INSERT INTO products (store_id, shopify_id, title, handle, description, price, currency, image_url, product_url, tags, raw_json)
    VALUES (@store_id, @shopify_id, @title, @handle, @description, @price, @currency, @image_url, @product_url, @tags, @raw_json)
    ON CONFLICT(store_id, shopify_id) DO UPDATE SET title=excluded.title, handle=excluded.handle, description=excluded.description,
      price=excluded.price, currency=excluded.currency, image_url=excluded.image_url, product_url=excluded.product_url, tags=excluded.tags, raw_json=excluded.raw_json`),
  productsByStore: db.prepare(`SELECT p.*, (SELECT COUNT(*) FROM scripts s WHERE s.product_id = p.id) AS script_count
    FROM products p WHERE store_id = ? ORDER BY title`),
  productById: db.prepare('SELECT * FROM products WHERE id = ?'),
  insertScript: db.prepare(`INSERT INTO scripts (product_id, idx, angle, hook, body, cta, on_screen_text, caption, claims_json, compliance_status, compliance_notes)
    VALUES (@product_id, @idx, @angle, @hook, @body, @cta, @on_screen_text, @caption, @claims_json, @compliance_status, @compliance_notes)`),
  scriptsByProduct: db.prepare(`SELECT s.*, v.id AS video_id, v.status AS video_status, v.review_status, v.video_url
    FROM scripts s LEFT JOIN videos v ON v.script_id = s.id WHERE s.product_id = ? ORDER BY s.idx`),
  scriptById: db.prepare('SELECT * FROM scripts WHERE id = ?'),
  deleteScriptsForProduct: db.prepare('DELETE FROM scripts WHERE product_id = ?'),
  insertVideo: db.prepare(`INSERT INTO videos (script_id, provider, provider_video_id, status) VALUES (@script_id, @provider, @provider_video_id, @status)`),
  videoById: db.prepare('SELECT * FROM videos WHERE id = ?'),
  videoByScript: db.prepare('SELECT * FROM videos WHERE script_id = ? ORDER BY id DESC LIMIT 1'),
  videosProcessing: db.prepare(`SELECT * FROM videos WHERE status IN ('queued','pending','processing','waiting')`),
  updateVideoStatus: db.prepare(`UPDATE videos SET status=@status, video_url=COALESCE(@video_url, video_url), thumbnail_url=COALESCE(@thumbnail_url, thumbnail_url),
    duration=COALESCE(@duration, duration), error=@error, updated_at=datetime('now') WHERE id=@id`),
  setVideoLocal: db.prepare(`UPDATE videos SET local_path=?, updated_at=datetime('now') WHERE id=?`),
  setReview: db.prepare(`UPDATE videos SET review_status=?, review_note=?, updated_at=datetime('now') WHERE id=?`),
  reviewQueue: db.prepare(`SELECT v.*, s.hook, s.caption, s.on_screen_text, s.compliance_status, s.compliance_notes, p.title AS product_title
    FROM videos v JOIN scripts s ON s.id = v.script_id JOIN products p ON p.id = s.product_id
    WHERE v.status = 'completed' AND v.review_status = 'unreviewed' ORDER BY v.id`),
  reviewStats: db.prepare(`SELECT review_status, COUNT(*) AS n FROM videos GROUP BY review_status`),
  // --- creator loop ---
  setStoreMarket: db.prepare('UPDATE stores SET market = ? WHERE id = ?'),
  upsertCreator: db.prepare(`INSERT INTO creators (store_id, platform, handle, profile_url, followers, posts_in_sample, median_plays, engagement_pct, tier, shop_tagged_posts, sponsored_posts, bio, bio_link, example_url, last_post, source_hashtags, score, score_notes)
    VALUES (@store_id, @platform, @handle, @profile_url, @followers, @posts_in_sample, @median_plays, @engagement_pct, @tier, @shop_tagged_posts, @sponsored_posts, @bio, @bio_link, @example_url, @last_post, @source_hashtags, @score, @score_notes)
    ON CONFLICT(store_id, platform, handle) DO UPDATE SET followers=excluded.followers, posts_in_sample=excluded.posts_in_sample, median_plays=excluded.median_plays,
      engagement_pct=excluded.engagement_pct, tier=excluded.tier, shop_tagged_posts=excluded.shop_tagged_posts, sponsored_posts=excluded.sponsored_posts, bio=excluded.bio, bio_link=excluded.bio_link,
      example_url=excluded.example_url, last_post=excluded.last_post, source_hashtags=excluded.source_hashtags, score=excluded.score, score_notes=excluded.score_notes`),
  creatorsByStore: db.prepare('SELECT * FROM creators WHERE store_id = ? ORDER BY score DESC, engagement_pct DESC'),
  creatorById: db.prepare('SELECT * FROM creators WHERE id = ?'),
  setCreatorStatus: db.prepare('UPDATE creators SET status = ?, contact = COALESCE(?, contact) WHERE id = ?'),
  insertCampaign: db.prepare(`INSERT INTO campaigns (store_id, product_id, name, market, kind, customer_discount_pct, creator_commission_pct, fee_per_post, sample_cost)
    VALUES (@store_id, @product_id, @name, @market, @kind, @customer_discount_pct, @creator_commission_pct, @fee_per_post, @sample_cost)`),
  campaignsByStore: db.prepare(`SELECT c.*, p.title AS product_title, (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id = c.id) AS creator_count
    FROM campaigns c LEFT JOIN products p ON p.id = c.product_id WHERE c.store_id = ? ORDER BY c.id DESC`),
  campaignById: db.prepare('SELECT c.*, p.title AS product_title, p.product_url, p.handle AS product_handle FROM campaigns c LEFT JOIN products p ON p.id = c.product_id WHERE c.id = ?'),
  setCampaignBrief: db.prepare('UPDATE campaigns SET brief = ?, caption_template = ?, compliance_status = ?, compliance_notes = ? WHERE id = ?'),
  setCampaignStatus: db.prepare('UPDATE campaigns SET status = ? WHERE id = ?'),
  addCampaignCreator: db.prepare('INSERT OR IGNORE INTO campaign_creators (campaign_id, creator_id) VALUES (?, ?)'),
  campaignCreators: db.prepare(`SELECT cc.*, cr.handle, cr.platform, cr.profile_url, cr.followers, cr.engagement_pct, cr.median_plays, cr.tier, cr.score, cr.source, cr.email, cr.payout_email,
      (SELECT COUNT(*) FROM attributed_orders o WHERE o.campaign_creator_id = cc.id) AS orders,
      (SELECT COALESCE(SUM(o.total),0) FROM attributed_orders o WHERE o.campaign_creator_id = cc.id) AS revenue
    FROM campaign_creators cc JOIN creators cr ON cr.id = cc.creator_id WHERE cc.campaign_id = ? ORDER BY revenue DESC, cr.score DESC`),
  campaignCreatorById: db.prepare('SELECT cc.*, cr.handle, cr.platform FROM campaign_creators cc JOIN creators cr ON cr.id = cc.creator_id WHERE cc.id = ?'),
  allCampaignCreatorsForStore: db.prepare(`SELECT cc.id, cc.discount_code, cc.utm_link, cr.handle, c.name AS campaign_name FROM campaign_creators cc
    JOIN campaigns c ON c.id = cc.campaign_id JOIN creators cr ON cr.id = cc.creator_id WHERE c.store_id = ?`),
  updateCampaignCreator: db.prepare(`UPDATE campaign_creators SET status=@status, fee_paid=@fee_paid, usage_rights=@usage_rights, usage_rights_fee=@usage_rights_fee, post_url=@post_url,
    posted_at=CASE WHEN @post_url IS NOT NULL AND @post_url <> '' AND posted_at IS NULL THEN datetime('now') ELSE posted_at END,
    ad_platform=@ad_platform, ad_auth_code=@ad_auth_code, ad_spend=@ad_spend, notes=@notes, updated_at=datetime('now') WHERE id=@id`),
  setCampaignCreatorCode: db.prepare('UPDATE campaign_creators SET discount_code=?, discount_gid=?, utm_link=?, updated_at=datetime(\'now\') WHERE id=?'),
  upsertAttributedOrder: db.prepare(`INSERT INTO attributed_orders (store_id, shopify_order_id, order_name, created_at, total, currency, discount_codes, utm_source, utm_campaign, utm_content, campaign_creator_id, match_method)
    VALUES (@store_id, @shopify_order_id, @order_name, @created_at, @total, @currency, @discount_codes, @utm_source, @utm_campaign, @utm_content, @campaign_creator_id, @match_method)
    ON CONFLICT(store_id, shopify_order_id) DO UPDATE SET total=excluded.total, discount_codes=excluded.discount_codes, utm_source=excluded.utm_source, utm_campaign=excluded.utm_campaign,
      utm_content=excluded.utm_content, campaign_creator_id=excluded.campaign_creator_id, match_method=excluded.match_method`),
  storeReport: db.prepare(`SELECT c.id AS campaign_id, c.name AS campaign_name, c.market, c.kind, c.sample_cost, c.creator_commission_pct, cc.id AS cc_id, cr.handle, cr.platform, cr.tier, cr.followers, cr.source, cr.payout_email, cc.status, cc.discount_code,
      cc.fee_paid, cc.usage_rights, cc.usage_rights_fee, cc.ad_spend, cc.post_url, cc.commission_paid,
      (SELECT COUNT(*) FROM attributed_orders o WHERE o.campaign_creator_id = cc.id) AS orders,
      (SELECT COALESCE(SUM(o.total),0) FROM attributed_orders o WHERE o.campaign_creator_id = cc.id) AS revenue
    FROM campaign_creators cc JOIN campaigns c ON c.id = cc.campaign_id JOIN creators cr ON cr.id = cc.creator_id WHERE c.store_id = ? ORDER BY revenue DESC`),
  storeOrderTotals: db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS revenue, SUM(CASE WHEN campaign_creator_id IS NOT NULL THEN 1 ELSE 0 END) AS attributed_n,
      COALESCE(SUM(CASE WHEN campaign_creator_id IS NOT NULL THEN total ELSE 0 END),0) AS attributed_revenue FROM attributed_orders WHERE store_id = ?`),
  // --- accounts ---
  userCount: db.prepare('SELECT COUNT(*) AS n FROM users'),
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  userById: db.prepare('SELECT id, email, role, brand_name, created_at FROM users WHERE id = ?'),
  insertUser: db.prepare('INSERT INTO users (email, password_hash, role, brand_name) VALUES (@email, @password_hash, @role, @brand_name)'),
  updateUserPassword: db.prepare('UPDATE users SET password_hash = ?, role = ? WHERE id = ?'),
  insertSession: db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))"),
  sessionUser: db.prepare(`SELECT u.id, u.email, u.role, u.brand_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > datetime('now')`),
  deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
  purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')"),
  storesForUser: db.prepare('SELECT id, shop, scope, installed_at, last_sync_at, market, user_id FROM stores WHERE user_id = ? ORDER BY id'),
  claimStore: db.prepare('UPDATE stores SET user_id = ? WHERE id = ? AND user_id IS NULL'),
  setStoreOwner: db.prepare('UPDATE stores SET user_id = ? WHERE id = ?'),
  setStoreWebhook: db.prepare('UPDATE stores SET webhook_id = ? WHERE id = ?'),
  touchOrderSync: db.prepare("UPDATE stores SET last_order_sync_at = datetime('now') WHERE id = ?"),
  allStores: db.prepare('SELECT * FROM stores ORDER BY id'),
  // --- public programme + portal ---
  setCampaignPublic: db.prepare('UPDATE campaigns SET is_public = ?, public_slug = COALESCE(public_slug, ?), terms = COALESCE(?, terms) WHERE id = ?'),
  campaignBySlug: db.prepare(`SELECT c.*, p.title AS product_title, p.product_url, p.image_url AS product_image, p.price AS product_price, p.currency AS product_currency,
      s.shop, COALESCE(s.brand_name, u.brand_name) AS store_brand FROM campaigns c LEFT JOIN products p ON p.id = c.product_id JOIN stores s ON s.id = c.store_id LEFT JOIN users u ON u.id = s.user_id WHERE c.public_slug = ? AND c.is_public = 1`),
  creatorByHandle: db.prepare('SELECT * FROM creators WHERE store_id = ? AND platform = ? AND handle = ?'),
  insertAppliedCreator: db.prepare(`INSERT INTO creators (store_id, platform, handle, profile_url, display_name, email, payout_email, source, status, score, score_notes, tier)
    VALUES (@store_id, @platform, @handle, @profile_url, @display_name, @email, @payout_email, 'applied', 'agreed', 0, 'applied via programme page', 'unknown')
    ON CONFLICT(store_id, platform, handle) DO UPDATE SET display_name=COALESCE(excluded.display_name, display_name), email=COALESCE(excluded.email, email), payout_email=COALESCE(excluded.payout_email, payout_email)`),
  campaignCreatorByPair: db.prepare('SELECT * FROM campaign_creators WHERE campaign_id = ? AND creator_id = ?'),
  setPortalToken: db.prepare("UPDATE campaign_creators SET portal_token = ?, status = CASE WHEN status = 'shortlisted' THEN 'agreed' ELSE status END, joined_at = COALESCE(joined_at, datetime('now')) WHERE id = ?"),
  portalByToken: db.prepare(`SELECT cc.*, cr.handle, cr.platform, cr.display_name, cr.email, cr.payout_email, c.name AS campaign_name, c.kind, c.market, c.customer_discount_pct, c.creator_commission_pct,
      c.caption_template, c.brief, c.terms, c.product_id, p.title AS product_title, p.product_url, p.price AS product_price, p.currency AS product_currency, s.shop, COALESCE(s.brand_name, u.brand_name) AS store_brand, s.id AS store_id,
      (SELECT COUNT(*) FROM attributed_orders o WHERE o.campaign_creator_id = cc.id) AS orders,
      (SELECT COALESCE(SUM(o.total),0) FROM attributed_orders o WHERE o.campaign_creator_id = cc.id) AS revenue
    FROM campaign_creators cc JOIN creators cr ON cr.id = cc.creator_id JOIN campaigns c ON c.id = cc.campaign_id JOIN stores s ON s.id = c.store_id LEFT JOIN users u ON u.id = s.user_id LEFT JOIN products p ON p.id = c.product_id
    WHERE cc.portal_token = ?`),
  portalOrders: db.prepare('SELECT order_name, created_at, total, currency, match_method FROM attributed_orders WHERE campaign_creator_id = ? ORDER BY created_at DESC LIMIT 50'),
  setCommissionPaid: db.prepare("UPDATE campaign_creators SET commission_paid = ?, updated_at = datetime('now') WHERE id = ?"),
  // --- webhooks ---
  storeByShopAny: db.prepare('SELECT * FROM stores WHERE shop = ?'),
};

module.exports = { db, q };
