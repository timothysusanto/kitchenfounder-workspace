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
const vp = require('./views_public');
const loop = require('./loop');
const auth = require('./auth');
const attribution = require('./attribution');
const billing = require('./billing');
const { bootstrapProgramme, parseSpec } = require('./bootstrap');
const { SEED_HASHTAGS } = require('./discovery');
const { DISCLOSURE } = require('./briefs');
const { hasFfmpeg } = require('./render');

const app = express();
app.set('trust proxy', 1);

// Shopify webhooks need the raw body for HMAC verification; everything else is form-encoded.
app.post('/webhooks/shopify/orders', express.raw({ type: '*/*', limit: '2mb' }), (req, res) => {
  try {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  if (!attribution.verifyWebhookHmac(raw, req.get('X-Shopify-Hmac-Sha256'))) return res.status(401).send('bad hmac');
  const shop = String(req.get('X-Shopify-Shop-Domain') || '').toLowerCase();
  const store = q.storeByShopAny.get(shop);
  if (!store) return res.status(200).send('unknown shop'); // 200 so Shopify stops retrying
  let payload;
  try { payload = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).send('bad json'); }
  const m = attribution.recordOrder(store.id, attribution.orderFromWebhook(payload), 'webhook');
  console.log(`webhook order ${payload.name || payload.id} for ${shop}: ${m ? `attributed via ${m.method}` : 'not attributed'}`);
  res.status(200).send('ok');
  } catch (e) { console.error('webhook error', e); res.status(500).send('error'); }
});

// Stripe webhook (raw body, signature checked).
app.post('/webhooks/stripe', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    if (!billing.verifyStripeSignature(raw, req.get('Stripe-Signature'), config.stripe.webhookSecret)) return res.status(400).send('bad signature');
    const note = billing.applyEvent(JSON.parse(raw.toString('utf8')));
    console.log(`stripe webhook: ${note}`);
    res.status(200).send('ok');
  } catch (e) { console.error('stripe webhook error', e); res.status(500).send('error'); }
});

// Shopify mandatory privacy webhooks (customers/data_request, customers/redact, shop/redact). One URL, topic in the header.
app.post('/webhooks/shopify/compliance', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    if (!attribution.verifyWebhookHmac(raw, req.get('X-Shopify-Hmac-Sha256'))) return res.status(401).send('bad hmac');
    const topic = String(req.get('X-Shopify-Topic') || '');
    const payload = JSON.parse(raw.toString('utf8') || '{}');
    const store = q.storeByShopAny.get(String(payload.shop_domain || req.get('X-Shopify-Shop-Domain') || '').toLowerCase());
    if (topic === 'shop/redact' && store) q.deleteStoreById.run(store.id);
    if (topic === 'customers/redact' && store && payload.customer && payload.customer.id) q.clearCustomer.run(store.id, `gid://shopify/Customer/${payload.customer.id}`);
    // customers/data_request: we hold no customer personal data (only Shopify's customer id on orders), so there is nothing to export.
    console.log(`shopify compliance webhook ${topic} for ${(store && store.shop) || 'unknown shop'}`);
    res.status(200).send('ok');
  } catch (e) { console.error('compliance webhook error', e); res.status(500).send('error'); }
});

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(config.sessionSecret));
app.use(auth.attach);
app.use(auth.guard);
// Brands whose trial has ended (or whose card failed) can browse but not run actions. Owners and billing-off engines are never blocked.
app.use((req, res, next) => {
  if (req.method !== 'POST' || !req.user || req.path.startsWith('/billing') || req.path === '/logout') return next();
  if (billing.accessFor(req.user).allowed) return next();
  setFlash(res, 'error', 'Your free trial has ended. Subscribe on the Billing page to keep running campaigns.');
  return res.redirect('/billing');
});

