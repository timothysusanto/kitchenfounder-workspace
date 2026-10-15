'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const config = require('./config');
const { q } = require('./db');
const shopify = require('./shopify');
const jobs = require('./jobs');
const views = require('./views');
const vl = require('./views_loop');
const loop = require('./loop');
const { SEED_HASHTAGS } = require('./discovery');
const { DISCLOSURE } = require('./briefs');
const { hasFfmpeg } = require('./render');

const app = express();
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(config.sessionSecret));

const flashFrom = (req) => {
  const f = req.signedCookies.flash;
  if (!f) return null;
  try { return JSON.parse(f); } catch { return null; }
};
const setFlash = (res, type, text) => res.cookie('flash', JSON.stringify({ type, text }), { signed: true, httpOnly: true, sameSite: 'lax', maxAge: 10000 });
const render = (req, res, html) => { const f = flashFrom(req); if (f) res.clearCookie('flash'); res.send(views.layout('Creator Engine', html, f)); };
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.get('/', (req, res) => render(req, res, views.dashboard({ stores: q.stores.all(), stats: q.reviewStats.all() })));

app.get('/settings', wrap(async (req, res) => render(req, res, views.settingsPage({ config, ffmpeg: await hasFfmpeg() }))));

// ---- Shopify OAuth (authorization code grant, offline token) ----
app.get('/auth/shopify', (req, res) => {
  const shop = String(req.query.shop || '').trim().toLowerCase();
  if (!shopify.isValidShop(shop)) { setFlash(res, 'error', 'Enter the store as your-store.myshopify.com'); return res.redirect('/'); }
  if (!config.shopify.clientId || !config.shopify.clientSecret) { setFlash(res, 'error', 'SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET are not set'); return res.redirect('/'); }
  const nonce = shopify.makeNonce();
  res.cookie('shopify_nonce', nonce, { signed: true, httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
  res.redirect(shopify.authorizeUrl(shop, nonce));
});

app.get('/auth/shopify/callback', wrap(async (req, res) => {
  const { shop, code, state } = req.query;
  const nonce = req.signedCookies.shopify_nonce;
  if (!shopify.isValidShop(String(shop))) throw new Error('invalid shop in callback');
  if (!nonce || nonce !== state) throw new Error('state mismatch; start the install again');
  if (!shopify.verifyHmac(req.query)) throw new Error('HMAC verification failed');
  const tok = await shopify.exchangeCode(String(shop), String(code));
  q.upsertStore.run({ shop: String(shop), access_token: tok.access_token, scope: tok.scope || '' });
  res.clearCookie('shopify_nonce');
  const store = q.storeByShop.get(String(shop));
  const n = await jobs.syncStore(store.id);
  setFlash(res, 'ok', `Connected ${shop} and synced ${n} products`);
  res.redirect(`/stores/${store.id}`);
}));

// ---- Stores & products ----
app.get('/stores/:id', (req, res) => {
  const store = q.storeById.get(Number(req.params.id));
  if (!store) return res.status(404).send('store not found');
  render(req, res, views.storePage({ store, products: q.productsByStore.all(store.id) }));
});

app.post('/stores/:id/sync', wrap(async (req, res) => {
  const n = await jobs.syncStore(Number(req.params.id));
  setFlash(res, 'ok', `Synced ${n} products`);
  res.redirect(`/stores/${req.params.id}`);
}));

app.get('/products/:id', (req, res) => {
  const product = q.productById.get(Number(req.params.id));
  if (!product) return res.status(404).send('product not found');
  render(req, res, views.productPage({ product, scripts: q.scriptsByProduct.all(product.id) }));
});

app.post('/products/:id/scripts', wrap(async (req, res) => {
  const scripts = await jobs.scriptsForProduct(Number(req.params.id), 20);
  const counts = scripts.reduce((a, s) => ((a[s.compliance.status] = (a[s.compliance.status] || 0) + 1), a), {});
  setFlash(res, 'ok', `Generated ${scripts.length} scripts · pass ${counts.pass || 0} · review ${counts.review || 0} · fail ${counts.fail || 0}`);
  res.redirect(`/products/${req.params.id}`);
}));

app.post('/products/:id/render-all', wrap(async (req, res) => {
  const scripts = q.scriptsByProduct.all(Number(req.params.id)).filter((s) => s.compliance_status !== 'fail' && !s.video_id);
  let n = 0; const errors = [];
  for (const s of scripts) {
    try { await jobs.renderScript(s.id); n++; } catch (e) { errors.push(`#${s.idx}: ${e.message}`); }
  }
  setFlash(res, errors.length ? 'error' : 'ok', `Queued ${n} renders${errors.length ? `; ${errors.length} failed: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  res.redirect(`/products/${req.params.id}`);
}));

app.post('/scripts/:id/render', wrap(async (req, res) => {
  const v = await jobs.renderScript(Number(req.params.id));
  const s = q.scriptById.get(Number(req.params.id));
  setFlash(res, 'ok', `Render queued (HeyGen ${v.provider_video_id}). Click "Check render status" in a few minutes.`);
  res.redirect(`/products/${s.product_id}`);
}));

// ---- Videos & review ----
app.post('/videos/poll', wrap(async (req, res) => {
  const s = await jobs.pollVideos();
  setFlash(res, 'ok', `Checked ${s.checked}: ${s.completed} completed, ${s.failed} failed, ${s.still_processing} still rendering`);
  res.redirect(req.get('referer') || '/review');
}));

app.get('/review', (req, res) => render(req, res, views.reviewPage({ items: q.reviewQueue.all() })));

app.get('/videos/:id/file', (req, res) => {
  const v = q.videoById.get(Number(req.params.id));
  if (!v || !v.local_path || !fs.existsSync(v.local_path)) return res.status(404).send('no file');
  res.sendFile(v.local_path);
});

app.post('/videos/:id/approve', (req, res) => { q.setReview.run('approved', null, Number(req.params.id)); setFlash(res, 'ok', `Video #${req.params.id} approved`); res.redirect('/review'); });
app.post('/videos/:id/reject', (req, res) => { q.setReview.run('rejected', String(req.body.note || '').slice(0, 500), Number(req.params.id)); setFlash(res, 'ok', `Video #${req.params.id} rejected`); res.redirect('/review'); });


// ---- Creator-sales loop ----
app.post('/stores/:id/market', (req, res) => {
  const m = String(req.body.market || 'AU').toUpperCase() === 'US' ? 'US' : 'AU';
  q.setStoreMarket.run(m, Number(req.params.id));
  setFlash(res, 'ok', `Market set to ${m}`);
  res.redirect(`/stores/${req.params.id}`);
});

app.get('/stores/:id/creators', (req, res) => {
  const store = q.storeById.get(Number(req.params.id));
  if (!store) return res.status(404).send('store not found');
  store.campaigns = q.campaignsByStore.all(store.id);
  render(req, res, vl.creatorsPage({ store, creators: q.creatorsByStore.all(store.id), seeds: SEED_HASHTAGS[store.market] || SEED_HASHTAGS.AU }));
});

app.post('/stores/:id/discover', wrap(async (req, res) => {
  const hashtags = String(req.body.hashtags || '').split(/[,\s]+/).filter(Boolean);
  const n = await loop.discover(Number(req.params.id), { platform: req.body.platform, hashtags, perTag: Number(req.body.perTag || 60) });
  setFlash(res, 'ok', `Discovered or updated ${n} creators from ${hashtags.map((h) => '#' + h).join(' ')}`);
  res.redirect(`/stores/${req.params.id}/creators`);
}));

app.get('/stores/:id/campaigns', (req, res) => {
  const store = q.storeById.get(Number(req.params.id));
  if (!store) return res.status(404).send('store not found');
  render(req, res, vl.campaignsPage({ store, campaigns: q.campaignsByStore.all(store.id), products: q.productsByStore.all(store.id) }));
});

app.post('/stores/:id/campaigns', (req, res) => {
  const c = loop.createCampaign(Number(req.params.id), req.body);
  setFlash(res, 'ok', `Campaign "${c.name}" created. Generate the brief, then add creators.`);
  res.redirect(`/campaigns/${c.id}`);
});

app.post('/stores/:id/campaigns/add-creators', (req, res) => {
  const ids = [].concat(req.body.creator_ids || []).map(Number).filter(Boolean);
  const campaignId = Number(req.body.campaign_id);
  if (!campaignId || !ids.length) { setFlash(res, 'error', 'Tick at least one creator and pick a campaign'); return res.redirect(`/stores/${req.params.id}/creators`); }
  loop.addCreators(campaignId, ids);
  setFlash(res, 'ok', `Added ${ids.length} creators`);
  res.redirect(`/campaigns/${campaignId}`);
});

app.get('/campaigns/:id', (req, res) => {
  const campaign = q.campaignById.get(Number(req.params.id));
  if (!campaign) return res.status(404).send('campaign not found');
  render(req, res, vl.campaignPage({ campaign, creators: q.campaignCreators.all(campaign.id), disclosure: DISCLOSURE[campaign.market] || DISCLOSURE.AU }));
});

app.post('/campaigns/:id/brief', wrap(async (req, res) => {
  const out = await loop.brief(Number(req.params.id));
  setFlash(res, out.compliance.status === 'fail' ? 'error' : 'ok', `Brief generated: ${out.compliance.status}${out.compliance.notes.length ? ' — ' + out.compliance.notes[0] : ''}`);
  res.redirect(`/campaigns/${req.params.id}`);
}));

app.post('/campaigns/:id/issue', wrap(async (req, res) => {
  const r = await loop.issueAllTracking(Number(req.params.id));
  setFlash(res, r.errors.length ? 'error' : 'ok', `Issued ${r.issued} codes${r.errors.length ? '; errors: ' + r.errors.slice(0, 2).join(' | ') : ''}`);
  res.redirect(`/campaigns/${req.params.id}`);
}));

app.post('/campaign-creators/:id', (req, res) => {
  const cc = q.campaignCreatorById.get(Number(req.params.id));
  if (!cc) return res.status(404).send('not found');
  const b = req.body;
  q.updateCampaignCreator.run({
    id: cc.id, status: vl.STATUSES.includes(b.status) ? b.status : cc.status, fee_paid: Number(b.fee_paid || 0), usage_rights: b.usage_rights ? 1 : 0,
    usage_rights_fee: Number(b.usage_rights_fee || 0), post_url: String(b.post_url || '').slice(0, 500), ad_platform: String(b.ad_platform || '') || null,
    ad_auth_code: String(b.ad_auth_code || '').slice(0, 120) || null, ad_spend: Number(b.ad_spend || 0), notes: String(b.notes || '').slice(0, 500),
  });
  setFlash(res, 'ok', `Saved @${cc.handle}`);
  res.redirect(`/campaigns/${cc.campaign_id}`);
});

app.post('/stores/:id/sync-orders', wrap(async (req, res) => {
  const r = await loop.syncOrders(Number(req.params.id));
  setFlash(res, 'ok', `Synced ${r.fetched} orders, ${r.attributed} attributed to creators${r.utmSupported ? '' : ' (UTM attribution unavailable on this store; codes only)'}`);
  res.redirect(req.get('referer') || `/stores/${req.params.id}/report`);
}));

app.get('/stores/:id/report', (req, res) => {
  const store = q.storeById.get(Number(req.params.id));
  if (!store) return res.status(404).send('store not found');
  render(req, res, vl.reportPage({ store, r: loop.report(store.id) }));
});

app.get('/stores/:id/report.csv', (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="creator-report-${req.params.id}.csv"`);
  res.send(loop.reportCsv(Number(req.params.id)));
});

// ---- Errors ----
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  setFlash(res, 'error', err.message.slice(0, 300));
  res.redirect(req.get('referer') || '/');
});

/** Connect the store from SHOPIFY_SHOP + SHOPIFY_ACCESS_TOKEN (custom-app token) without OAuth. Idempotent. */
async function connectStoreFromEnv() {
  const { shop, accessToken, scopes } = config.shopify;
  if (!shop || !accessToken) return null;
  if (!shopify.isValidShop(shop)) { console.error(`SHOPIFY_SHOP must look like your-store.myshopify.com (got "${shop}")`); return null; }
  const existing = q.storeByShop.get(shop);
  if (existing && existing.access_token === accessToken) return existing;
  q.upsertStore.run({ shop, access_token: accessToken, scope: scopes });
  const store = q.storeByShop.get(shop);
  try { const n = await jobs.syncStore(store.id); console.log(`Connected ${shop} from env and synced ${n} products`); }
  catch (e) { console.error(`Connected ${shop} from env but product sync failed: ${e.message}`); }
  return store;
}

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Creator Engine listening on ${config.appUrl} (port ${config.port})`);
    connectStoreFromEnv().catch((e) => console.error(e));
  });
}

app.connectStoreFromEnv = connectStoreFromEnv;

module.exports = app;
