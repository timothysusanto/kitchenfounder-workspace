'use strict';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, body, flash, user, opts = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Creator Engine</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--line:#dfe3ea;--ink:#0f1218;--ink2:#4b5263;--ink3:#7a8194;--accent:#2a78d6;--good:#0a7a0a;--warn:#a86f00;--bad:#b52f2f}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:20px 16px 60px}nav{display:flex;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);margin-bottom:18px}
nav a{color:var(--ink2);text-decoration:none;font-weight:600}nav a.brand{color:var(--ink);font-weight:800}
h1{font-size:24px;margin:0 0 10px}h2{font-size:18px;margin:22px 0 8px}p{margin:0 0 10px}.muted{color:var(--ink3);font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:12px;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)}
.btn{display:inline-block;background:var(--accent);color:#fff;border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;text-decoration:none}.btn.secondary{background:#fff;color:var(--ink);border:1px solid var(--line)}.btn.bad{background:var(--bad)}.btn.good{background:var(--good)}
input[type=text],input[type=password],input[type=number],select,textarea{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px}input[type=text],input[type=password]{min-width:280px}textarea{width:100%;min-height:90px}.num{text-align:right;white-space:nowrap}
.pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid}.pass{color:var(--good);border-color:var(--good)}.review{color:var(--warn);border-color:var(--warn)}.fail{color:var(--bad);border-color:var(--bad)}.pending,.processing,.queued{color:var(--ink3);border-color:var(--ink3)}.completed{color:var(--good);border-color:var(--good)}.failed{color:var(--bad);border-color:var(--bad)}
.flash{background:#eef6ff;border:1px solid #b7d3f6;border-radius:8px;padding:10px 12px;margin-bottom:12px}.flash.err{background:#fff0f0;border-color:#f3b4b4}
pre{white-space:pre-wrap;font-size:12px;color:var(--ink2);margin:4px 0 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}video{width:100%;max-height:520px;background:#000;border-radius:8px}
form.inline{display:inline}
</style></head><body><div class="wrap">
${opts.minimal ? '' : `<nav><a class="brand" href="/">Creator Engine</a>${user ? `<a href="/">Stores</a>${user.role === 'owner' ? '<a href="/review">Hook tests</a><a href="/settings">Settings</a>' : ''}<span style="flex:1"></span><span class="muted">${esc(user.email)}</span><form class="inline" method="post" action="/logout"><button class="btn secondary" style="padding:4px 10px">Log out</button></form>` : ''}</nav>`}
${flash ? `<div class="flash ${flash.type === 'error' ? 'err' : ''}">${esc(flash.text)}</div>` : ''}
${body}
</div></body></html>`;
}

function dashboard({ stores, stats, user }) {
  const rows = stores.map((s) => `<tr><td><a href="/stores/${s.id}">${esc(s.shop)}</a><div class="muted">${esc(s.market || 'AU')}</div></td><td>${esc(s.last_sync_at || 'never')}</td>
    <td><a class="btn" href="/stores/${s.id}/creators">Creators</a> <a class="btn secondary" href="/stores/${s.id}/campaigns">Campaigns</a> <a class="btn secondary" href="/stores/${s.id}/report">Report</a></td></tr>`).join('');
  return `<h1>${user && user.brand_name ? esc(user.brand_name) : 'Stores'}</h1><p class="muted">Find creators → open a programme or seed them → every order matched by code and link → pay on results → put money behind the winners.</p>
<div class="card"><form method="get" action="/auth/shopify"><label>Connect a Shopify store<br><input type="text" name="shop" placeholder="your-store.myshopify.com" required></label> <button class="btn">Connect</button></form>
<p class="muted">You will be sent to Shopify to approve read access to products and orders, and permission to create discount codes. The store owner has to click approve.</p></div>
<div class="card"><table><thead><tr><th>Store</th><th>Last product sync</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="muted">No stores yet.</td></tr>'}</tbody></table></div>
${stats && stats.length ? `<div class="card"><b>Hook-test review queue</b> · ${stats.map((s) => `${esc(s.review_status)}: ${s.n}`).join(' · ')}</div>` : ''}`;
}

function storePage({ store, products, campaigns = [], appUrl = '' }) {
  const open = campaigns.filter((c) => c.is_public);
  const rows = products.map((p) => `<tr><td>${p.image_url ? `<img src="${esc(p.image_url)}" alt="" width="48" style="border-radius:6px">` : ''}</td>
    <td><a href="/products/${p.id}">${esc(p.title)}</a><div class="muted">${esc(p.price || '')} ${esc(p.currency || '')}</div></td>
    <td>${p.script_count}</td>
    <td><form class="inline" method="post" action="/products/${p.id}/scripts"><button class="btn ${p.script_count ? 'secondary' : ''}">${p.script_count ? 'Regenerate 20 scripts' : 'Generate 20 scripts'}</button></form></td></tr>`).join('');
  return `<h1>${esc(store.shop)}</h1><p class="muted">${products.length} products · last sync ${esc(store.last_sync_at || 'never')} · <form class="inline" method="post" action="/stores/${store.id}/sync"><button class="btn secondary">Sync now</button></form></p>
<div class="card"><b>Creator-sales loop</b> · market <form class="inline" method="post" action="/stores/${store.id}/market"><select name="market"><option ${store.market === 'AU' ? 'selected' : ''}>AU</option><option ${store.market === 'US' ? 'selected' : ''}>US</option></select> <button class="btn secondary">Set</button></form>
 <div style="margin-top:8px"><a class="btn" href="/stores/${store.id}/creators">1 · Find creators</a> <a class="btn" href="/stores/${store.id}/campaigns">2 · Campaigns &amp; programme</a> <a class="btn" href="/stores/${store.id}/report">3 · Sales &amp; payouts</a></div>
 <p class="muted" style="margin-top:8px">Real-time order tracking: ${store.webhook_id ? '<span class="pill pass">on</span>' : '<span class="pill review">off</span>'} <form class="inline" method="post" action="/stores/${store.id}/webhook"><button class="btn secondary" style="padding:3px 10px">${store.webhook_id ? 'Re-check' : 'Turn on'}</button></form> · last order sync ${esc(store.last_order_sync_at || 'never')} · orders also sync automatically every hour.</p>
 ${open.length ? `<p><b>Open programme links</b> (share these with creators):<br>${open.map((c) => `<a href="${esc(appUrl)}/join/${esc(c.public_slug)}">${esc(appUrl)}/join/${esc(c.public_slug)}</a> — ${esc(c.name)}`).join('<br>')}</p>` : ''}
 <p class="muted" style="margin-top:8px">${store.market === 'US' ? 'US: TikTok Shop affiliate + Instagram affiliate tags + Collabs network + Spark/Partnership ads. Needs a US entity for TikTok Shop.' : 'AU: no TikTok Shop yet. Gifted/paid seeding with per-creator codes and links, then Spark/Partnership ads on the winners.'}</p></div>
<h2>Products (AI hook tests)</h2><p class="muted">Optional: AI-presenter videos for testing hooks before a human re-shoots the winner. Not a substitute for creator posts.</p>
<div class="card"><table><thead><tr><th></th><th>Product</th><th>Scripts</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">No products. Click Sync now.</td></tr>'}</tbody></table></div>`;
}

function productPage({ product, scripts }) {
  const rows = scripts.map((s) => `<tr>
    <td>${s.idx}<div class="muted">${esc(s.angle)}</div></td>
    <td><b>${esc(s.hook)}</b><div>${esc(s.body)}</div><div class="muted">CTA: ${esc(s.cta)} · On screen: ${esc(s.on_screen_text)}</div><div class="muted">Caption: ${esc(s.caption)}</div></td>
    <td><span class="pill ${esc(s.compliance_status)}">${esc(s.compliance_status)}</span>${s.compliance_notes ? `<pre>${esc(s.compliance_notes)}</pre>` : ''}</td>
    <td>${s.video_id ? `<span class="pill ${esc(s.video_status)}">${esc(s.video_status)}</span>${s.video_url ? `<div><a href="${esc(s.video_url)}" target="_blank" rel="noopener">open</a></div>` : ''}<div class="muted">${esc(s.review_status || '')}</div>`
      : (s.compliance_status === 'fail' ? '<span class="muted">fix script first</span>' : `<form class="inline" method="post" action="/scripts/${s.id}/render"><button class="btn">Render</button></form>`)}</td>
  </tr>`).join('');
  const renderable = scripts.filter((s) => s.compliance_status !== 'fail' && !s.video_id).length;
  return `<h1>${esc(product.title)}</h1><p class="muted"><a href="/stores/${product.store_id}">← back to store</a> · ${scripts.length} scripts · ${renderable} ready to render</p>
<div class="card"><form class="inline" method="post" action="/products/${product.id}/scripts"><button class="btn secondary">Regenerate 20 scripts</button></form>
${renderable ? ` <form class="inline" method="post" action="/products/${product.id}/render-all"><button class="btn">Render all ${renderable} passing scripts</button></form>` : ''}
 <form class="inline" method="post" action="/videos/poll"><button class="btn secondary">Check render status</button></form>
<p class="muted" style="margin-top:8px">pass = ready · review = a claim needs evidence, read the note · fail = fake-customer framing or missing disclosure, regenerate or edit</p></div>
<div class="card"><table><thead><tr><th>#</th><th>Script</th><th>Compliance</th><th>Video</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">No scripts yet.</td></tr>'}</tbody></table></div>`;
}

function reviewPage({ items }) {
  const cards = items.map((v) => `<div class="card">
    <div class="muted">#${v.id} · ${esc(v.product_title)} · ${v.duration ? `${Math.round(v.duration)}s` : ''} · compliance <span class="pill ${esc(v.compliance_status)}">${esc(v.compliance_status)}</span></div>
    ${v.local_path ? `<video controls preload="metadata" src="/videos/${v.id}/file"></video>` : (v.video_url ? `<video controls preload="metadata" src="${esc(v.video_url)}"></video>` : '<p class="muted">file not available</p>')}
    <p><b>${esc(v.hook)}</b></p><p class="muted">${esc(v.caption)}</p>${v.compliance_notes ? `<pre>${esc(v.compliance_notes)}</pre>` : ''}
    <form class="inline" method="post" action="/videos/${v.id}/approve"><button class="btn good">Approve</button></form>
    <form class="inline" method="post" action="/videos/${v.id}/reject"><input type="text" name="note" placeholder="why (optional)" style="min-width:160px"> <button class="btn bad">Reject</button></form>
  </div>`).join('');
  return `<h1>Review queue</h1><p class="muted">Approve only if: the presenter never poses as a customer, every claim is true, the AI label is visible. <form class="inline" method="post" action="/videos/poll"><button class="btn secondary">Check render status</button></form></p>
<div class="grid">${cards || '<div class="card muted">Nothing waiting. Render some scripts, then click Check render status.</div>'}</div>`;
}

function settingsPage({ config, ffmpeg }) {
  const row = (k, v) => `<tr><td>${esc(k)}</td><td>${v ? '<span class="pill pass">set</span>' : '<span class="pill fail">missing</span>'}</td></tr>`;
  return `<h1>Settings</h1><div class="card"><table><tbody>
<tr><td>Shopify store (SHOPIFY_SHOP + SHOPIFY_ACCESS_TOKEN)</td><td>${config.shopify.shop && config.shopify.accessToken ? `<span class="pill pass">set</span> ${esc(config.shopify.shop)}` : '<span class="pill review">not set — easiest option: custom-app token from your store admin</span>'}</td></tr>
${row('SHOPIFY_CLIENT_ID (only for OAuth / multi-store)', config.shopify.clientId)}${row('SHOPIFY_CLIENT_SECRET (only for OAuth / multi-store)', config.shopify.clientSecret)}${row('ANTHROPIC_API_KEY', config.anthropic.apiKey)}${row('APIFY_TOKEN (creator discovery)', config.apify.token)}${row('HEYGEN_API_KEY (optional, hook tests)', config.heygen.apiKey)}
<tr><td>APP_URL</td><td>${esc(config.appUrl)}</td></tr><tr><td>Default market</td><td>${esc(config.defaultMarket)}</td></tr><tr><td>Shopify API version</td><td>${esc(config.shopify.apiVersion)}</td></tr><tr><td>Claude model</td><td>${esc(config.anthropic.model)}</td></tr>
<tr><td>HeyGen avatar / voice</td><td>${esc(config.heygen.avatarId || 'first available')} / ${esc(config.heygen.voiceId || 'first English voice')}</td></tr>
<tr><td>Brand</td><td>${esc(config.brand.name)} — ${esc(config.brand.voice)}</td></tr><tr><td>Disclosure line</td><td>${esc(config.brand.disclosure)}</td></tr>
<tr><td>FFmpeg (burns the AI label into files)</td><td>${ffmpeg ? '<span class="pill pass">found</span>' : '<span class="pill review">not found, label step skipped</span>'}</td></tr>
</tbody></table><p class="muted">Values come from the .env file (or Railway variables). Secrets are never shown here.</p></div>`;
}

module.exports = { layout, dashboard, storePage, productPage, reviewPage, settingsPage, esc };