const flashFrom = (req) => {
  const f = req.signedCookies.flash;
  if (!f) return null;
  try { return JSON.parse(f); } catch { return null; }
};
const setFlash = (res, type, text) => res.cookie('flash', JSON.stringify({ type, text }), { signed: true, httpOnly: true, sameSite: 'lax', maxAge: 10000 });
const render = (req, res, html) => { const f = flashFrom(req); if (f) res.clearCookie('flash'); res.send(views.layout('Creator Engine', html, f, req.user)); };
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const notFound = (res, what = 'not found') => res.status(404).send(what);
const safeNext = (v) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : '/');

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.get('/privacy', (req, res) => res.send(views.layout('Privacy', vp.privacyPage(), null, req.user)));
app.get('/terms', (req, res) => res.send(views.layout('Terms', vp.termsPage(), null, req.user)));

app.get('/billing', (req, res) => {
  const u = q.userById.get(req.user.id);
  render(req, res, vp.billingPage({ sum: billing.summary({ ...req.user, ...u }) }));
});
app.post('/billing/checkout', wrap(async (req, res) => {
  if (!billing.enabled()) { setFlash(res, 'error', 'Billing is not switched on yet.'); return res.redirect('/billing'); }
  try { res.redirect(303, await billing.checkoutUrl(req.user)); } catch (e) { setFlash(res, 'error', e.message); res.redirect('/billing'); }
}));
app.post('/billing/portal', wrap(async (req, res) => {
  try { res.redirect(303, await billing.portalUrl(req.user)); } catch (e) { setFlash(res, 'error', e.message); res.redirect('/billing'); }
}));


// ---- Accounts ----
app.get('/setup', (req, res) => {
  if (q.userCount.get().n > 0) return res.redirect('/login');
  res.send(views.layout('Setup', vp.authPage({ mode: 'setup' }), null, null));
});
app.post('/setup', (req, res) => {
  if (q.userCount.get().n > 0) return res.redirect('/login');
  try {
    const u = auth.createUser({ email: req.body.email, password: req.body.password, role: 'owner', brand_name: config.brand.name });
    auth.startSession(res, u.id);
    for (const s of q.allStores.all()) if (!s.user_id) q.setStoreOwner.run(u.id, s.id); // stores connected before accounts existed belong to the owner
    setFlash(res, 'ok', 'Owner account created. You are logged in.');
    res.redirect('/');
  } catch (e) { res.status(400).send(views.layout('Setup', vp.authPage({ mode: 'setup', error: e.message }), null, null)); }
});

app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  if (q.userCount.get().n === 0) return res.redirect('/setup');
  res.send(views.layout('Log in', vp.authPage({ mode: 'login', next: req.query.next, brandSignup: config.allowSignup }), null, null));
});
app.post('/login', (req, res) => {
  const u = auth.login(req.body.email, req.body.password);
  if (!u) return res.status(401).send(views.layout('Log in', vp.authPage({ mode: 'login', error: 'Wrong email or password', next: req.query.next, brandSignup: config.allowSignup }), null, null));
  auth.startSession(res, u.id);
  res.redirect(safeNext(req.query.next));
});
app.post('/logout', (req, res) => { auth.endSession(req, res); res.redirect('/login'); });

app.get('/signup', (req, res) => {
  if (!config.allowSignup) return notFound(res, 'signup is closed');
  if (req.user) return res.redirect('/');
  res.send(views.layout('Sign up', vp.authPage({ mode: 'signup' }), null, null));
});
app.post('/signup', (req, res) => {
  if (!config.allowSignup) return notFound(res, 'signup is closed');
  try {
    const u = auth.createUser({ email: req.body.email, password: req.body.password, role: 'brand', brand_name: req.body.brand_name });
    auth.startSession(res, u.id);
    setFlash(res, 'ok', 'Account created. Connect your Shopify store to start.');
    res.redirect('/');
  } catch (e) { res.status(400).send(views.layout('Sign up', vp.authPage({ mode: 'signup', error: e.message }), null, null)); }
});

