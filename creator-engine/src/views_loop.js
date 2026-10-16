'use strict';
const { esc } = require('./views');
const money = (v, cur = '') => (v === null || v === undefined ? '—' : `${cur ? cur + ' ' : '$'}${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}%`);
const STATUSES = ['shortlisted', 'invited', 'agreed', 'shipped', 'posted', 'amplified', 'declined'];

function creatorsPage({ store, creators, seeds, products = [] }) {
  const rows = creators.map((c) => `<tr>
    <td><input type="checkbox" name="creator_ids" value="${c.id}" form="addform"></td>
    <td><a href="${esc(c.profile_url)}" target="_blank" rel="noopener">@${esc(c.handle)}</a><div class="muted">${esc(c.platform)} · ${esc(c.tier)} · ${esc(c.status)}</div></td>
    <td class="num">${Number(c.followers).toLocaleString()}</td>
    <td class="num">${Number(c.median_plays).toLocaleString()}</td>
    <td class="num">${pct(c.engagement_pct)}</td>
    <td><b>${c.score}</b><div class="muted" style="max-width:260px">${esc(c.score_notes || '')}</div></td>
    <td><div class="muted" style="max-width:260px">${esc(c.bio || '')}</div>${c.shop_tagged_posts ? `<span class="pill pass">TikTok Shop</span>` : ''}</td>
  </tr>`).join('');
  const seedHtml = Object.entries(seeds).map(([niche, tags]) => `<div class="muted"><b>${esc(niche)}</b>: ${tags.map((t) => '#' + esc(t)).join(' ')}</div>`).join('');
  return `<h1>Creators · ${esc(store.shop)}</h1><p class="muted"><a href="/stores/${store.id}">← store</a> · market <b>${esc(store.market)}</b> · ${creators.length} creators found</p>
<div class="card"><form method="post" action="/stores/${store.id}/discover">
 <label>Platform <select name="platform"><option value="tiktok">TikTok</option><option value="instagram">Instagram</option></select></label>
 <label> Hashtags (comma separated) <input type="text" name="hashtags" placeholder="sydneyfoodie, homecookau" required style="min-width:340px"></label>
 <label> Posts per hashtag <input type="number" name="perTag" value="60" min="10" max="300" style="width:80px"></label>
 <button class="btn">Discover</button></form>
 <p class="muted" style="margin-top:8px">Costs about US$0.003 per post via Apify. 60 posts × 3 hashtags ≈ 50 cents and 24 seconds. Starting points for ${esc(store.market)}:</p>${seedHtml}</div>
<div class="card"><form id="addform" method="post" action="/stores/${store.id}/campaigns/add-creators">
 <b>Step 2 · Put ticked creators into a campaign</b>
 <div style="margin-top:8px">
 ${(store.campaigns || []).length ? `<label>Existing campaign <select name="campaign_id"><option value="">— new campaign (below) —</option>${store.campaigns.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label> <span class="muted">or</span> ` : ''}
 <label>New campaign name <input type="text" name="name" placeholder="Nov seeding – Chilli Oil" style="min-width:220px"></label>
 <label> Product <select name="product_id">${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></label>
 <label> Type <select name="kind"><option value="gifted">Gifted product</option><option value="paid">Paid per post</option><option value="affiliate">Affiliate commission</option></select></label>
 <label> Customer discount % <input type="number" name="customer_discount_pct" value="10" style="width:60px"></label>
 <label> Sample cost $ <input type="number" name="sample_cost" value="30" style="width:70px"></label>
 <button class="btn">Add to campaign</button>
 </div>
 <p class="muted" style="margin-top:6px">Tick creators in the table, then click. A new campaign is created if you leave "Existing campaign" empty. Fees, commission and the brief are set on the campaign page next. ${products.length ? '' : '<b>No products synced yet — open the store page and click Sync products first.</b>'}</p></form>
<table style="margin-top:10px"><thead><tr><th></th><th>Creator</th><th>Followers</th><th>Median plays</th><th>Engagement</th><th>Score /100</th><th>Bio</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">No creators yet. Run Discover.</td></tr>'}</tbody></table></div>`;
}

function campaignsPage({ store, campaigns, products }) {
  const rows = campaigns.map((c) => `<tr><td><a href="/campaigns/${c.id}">${esc(c.name)}</a><div class="muted">${esc(c.product_title || 'no product')}</div></td><td>${esc(c.market)}</td><td>${esc(c.kind)}</td><td class="num">${c.creator_count}</td><td><span class="pill ${esc(c.compliance_status)}">${esc(c.compliance_status)}</span></td><td>${esc(c.status)}</td></tr>`).join('');
  return `<h1>Campaigns · ${esc(store.shop)}</h1><p class="muted"><a href="/stores/${store.id}">← store</a></p>
<div class="card"><form method="post" action="/stores/${store.id}/campaigns">
 <label>Name <input type="text" name="name" placeholder="Nov seeding – Chilli Oil" required></label>
 <label> Product <select name="product_id">${products.map((p) => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></label>
 <label> Market <select name="market"><option value="AU" ${store.market === 'AU' ? 'selected' : ''}>AU</option><option value="US" ${store.market === 'US' ? 'selected' : ''}>US</option></select></label>
 <label> Type <select name="kind"><option value="gifted">Gifted product</option><option value="paid">Paid per post</option><option value="affiliate">Affiliate commission</option></select></label><br>
 <label>Customer discount % <input type="number" name="customer_discount_pct" value="10" style="width:70px"></label>
 <label> Creator commission % <input type="number" name="creator_commission_pct" value="10" style="width:70px"></label>
 <label> Fee per post $ <input type="number" name="fee_per_post" value="0" style="width:90px"></label>
 <label> Landed sample cost $ <input type="number" name="sample_cost" value="30" style="width:90px"></label>
 <button class="btn">Create campaign</button></form></div>
<div class="card"><table><thead><tr><th>Campaign</th><th>Market</th><th>Type</th><th>Creators</th><th>Brief</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="muted">No campaigns yet.</td></tr>'}</tbody></table></div>`;
}

function campaignPage({ campaign, creators, disclosure }) {
  const rows = creators.map((cc) => `<tr><form method="post" action="/campaign-creators/${cc.id}">
    <td><a href="${esc(cc.profile_url)}" target="_blank" rel="noopener">@${esc(cc.handle)}</a><div class="muted">${esc(cc.platform)} · ${esc(cc.tier)} · ${Number(cc.followers).toLocaleString()} · ER ${pct(cc.engagement_pct)}</div></td>
    <td><select name="status">${STATUSES.map((s) => `<option ${cc.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td>${cc.discount_code ? `<b>${esc(cc.discount_code)}</b><div class="muted"><a href="${esc(cc.utm_link || '#')}" target="_blank" rel="noopener" title="${esc(cc.utm_link || '')}">tracked link</a></div>` : '<span class="muted">not issued</span>'}</td>
    <td><input type="text" name="post_url" value="${esc(cc.post_url || '')}" placeholder="post URL" style="min-width:150px"></td>
    <td><input type="number" name="fee_paid" value="${cc.fee_paid || 0}" style="width:70px"> <label class="muted"><input type="checkbox" name="usage_rights" ${cc.usage_rights ? 'checked' : ''}> rights</label> <input type="number" name="usage_rights_fee" value="${cc.usage_rights_fee || 0}" style="width:70px" title="usage rights fee"></td>
    <td><select name="ad_platform"><option value="">none</option><option ${cc.ad_platform === 'tiktok_spark' ? 'selected' : ''} value="tiktok_spark">TikTok Spark</option><option ${cc.ad_platform === 'meta_partnership' ? 'selected' : ''} value="meta_partnership">Meta Partnership</option></select> <input type="text" name="ad_auth_code" value="${esc(cc.ad_auth_code || '')}" placeholder="auth code" style="width:110px"> <input type="number" name="ad_spend" value="${cc.ad_spend || 0}" style="width:80px" title="ad spend"></td>
    <td class="num"><b>${cc.orders}</b><div class="muted">${money(cc.revenue)}</div></td>
    <td><input type="text" name="notes" value="${esc(cc.notes || '')}" style="min-width:120px"><button class="btn secondary" style="margin-top:4px">Save</button></td>
  </form></tr>`).join('');
  return `<h1>${esc(campaign.name)}</h1><p class="muted"><a href="/stores/${campaign.store_id}/campaigns">← campaigns</a> · ${esc(campaign.market)} · ${esc(campaign.kind)} · ${esc(campaign.product_title || 'no product')} · customer code ${campaign.customer_discount_pct}% off${campaign.kind === 'affiliate' ? ` · creator commission ${campaign.creator_commission_pct}%` : ''}</p>
<div class="card"><b>Brief</b> <span class="pill ${esc(campaign.compliance_status)}">${esc(campaign.compliance_status)}</span>
 <form class="inline" method="post" action="/campaigns/${campaign.id}/brief"><button class="btn secondary">${campaign.brief ? 'Regenerate brief' : 'Generate brief'}</button></form>
 ${campaign.compliance_notes ? `<pre>${esc(campaign.compliance_notes)}</pre>` : ''}
 ${campaign.brief ? `<pre style="font-size:13px;color:var(--ink)">${esc(campaign.brief)}</pre><p class="muted">Caption template: ${esc(campaign.caption_template || '')}</p>` : `<p class="muted">The brief is what you send with the product. Disclosure rule for ${esc(campaign.market)}: ${esc(disclosure)}</p>`}</div>
<div class="card"><form class="inline" method="post" action="/campaigns/${campaign.id}/issue"><button class="btn" ${campaign.compliance_status === 'fail' ? 'disabled' : ''}>Issue codes + links for all creators</button></form>
 <form class="inline" method="post" action="/stores/${campaign.store_id}/sync-orders"><button class="btn secondary">Sync Shopify orders (60 days)</button></form>
 <a class="btn secondary" href="/stores/${campaign.store_id}/creators">Add creators</a>
 <p class="muted" style="margin-top:8px">Pipeline: shortlisted → invited → agreed → shipped → posted → amplified. Tick "rights" and record the fee when you buy usage rights; put the Spark / Partnership auth code and spend when you run their post as an ad.</p>
 <table><thead><tr><th>Creator</th><th>Status</th><th>Code + link</th><th>Post</th><th>Fee / rights</th><th>Amplification</th><th>Orders</th><th>Notes</th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="muted">No creators in this campaign yet.</td></tr>'}</tbody></table></div>`;
}

function reportPage({ store, r }) {
  const rows = r.rows.map((x) => `<tr><td>@${esc(x.handle)}<div class="muted">${esc(x.campaign_name)} · ${esc(x.platform)} · ${esc(x.tier)}</div></td><td>${esc(x.status)}${x.post_url ? ` · <a href="${esc(x.post_url)}" target="_blank" rel="noopener">post</a>` : ''}</td><td>${esc(x.discount_code || '')}</td><td class="num">${money(x.spend)}</td><td class="num">${x.orders}</td><td class="num">${money(x.revenue)}</td><td class="num">${x.cac === null ? '—' : money(x.cac)}</td><td class="num">${x.roas === null ? '—' : x.roas.toFixed(1) + '×'}</td></tr>`).join('');
  const winners = r.winners.map((w) => `<li>@${esc(w.handle)} — ${w.orders} orders, ${money(w.revenue)} revenue, ROAS ${w.roas.toFixed(1)}× ${w.usage_rights ? '' : '· <b>buy usage rights and run as a Spark / Partnership ad</b>'}</li>`).join('');
  return `<h1>Report · ${esc(store.shop)}</h1><p class="muted"><a href="/stores/${store.id}">← store</a> · <form class="inline" method="post" action="/stores/${store.id}/sync-orders"><button class="btn secondary">Sync Shopify orders</button></form> <a class="btn secondary" href="/stores/${store.id}/report.csv">Download CSV</a></p>
<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
 <div class="card"><div class="muted">Creators posted</div><b style="font-size:22px">${r.posted}</b></div>
 <div class="card"><div class="muted">Attributed orders</div><b style="font-size:22px">${r.attributedOrders}</b><div class="muted">of ${r.totals.n} orders synced</div></div>
 <div class="card"><div class="muted">Attributed revenue</div><b style="font-size:22px">${money(r.attributedRevenue)}</b><div class="muted">of ${money(r.totals.revenue)} total</div></div>
 <div class="card"><div class="muted">Creator spend</div><b style="font-size:22px">${money(r.spend)}</b></div>
 <div class="card"><div class="muted">Blended CAC</div><b style="font-size:22px">${r.blendedCac === null ? '—' : money(r.blendedCac)}</b></div>
 <div class="card"><div class="muted">Blended ROAS</div><b style="font-size:22px">${r.blendedRoas === null ? '—' : r.blendedRoas.toFixed(1) + '×'}</b></div>
</div>
<div class="card"><b>Winners to amplify</b> (2+ orders and ROAS ≥ 2×)<ul>${winners || '<li class="muted">None yet. Winners appear once orders are attributed.</li>'}</ul></div>
<div class="card"><table><thead><tr><th>Creator</th><th>Status</th><th>Code</th><th>Spend</th><th>Orders</th><th>Revenue</th><th>CAC</th><th>ROAS</th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="muted">Nothing to report yet.</td></tr>'}</tbody></table></div>`;
}

module.exports = { creatorsPage, campaignsPage, campaignPage, reportPage, STATUSES };
