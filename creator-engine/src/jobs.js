'use strict';
/** Orchestration: the three pipeline steps as plain functions the web routes and the CLI both call. */
const { db, q } = require('./db');
const config = require('./config');
const shopify = require('./shopify');
const { generateScripts, spokenText } = require('./scripts');
const heygen = require('./heygen');
const { finaliseVideo } = require('./render');

async function syncStore(storeId) {
  const store = q.storeById.get(storeId);
  if (!store) throw new Error('store not found');
  const rows = await shopify.fetchAllProducts(store.shop, store.access_token);
  const tx = db.transaction((items) => {
    for (const r of items) q.upsertProduct.run({ store_id: store.id, ...r });
    q.touchSync.run(store.id);
  });
  tx(rows);
  return rows.length;
}

async function scriptsForProduct(productId, count = 20) {
  const product = q.productById.get(productId);
  if (!product) throw new Error('product not found');
  const scripts = await generateScripts(product, { count });
  const tx = db.transaction((items) => {
    q.deleteScriptsForProduct.run(product.id);
    for (const s of items) {
      q.insertScript.run({
        product_id: product.id,
        idx: s.idx,
        angle: s.angle,
        hook: s.hook,
        body: s.body,
        cta: s.cta,
        on_screen_text: s.on_screen_text,
        caption: s.caption,
        claims_json: JSON.stringify(s.claims || []),
        compliance_status: s.compliance.status,
        compliance_notes: s.compliance.notes.join('\n'),
      });
    }
  });
  tx(scripts);
  return scripts;
}

/** Queue a HeyGen render for one script. Refuses scripts that failed compliance. */
async function renderScript(scriptId) {
  const script = q.scriptById.get(scriptId);
  if (!script) throw new Error('script not found');
  if (script.compliance_status === 'fail') throw new Error('script failed compliance; fix the script before rendering');
  const existing = q.videoByScript.get(script.id);
  if (existing && ['queued', 'pending', 'processing', 'waiting', 'completed'].includes(existing.status)) return existing;

  const { avatarId, voiceId } = await heygen.resolveDefaults();
  const product = q.productById.get(script.product_id);
  const providerId = await heygen.generateVideo({
    text: spokenText(script),
    title: `${product.title} #${script.idx} ${script.angle}`.slice(0, 80),
    avatarId,
    voiceId,
  });
  const info = q.insertVideo.run({ script_id: script.id, provider: 'heygen', provider_video_id: providerId, status: 'processing' });
  return q.videoById.get(info.lastInsertRowid);
}

/** Poll every in-flight render; download and label the finished ones. Returns a summary. */
async function pollVideos() {
  const inflight = q.videosProcessing.all();
  const summary = { checked: inflight.length, completed: 0, failed: 0, still_processing: 0 };
  for (const v of inflight) {
    let st;
    try {
      st = await heygen.getStatus(v.provider_video_id);
    } catch (e) {
      q.updateVideoStatus.run({ id: v.id, status: v.status, video_url: null, thumbnail_url: null, duration: null, error: String(e.message).slice(0, 500) });
      continue;
    }
    if (st.status === 'completed') {
      q.updateVideoStatus.run({ id: v.id, status: 'completed', video_url: st.video_url, thumbnail_url: st.thumbnail_url || null, duration: st.duration || null, error: null });
      try {
        const { localPath } = await finaliseVideo({ id: v.id, video_url: st.video_url }, 'AI presenter');
        q.setVideoLocal.run(localPath, v.id);
      } catch (e) {
        q.updateVideoStatus.run({ id: v.id, status: 'completed', video_url: null, thumbnail_url: null, duration: null, error: `post-process: ${String(e.message).slice(0, 300)}` });
      }
      summary.completed++;
    } else if (st.status === 'failed') {
      q.updateVideoStatus.run({ id: v.id, status: 'failed', video_url: null, thumbnail_url: null, duration: null, error: JSON.stringify(st.error || 'failed').slice(0, 500) });
      summary.failed++;
    } else {
      q.updateVideoStatus.run({ id: v.id, status: st.status || 'processing', video_url: null, thumbnail_url: null, duration: null, error: null });
      summary.still_processing++;
    }
  }
  return summary;
}

module.exports = { syncStore, scriptsForProduct, renderScript, pollVideos, config };