// ---- Home ----
app.get('/', (req, res) => {
  const stores = auth.isOwner(req.user) ? q.stores.all() : q.storesForUser.all(req.user.id);
  render(req, res, views.dashboard({ stores, stats: auth.isOwner(req.user) ? q.reviewStats.all() : [], user: req.user }));
});

app.get('/settings', wrap(async (req, res) => {
  if (!auth.isOwner(req.user)) return notFound(res);
  render(req, res, views.settingsPage({ config, ffmpeg: await hasFfmpeg() }));
}));

// ---- Shopify OAuth (authorization code grant, offline token) ----
app.get('/auth/shopify', (req, res) => {
  const shop = String(req.query.shop || '').trim().toLowerCase();
  if (!shopify.isValidShop(shop)) { setFlash(res, 'error', 'Enter the store as your-store.myshopify.com'); return res.redirect('/'); }
  if (!config.shopify.clientId || !config.shopify.clientSecret) { setFlash(res, 'error', 'SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET are not set'); return res.redirect('/'); }
  const existing = q.storeByShop.get(shop);
  if (existing && existing.user_id && existing.user_id !== req.user.id && !auth.isOwner(req.user)) { setFlash(res, 'error', 'That store is already connected to another account'); return res.redirect('/'); }
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
  q.claimStore.run(req.user.id, store.id);
  const n = await jobs.syncStore(store.id);
  let hook = 'order webhook on';
  try { await attribution.ensureOrderWebhook(store); } catch (e) { hook = `order webhook failed: ${e.message.slice(0, 80)}`; }
  setFlash(res, 'ok', `Connected ${shop}, synced ${n} products, ${hook}`);
  res.redirect(`/stores/${store.id}`);
}));

// ---- Stores & products ----
app.get('/stores/:id', (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  render(req, res, views.storePage({ store, products: q.productsByStore.all(store.id), campaigns: q.campaignsByStore.all(store.id), appUrl: config.appUrl }));
});

app.post('/stores/:id/sync', wrap(async (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  const n = await jobs.syncStore(store.id);
  setFlash(res, 'ok', `Synced ${n} products`);
  res.redirect(`/stores/${store.id}`);
}));

app.post('/stores/:id/webhook', wrap(async (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  const id = await attribution.ensureOrderWebhook(store);
  setFlash(res, 'ok', `Real-time order tracking is on (${id.split('/').pop()})`);
  res.redirect(`/stores/${store.id}`);
}));

app.post('/stores/:id/market', (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  const m = String(req.body.market || 'AU').toUpperCase() === 'US' ? 'US' : 'AU';
  q.setStoreMarket.run(m, store.id);
  setFlash(res, 'ok', `Market set to ${m}`);
  res.redirect(`/stores/${store.id}`);
});

const productFor = (req, id) => { const p = q.productById.get(Number(id)); return p && auth.storeFor(req, p.store_id) ? p : null; };

app.get('/products/:id', (req, res) => {
  const product = productFor(req, req.params.id);
  if (!product) return notFound(res, 'product not found');
  render(req, res, views.productPage({ product, scripts: q.scriptsByProduct.all(product.id) }));
});

app.post('/products/:id/scripts', wrap(async (req, res) => {
  const product = productFor(req, req.params.id);
  if (!product) return notFound(res, 'product not found');
  const scripts = await jobs.scriptsForProduct(product.id, 20);
  const counts = scripts.reduce((a, s) => ((a[s.compliance.status] = (a[s.compliance.status] || 0) + 1), a), {});
  setFlash(res, 'ok', `Generated ${scripts.length} scripts · pass ${counts.pass || 0} · review ${counts.review || 0} · fail ${counts.fail || 0}`);
  res.redirect(`/products/${product.id}`);
}));

