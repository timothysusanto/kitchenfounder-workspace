'use strict';
/**
 * One-shot automation from BOOTSTRAP_PROGRAMME (JSON) on boot. Idempotent: safe to leave set.
 * {"name":"Membership affiliates","product":"Membership","kind":"affiliate","commission":40,"discount":10,"terms":"...","test_creator":"kf.test","only":true}
 * "only": close every other open programme on the store so creators are pointed at one offer.
 * Steps: order webhook on → campaign (by name) → brief (if missing) → programme open → optional test creator with a real code.
 * Everything it does is printed to the logs with the links.
 */
const config = require('./config');
const { q } = require('./db');
const loop = require('./loop');
const attribution = require('./attribution');

async function bootstrapProgramme(spec, log = console.log) {
  if (!spec || !spec.name) return null;
  const store = config.shopify.shop ? q.storeByShop.get(config.shopify.shop) : q.allStores.all()[0];
  if (!store) { log('bootstrap: no store connected yet'); return null; }
  const out = { store: store.shop };

  try { out.webhook = await attribution.ensureOrderWebhook(store); log(`bootstrap: order webhook on for ${store.shop} (${out.webhook})`); }
  catch (e) { out.webhookError = e.message; log(`bootstrap: webhook failed: ${e.message}`); }

  const products = q.productsByStore.all(store.id);
  const needle = String(spec.product || '').toLowerCase();
  const product = products.find((p) => needle && p.title.toLowerCase().includes(needle)) || products.find((p) => Number(p.price) > 0) || products[0];
  if (!product) { log('bootstrap: store has no products synced'); return out; }

  let campaign = q.campaignsByStore.all(store.id).find((c) => c.name === spec.name);
  if (!campaign) {
    campaign = loop.createCampaign(store.id, {
      name: spec.name, product_id: product.id, kind: spec.kind || 'affiliate', market: spec.market || store.market,
      customer_discount_pct: spec.discount ?? 10, creator_commission_pct: spec.commission ?? 40, fee_per_post: 0, sample_cost: 0,
    });
    log(`bootstrap: campaign "${campaign.name}" created for "${product.title}" (${campaign.kind}, ${campaign.creator_commission_pct}% commission, ${campaign.customer_discount_pct}% off)`);
  } else log(`bootstrap: campaign "${campaign.name}" already exists`);
  campaign = q.campaignById.get(campaign.id);
  out.campaignUrl = `${config.appUrl}/campaigns/${campaign.id}`;

  if (!campaign.brief) {
    try { const b = await loop.brief(campaign.id); log(`bootstrap: brief generated (${b.compliance.status})`); }
    catch (e) { log(`bootstrap: brief failed: ${e.message}`); }
  }

  campaign = loop.publishCampaign(campaign.id, { isPublic: true, terms: spec.terms });
  out.joinUrl = `${config.appUrl}/join/${campaign.public_slug}`;
  log(`bootstrap: programme open → ${out.joinUrl}`);
  if (spec.only) {
    for (const other of q.campaignsByStore.all(store.id)) if (other.id !== campaign.id && other.is_public) { loop.publishCampaign(other.id, { isPublic: false }); log(`bootstrap: closed programme "${other.name}" (only one open at a time)`); }
  }

  if (spec.test_creator) {
    try {
      const r = await loop.joinProgramme(q.campaignBySlug.get(campaign.public_slug), {
        display_name: 'Test Creator', platform: 'tiktok', handle: spec.test_creator, email: config.ownerEmail || 'test@example.com', agree: 'on',
      });
      out.portalUrl = `${config.appUrl}/c/${r.token}`;
      const cc = q.portalByToken.get(r.token);
      log(`bootstrap: test creator @${spec.test_creator} → ${out.portalUrl} · code ${cc.discount_code || 'PENDING: ' + r.codeError}`);
    } catch (e) { log(`bootstrap: test creator failed: ${e.message}`); }
  }
  return out;
}

function parseSpec(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { console.error(`BOOTSTRAP_PROGRAMME is not valid JSON: ${e.message}`); return null; }
}

module.exports = { bootstrapProgramme, parseSpec };