app.post('/products/:id/render-all', wrap(async (req, res) => {
  const product = productFor(req, req.params.id);
  if (!product) return notFound(res, 'product not found');
  const scripts = q.scriptsByProduct.all(product.id).filter((s) => s.compliance_status !== 'fail' && !s.video_id);
  let n = 0; const errors = [];
  for (const s of scripts) {
    try { await jobs.renderScript(s.id); n++; } catch (e) { errors.push(`#${s.idx}: ${e.message}`); }
  }
  setFlash(res, errors.length ? 'error' : 'ok', `Queued ${n} renders${errors.length ? `; ${errors.length} failed: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  res.redirect(`/products/${product.id}`);
}));

app.post('/scripts/:id/render', wrap(async (req, res) => {
  const s = q.scriptById.get(Number(req.params.id));
  if (!s || !productFor(req, s.product_id)) return notFound(res);
  const v = await jobs.renderScript(s.id);
  setFlash(res, 'ok', `Render queued (HeyGen ${v.provider_video_id}). Click "Check render status" in a few minutes.`);
  res.redirect(`/products/${s.product_id}`);
}));

// ---- Videos & review (owner only) ----
app.post('/videos/poll', wrap(async (req, res) => {
  if (!auth.isOwner(req.user)) return notFound(res);
  const s = await jobs.pollVideos();
  setFlash(res, 'ok', `Checked ${s.checked}: ${s.completed} completed, ${s.failed} failed, ${s.still_processing} still rendering`);
  res.redirect(req.get('referer') || '/review');
}));

app.get('/review', (req, res) => { if (!auth.isOwner(req.user)) return notFound(res); render(req, res, views.reviewPage({ items: q.reviewQueue.all() })); });

app.get('/videos/:id/file', (req, res) => {
  if (!auth.isOwner(req.user)) return notFound(res);
  const v = q.videoById.get(Number(req.params.id));
  if (!v || !v.local_path || !fs.existsSync(v.local_path)) return notFound(res, 'no file');
  res.sendFile(v.local_path);
});

app.post('/videos/:id/approve', (req, res) => { if (!auth.isOwner(req.user)) return notFound(res); q.setReview.run('approved', null, Number(req.params.id)); setFlash(res, 'ok', `Video #${req.params.id} approved`); res.redirect('/review'); });
app.post('/videos/:id/reject', (req, res) => { if (!auth.isOwner(req.user)) return notFound(res); q.setReview.run('rejected', String(req.body.note || '').slice(0, 500), Number(req.params.id)); setFlash(res, 'ok', `Video #${req.params.id} rejected`); res.redirect('/review'); });

// ---- Creator-sales loop ----
app.get('/stores/:id/creators', (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  store.campaigns = q.campaignsByStore.all(store.id);
  render(req, res, vl.creatorsPage({ store, creators: q.creatorsByStore.all(store.id), seeds: SEED_HASHTAGS[store.market] || SEED_HASHTAGS.AU, products: q.productsByStore.all(store.id) }));
});

app.post('/stores/:id/discover', wrap(async (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  const hashtags = String(req.body.hashtags || '').split(/[,\s]+/).filter(Boolean);
  const n = await loop.discover(store.id, { platform: req.body.platform, hashtags, perTag: Number(req.body.perTag || 60) });
  setFlash(res, 'ok', `Discovered or updated ${n} creators from ${hashtags.map((h) => '#' + h).join(' ')}`);
  res.redirect(`/stores/${store.id}/creators`);
}));

app.get('/stores/:id/campaigns', (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  render(req, res, vl.campaignsPage({ store, campaigns: q.campaignsByStore.all(store.id), products: q.productsByStore.all(store.id), appUrl: config.appUrl }));
});

app.post('/stores/:id/campaigns', (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  const c = loop.createCampaign(store.id, req.body);
  setFlash(res, 'ok', `Campaign "${c.name}" created. Generate the brief, then open the programme or add creators.`);
  res.redirect(`/campaigns/${c.id}`);
});

app.post('/stores/:id/campaigns/add-creators', (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  const ids = [].concat(req.body.creator_ids || []).map(Number).filter(Boolean);
  if (!ids.length) { setFlash(res, 'error', 'Tick at least one creator in the table first'); return res.redirect(`/stores/${store.id}/creators`); }
  let campaignId = Number(req.body.campaign_id);
  let created = false;
  if (campaignId) { const c = auth.campaignFor(req, campaignId); if (!c || c.store_id !== store.id) return notFound(res, 'campaign not found'); }
  else {
    if (!String(req.body.name || '').trim()) { setFlash(res, 'error', 'Give the new campaign a name (or pick an existing one)'); return res.redirect(`/stores/${store.id}/creators`); }
    const c = loop.createCampaign(store.id, req.body);
    campaignId = c.id; created = true;
  }
  loop.addCreators(campaignId, ids);
  setFlash(res, 'ok', `${created ? 'Campaign created and ' : ''}${ids.length} creators added. Next: Generate brief, then Issue codes + links.`);
  res.redirect(`/campaigns/${campaignId}`);
});

app.get('/campaigns/:id', (req, res) => {
  const campaign = auth.campaignFor(req, req.params.id);
  if (!campaign) return notFound(res, 'campaign not found');
  render(req, res, vl.campaignPage({ campaign, creators: q.campaignCreators.all(campaign.id), disclosure: DISCLOSURE[campaign.market] || DISCLOSURE.AU, appUrl: config.appUrl }));
});

app.post('/campaigns/:id/brief', wrap(async (req, res) => {
  const campaign = auth.campaignFor(req, req.params.id);
  if (!campaign) return notFound(res, 'campaign not found');
  const out = await loop.brief(campaign.id);
  setFlash(res, out.compliance.status === 'fail' ? 'error' : 'ok', `Brief generated: ${out.compliance.status}${out.compliance.notes.length ? ' — ' + out.compliance.notes[0] : ''}`);
  res.redirect(`/campaigns/${campaign.id}`);
}));

app.post('/campaigns/:id/issue', wrap(async (req, res) => {
  const campaign = auth.campaignFor(req, req.params.id);
  if (!campaign) return notFound(res, 'campaign not found');
  const r = await loop.issueAllTracking(campaign.id);
  setFlash(res, r.errors.length ? 'error' : 'ok', `Issued ${r.issued} codes${r.errors.length ? '; errors: ' + r.errors.slice(0, 2).join(' | ') : ''}`);
  res.redirect(`/campaigns/${campaign.id}`);
}));

app.post('/campaigns/:id/publish', (req, res) => {
  const campaign = auth.campaignFor(req, req.params.id);
  if (!campaign) return notFound(res, 'campaign not found');
  const isPublic = req.body.is_public === '1';
  const c = loop.publishCampaign(campaign.id, { isPublic, terms: req.body.terms });
  setFlash(res, 'ok', isPublic ? `Programme is open. Share ${config.appUrl}/join/${c.public_slug}` : 'Programme closed. The page is off; existing creators keep their codes.');
  res.redirect(`/campaigns/${campaign.id}`);
});

app.post('/campaign-creators/:id', (req, res) => {
  const cc = q.campaignCreatorById.get(Number(req.params.id));
  if (!cc || !auth.campaignFor(req, cc.campaign_id)) return notFound(res);
  const b = req.body;
  q.updateCampaignCreator.run({
    id: cc.id, status: vl.STATUSES.includes(b.status) ? b.status : cc.status, fee_paid: Number(b.fee_paid || 0), usage_rights: b.usage_rights ? 1 : 0,
    usage_rights_fee: Number(b.usage_rights_fee || 0), post_url: String(b.post_url || '').slice(0, 500), ad_platform: String(b.ad_platform || '') || null,
    ad_auth_code: String(b.ad_auth_code || '').slice(0, 120) || null, ad_spend: Number(b.ad_spend || 0), notes: String(b.notes || '').slice(0, 500),
  });
  if (b.commission_paid !== undefined) q.setCommissionPaid.run(Number(b.commission_paid || 0), cc.id);
  setFlash(res, 'ok', `Saved @${cc.handle}`);
  res.redirect(`/campaigns/${cc.campaign_id}`);
});

app.post('/stores/:id/sync-orders', wrap(async (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  const r = await loop.syncOrders(store.id);
  const retried = await loop.retryMissingCodes(store.id);
  setFlash(res, 'ok', `Synced ${r.fetched} orders, ${r.attributed} attributed to creators${r.utmSupported ? '' : ' (UTM attribution unavailable on this store; codes only)'}${retried ? `; issued ${retried} pending codes` : ''}`);
  res.redirect(req.get('referer') || `/stores/${store.id}/report`);
}));

app.get('/stores/:id/report', (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  render(req, res, vl.reportPage({ store, r: loop.report(store.id) }));
});

app.get('/stores/:id/report.csv', (req, res) => {
  const store = auth.storeFor(req, req.params.id);
  if (!store) return notFound(res, 'store not found');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="creator-report-${store.id}.csv"`);
  res.send(loop.reportCsv(store.id));
});

// ---- Public: creator programme + portal (no login) ----
const publicLayout = (title, body) => views.layout(title, body, null, null, { minimal: true });

app.get('/join/:slug', (req, res) => {
  const campaign = q.campaignBySlug.get(String(req.params.slug));
  if (!campaign) return res.status(404).send(publicLayout('Programme', '<div class="card" style="max-width:520px;margin:40px auto">This programme is closed or the link is wrong.</div>'));
  res.send(publicLayout('Creator programme', vp.joinPage({ campaign })));
});

app.post('/join/:slug', wrap(async (req, res) => {
  const campaign = q.campaignBySlug.get(String(req.params.slug));
  if (!campaign) return res.status(404).send(publicLayout('Programme', '<div class="card">This programme is closed.</div>'));
  try {
    const { token, codeError } = await loop.joinProgramme(campaign, req.body);
    if (codeError) console.error(`join: code not issued for ${req.body.handle}: ${codeError}`);
    res.redirect(`/c/${token}`);
  } catch (e) {
    res.status(400).send(publicLayout('Creator programme', vp.joinPage({ campaign, error: e.message, values: req.body })));
  }
}));

app.get('/c/:token', (req, res) => {
  const cc = q.portalByToken.get(String(req.params.token));
  if (!cc) return res.status(404).send(publicLayout('Creator page', '<div class="card" style="max-width:520px;margin:40px auto">That link is not valid.</div>'));
  res.send(publicLayout('Your creator page', vp.portalPage({ cc, orders: q.portalOrders.all(cc.id), commission: attribution.creatorEconomics({ ...cc, cc_id: cc.id }).commission })));
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

/** Every AUTO_SYNC_MINUTES: pull recent orders for every store (catches anything the webhook missed) and retry pending codes. */
async function autoSyncAll() {
  for (const store of q.allStores.all()) {
    try {
      const r = await attribution.syncOrders(store.id, 7);
      const retried = await loop.retryMissingCodes(store.id);
      if (r.attributed || retried) console.log(`auto-sync ${store.shop}: ${r.fetched} orders, ${r.attributed} attributed, ${retried} codes issued`);
    } catch (e) { console.error(`auto-sync ${store.shop} failed: ${e.message}`); }
  }
}

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Creator Engine listening on ${config.appUrl} (port ${config.port})`);
    (async () => {
      await connectStoreFromEnv();
      auth.syncOwnerFromEnv(config);
      await bootstrapProgramme(parseSpec(config.bootstrap));
    })().catch((e) => console.error('boot tasks failed', e));
    if (config.autoSyncMinutes > 0) {
      setTimeout(() => autoSyncAll().catch(() => {}), 30000);
      setInterval(() => autoSyncAll().catch(() => {}), config.autoSyncMinutes * 60000);
    }
  });
}

app.connectStoreFromEnv = connectStoreFromEnv;
app.autoSyncAll = autoSyncAll;
module.exports = app;
