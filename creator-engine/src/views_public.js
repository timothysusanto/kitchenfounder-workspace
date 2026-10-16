'use strict';
const { esc } = require('./views');

const money = (n, cur = '') => `${cur ? cur + ' ' : '$'}${Number(n || 0).toFixed(2)}`;

function authPage({ mode, error, next, brandSignup }) {
  const titles = { login: 'Log in', setup: 'Create the owner account', signup: 'Create your brand account' };
  const blurb = {
    login: 'Creator Engine for Shopify brands.',
    setup: 'This is the first account on this engine. It becomes the owner: it sees every connected store. Do this once.',
    signup: 'Connect your Shopify store, open a creator programme, and pay creators only on tracked orders.',
  };
  return `<div style="max-width:420px;margin:40px auto"><h1>${esc(titles[mode])}</h1><p class="muted">${esc(blurb[mode])}</p>
${error ? `<div class="flash err">${esc(error)}</div>` : ''}
<div class="card"><form method="post" action="/${mode}${next ? `?next=${encodeURIComponent(next)}` : ''}">
 ${mode === 'signup' ? '<label>Brand name<br><input type="text" name="brand_name" placeholder="Kitchen Founder" required></label><br><br>' : ''}
 <label>Email<br><input type="text" name="email" placeholder="you@brand.com" autocomplete="email" required></label><br><br>
 <label>Password<br><input type="password" name="password" minlength="8" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required style="font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;min-width:280px"></label><br><br>
 <button class="btn">${esc(titles[mode])}</button></form>
 <p class="muted" style="margin-top:10px">${mode === 'login' ? (brandSignup ? 'New brand? <a href="/signup">Create an account</a>.' : '') : 'Already have an account? <a href="/login">Log in</a>.'}</p></div></div>`;
}

/** Public programme page a creator lands on. No login. */
function joinPage({ campaign, error, values = {} }) {
  const brand = campaign.store_brand || campaign.shop.replace('.myshopify.com', '');
  const sub = campaign.is_subscription ? ` every ${campaign.billing_interval || 'month'} for as long as they stay a member` : '';
  const step = campaign.commission_months && campaign.creator_commission_after_pct !== null && campaign.creator_commission_after_pct !== undefined
    ? ` for each member's first ${campaign.commission_months} months, then <b>${campaign.creator_commission_after_pct}%</b>` : '';
  const pay = campaign.kind === 'affiliate'
    ? `<b>${campaign.creator_commission_pct}% commission</b> on every order that uses your code or link${sub}${step}`
    : campaign.kind === 'paid' ? `<b>${money(campaign.fee_per_post)}</b> per post, plus your own discount code` : '<b>Free product</b> plus your own discount code';
  const price = campaign.product_price ? ` · ${money(campaign.product_price, campaign.product_currency)}${campaign.is_subscription ? `/${campaign.billing_interval || 'month'}` : ''}` : '';
  const per = campaign.product_price ? Number(campaign.product_price) * campaign.creator_commission_pct / 100 : 0;
  const perSale = campaign.kind === 'affiliate' && campaign.product_price
    ? (campaign.is_subscription
      ? ` That is <b>${money(per, campaign.product_currency)} per member, every ${campaign.billing_interval || 'month'}</b>: 100 members who stay a year is about ${money(per * 100 * Math.min(12, campaign.commission_months || 12), campaign.product_currency)} to you.`
      : ` That is about <b>${money(per, campaign.product_currency)} per sale</b>.`) : '';
  return `<div style="max-width:640px;margin:20px auto">
<h1>${esc(brand)} creator programme</h1>
<p class="muted">${esc(campaign.name)}${campaign.market ? ` · ${esc(campaign.market)}` : ''}</p>
<div class="card">${campaign.product_image ? `<img src="${esc(campaign.product_image)}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:8px;margin-bottom:10px">` : ''}
 <h2 style="margin-top:0">${esc(campaign.product_title || 'The product')}${price}</h2>
 <p>${pay}.${perSale} Your audience gets <b>${campaign.customer_discount_pct}% off</b> with your code.</p>
 <p>You get your code and tracked link <b>instantly</b> after you apply. Every order is matched to you automatically. You can check your sales any time on your own page.</p>
 ${campaign.terms ? `<pre>${esc(campaign.terms)}</pre>` : ''}
 <p class="muted">Rules: say it's a paid partnership in the video and put #ad in the caption (${campaign.market === 'US' ? 'FTC Endorsement Guides' : 'AANA Code of Ethics s2.7 / Australian Consumer Law'}). Share your honest experience; you are never asked to say anything you don't believe.</p>
</div>
${error ? `<div class="flash err">${esc(error)}</div>` : ''}
<div class="card"><form method="post" action="/join/${esc(campaign.public_slug)}">
 <label>Your name<br><input type="text" name="display_name" value="${esc(values.display_name || '')}" required></label><br><br>
 <label>Platform <select name="platform"><option value="tiktok" ${values.platform === 'tiktok' ? 'selected' : ''}>TikTok</option><option value="instagram" ${values.platform === 'instagram' ? 'selected' : ''}>Instagram</option><option value="youtube" ${values.platform === 'youtube' ? 'selected' : ''}>YouTube</option></select></label>
 <label> Handle <input type="text" name="handle" value="${esc(values.handle || '')}" placeholder="yourhandle (no @)" required style="min-width:200px"></label><br><br>
 <label>Email<br><input type="text" name="email" value="${esc(values.email || '')}" placeholder="you@email.com" required></label><br><br>
 <label>PayPal email for payouts (optional)<br><input type="text" name="payout_email" value="${esc(values.payout_email || '')}" placeholder="same as above if blank"></label><br><br>
 <label><input type="checkbox" name="agree" required> I will disclose the partnership (#ad) and share my honest experience.</label><br><br>
 <button class="btn">Get my code and link</button></form></div></div>`;
}

/** The creator's own page: code, link, sales, commission. Reached by secret token. */
function portalPage({ cc, orders, commission: commissionIn }) {
  const brand = cc.store_brand || cc.shop.replace('.myshopify.com', '');
  const commission = commissionIn !== undefined ? commissionIn : (cc.kind === 'affiliate' ? Number(cc.revenue) * Number(cc.creator_commission_pct) / 100 : 0);
  const owed = Math.max(0, commission - Number(cc.commission_paid || 0));
  const rows = orders.map((o) => `<tr><td>${esc(o.order_name || '')}</td><td>${esc(String(o.created_at || '').slice(0, 10))}</td><td class="num">${money(o.total, o.currency)}</td><td class="muted">${o.match_method === 'customer' ? 'renewal / repeat' : esc(o.match_method || '')}</td></tr>`).join('');
  return `<div style="max-width:640px;margin:20px auto">
<h1>Hi ${esc(cc.display_name || '@' + cc.handle)}</h1>
<p class="muted">${esc(brand)} · ${esc(cc.campaign_name)} · @${esc(cc.handle)} on ${esc(cc.platform)}</p>
<div class="card"><h2 style="margin-top:0">Your code and link</h2>
 ${cc.discount_code ? `<p style="font-size:28px;font-weight:800;letter-spacing:.04em;margin:6px 0">${esc(cc.discount_code)}</p><p class="muted">${cc.customer_discount_pct}% off ${cc.is_subscription ? 'their first ' + (cc.billing_interval || 'month') : ''} for your audience. Say the code in the video and put it in the caption.</p>` : '<p class="pill review">Code is being created — refresh in a minute.</p>'}
 ${cc.utm_link ? `<p><b>Your tracked link</b><br><input type="text" readonly value="${esc(cc.utm_link)}" onclick="this.select()" style="width:100%"></p><p class="muted">Put this in your bio or link sticker. Orders from it are matched to you even without the code.</p>` : ''}
</div>
<div class="card"><h2 style="margin-top:0">Your sales</h2>
 <p><b>${cc.orders}</b> orders · <b>${money(cc.revenue, cc.product_currency)}</b> revenue${cc.kind === 'affiliate' ? ` · <b>${money(commission, cc.product_currency)}</b> earned at ${cc.creator_commission_pct}%${cc.commission_months ? ` (${cc.creator_commission_after_pct}% after ${cc.commission_months} months)` : ''} · paid ${money(cc.commission_paid, cc.product_currency)} · <b>owed ${money(owed, cc.product_currency)}</b>` : ''}</p>
 <table><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Matched by</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">No orders yet. Orders appear here within a minute of checkout.</td></tr>'}</tbody></table>
 <p class="muted" style="margin-top:8px">Payouts go to ${esc(cc.payout_email || cc.email || 'the email you gave')}.</p></div>
${cc.brief ? `<div class="card"><h2 style="margin-top:0">Brief</h2><pre style="color:var(--ink);font-size:13px">${esc(cc.brief)}</pre>${cc.caption_template ? `<p class="muted">Caption to adapt: ${esc(cc.caption_template)}</p>` : ''}</div>` : ''}
<div class="card"><b>Disclosure rule (${esc(cc.market)})</b><p class="muted">Say it is a paid partnership in the first seconds of the video and put #ad in the caption. ${cc.market === 'US' ? 'FTC Endorsement Guides.' : 'AANA Code of Ethics s2.7 and the Australian Consumer Law.'} Share your honest experience.</p>
<p class="muted">Bookmark this page: it is your private link.</p></div></div>`;
}


const CONTACT = () => require('./config').ownerEmail || 'tecknomart@yahoo.com';

function privacyPage() {
  return `<div style="max-width:720px;margin:20px auto"><h1>Privacy policy</h1><p class="muted">Creator Engine, operated by Timothy Susanto (Sydney, Australia). Contact: ${esc(CONTACT())}</p>
<div class="card"><h2 style="margin-top:0">What we collect</h2>
<p><b>Brand accounts:</b> email, brand name, a hashed password, and the Shopify store you connect (its domain and an access token).</p>
<p><b>From your Shopify store:</b> product titles and prices, and for each order: the order number, total, currency, discount codes used, UTM parameters, and Shopify's internal customer ID. We do <b>not</b> store customer names, emails, phone numbers or addresses.</p>
<p><b>Creators:</b> the public handle and public profile statistics we find through public posts, and, if a creator applies to a programme, the name, email and payout email they enter.</p>
<h2>Why</h2><p>To create discount codes and tracked links, match orders to the creator who caused them, and show brands and creators their results and any commission owed.</p>
<h2>Where and who sees it</h2><p>Data is held on Railway-hosted infrastructure in the United States. It is shared only with the processors needed to run the service: Shopify (your own store), Stripe (brand billing), Anthropic (text of campaign briefs is generated by Claude and does not include customer data), and Apify (public social-media data lookups). We do not sell data.</p>
<h2>Your rights and deletion</h2><p>Email ${esc(CONTACT())} to access, correct or delete your data. Uninstalling the app or asking us to close the account deletes your store data. Shopify's customer data requests and redaction requests are handled automatically; because we hold no customer personal details, a customer redaction removes the Shopify customer ID from stored orders.</p>
<h2>Retention</h2><p>Order and creator records are kept while your account is open and deleted when it is closed.</p></div></div>`;
}

function termsPage() {
  return `<div style="max-width:720px;margin:20px auto"><h1>Terms of service</h1><p class="muted">Creator Engine, operated by Timothy Susanto (Sydney, Australia). Contact: ${esc(CONTACT())}</p>
<div class="card"><h2 style="margin-top:0">The service</h2><p>Creator Engine helps Shopify brands find creators, issue discount codes and tracked links, attribute orders, and track commission owed. It does not pay creators; brands pay creators directly.</p>
<h2>Fees</h2><p>After the free trial, a monthly platform fee applies, plus a percentage of revenue from orders attributed to creators through the service, as shown on the Billing page. The performance fee is invoiced monthly. You can cancel any time from the Billing page; cancellation takes effect at the end of the paid period.</p>
<h2>Your responsibilities</h2><p>You are responsible for your creator agreements and for paying creators what they have earned. Creators must disclose paid partnerships as required by law (in Australia the AANA Code of Ethics and Australian Consumer Law; in the United States the FTC Endorsement Guides). The service generates briefs that tell creators to do so; you remain responsible for compliance. Do not use the service for deceptive, unlawful or unsafe promotion.</p>
<h2>Accuracy</h2><p>Attribution relies on discount codes, link parameters and Shopify data, and some orders may not be attributable. Reports are provided as-is.</p>
<h2>Liability</h2><p>To the extent permitted by law, the service is provided without warranties beyond those that cannot be excluded (including under the Australian Consumer Law), and our liability is limited to the fees you paid in the previous three months.</p>
<h2>Changes</h2><p>We may update these terms and will tell account holders by email.</p></div></div>`;
}

function billingPage({ sum, flash }) {
  const a = sum.access;
  const money2 = (n) => `$${Number(n || 0).toFixed(2)}`;
  const status = { exempt: 'Owner account — not billed', active: 'Active subscription', trial: `Free trial — ${a.daysLeft} day${a.daysLeft === 1 ? '' : 's'} left`, expired: 'Trial ended — subscribe to keep using the engine', past_due: 'Payment failed — update your card', none: '' }[a.state];
  const actions = !sum.enabled ? '<p class="muted">Billing is not switched on for this engine yet.</p>'
    : a.state === 'active' || a.state === 'past_due' ? '<form method="post" action="/billing/portal"><button class="btn secondary">Manage subscription</button></form>'
    : a.state === 'exempt' ? '' : '<form method="post" action="/billing/checkout"><button class="btn">Subscribe</button></form>';
  return `<div style="max-width:640px"><h1>Billing</h1><div class="card"><p><b>${esc(status)}</b></p>${actions}</div>
<div class="card"><h2 style="margin-top:0">This month (${esc(sum.month)})</h2>
<p>Revenue from creator-attributed orders: <b>${money2(sum.revenue)}</b> across ${sum.orders} order${sum.orders === 1 ? '' : 's'}.</p>
<p>Performance fee (${sum.performanceFeePct}%): <b>${money2(sum.performanceFee)}</b>, invoiced at month end.</p>
<p class="muted">Creator commissions are paid by you directly to creators and are shown on each campaign page.</p></div></div>`;
}

function setupPage({ store, products, error, values = {} }) {
  const opts = products.map((p) => `<option value="${p.id}" ${String(values.product_id) === String(p.id) ? 'selected' : ''}>${esc(p.title)} — ${esc(p.price || '')} ${esc(p.currency || '')}${p.is_subscription ? ' (subscription)' : ''}</option>`).join('');
  return `<div style="max-width:640px"><h1>Open your creator programme</h1><p class="muted">${esc(store.shop)} · Three questions. Then creators can join from a link you share, get their own code, and every order is tracked.</p>
${error ? `<div class="flash err">${esc(error)}</div>` : ''}
<div class="card"><form method="post" action="/stores/${store.id}/setup">
<p><b>1 · Which product should creators sell?</b><br><select name="product_id" required style="max-width:100%">${opts || '<option value="">No products yet — click Sync now first</option>'}</select></p>
<p><b>2 · What discount does their audience get?</b><br><input type="number" name="discount" min="0" max="50" value="${esc(values.discount ?? 10)}" style="width:80px"> %</p>
<p><b>3 · What commission does the creator earn?</b><br><input type="number" name="commission" min="1" max="60" value="${esc(values.commission ?? 20)}" style="width:80px"> % of each order<br>
<span class="muted">Optional step-down for subscriptions: after <input type="number" name="commission_months" min="1" max="36" value="${esc(values.commission_months ?? '')}" style="width:60px"> months pay <input type="number" name="commission_after" min="0" max="60" value="${esc(values.commission_after ?? '')}" style="width:60px"> %. Leave blank for one flat rate.</span></p>
<button class="btn">Open my programme</button></form></div>
<p class="muted">This switches on order tracking, writes a creator brief that includes the disclosure rules, and publishes a join page. Creators are never asked to say anything they don't believe.</p></div>`;
}

function reportFormPage({ error, values = {}, niches = {} }) {
  const opt = (market) => Object.keys(niches[market] || {}).map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  return `<div style="max-width:640px;margin:20px auto"><h1>Free creator report for your Shopify store</h1>
<p>See 10 real TikTok creators who already make content in your niche, ranked by how well they fit a small brand (engagement, reach, price tier, recent activity). Takes about a minute.</p>
${error ? `<div class="flash err">${esc(error)}</div>` : ''}
<div class="card"><form method="post" action="/report">
<p><label>Your email<br><input type="text" name="email" value="${esc(values.email || '')}" placeholder="you@brand.com" required></label></p>
<p><label>Market<br><select name="market" id="mk"><option value="AU">Australia</option><option value="US">United States</option></select></label></p>
<p><label>Niche<br><select name="niche" id="niche"></select></label></p>
<p><label>Or type up to 3 hashtags (optional)<br><input type="text" name="custom" placeholder="coffeetok, homebarista" value="${esc(values.custom || '')}"></label></p>
<button class="btn">Get my report</button></form></div>
<script>var N=${JSON.stringify(Object.fromEntries(Object.entries(niches).map(([m, v]) => [m, Object.keys(v)])))};var mk=document.getElementById('mk'),nn=document.getElementById('niche');function f(){nn.innerHTML=(N[mk.value]||[]).map(function(n){return '<option>'+n+'</option>'}).join('')}mk.onchange=f;f();</script>
<p class="muted">Public data only. We store your email to send you the list and, if you create an account, to help you start. <a href="/privacy">Privacy</a></p></div>`;
}

function reportResultPage({ row, summary }) {
  if (row.status === 'running') return `<meta http-equiv="refresh" content="6"><div style="max-width:640px;margin:40px auto"><h1>Finding your creators…</h1><p class="muted">This takes up to a minute. This page refreshes by itself.</p></div>`;
  if (row.status === 'error') return `<div style="max-width:640px;margin:40px auto"><h1>That did not work</h1><p>${esc(row.error || 'Please try again.')}</p><p><a class="btn" href="/report">Try again</a></p></div>`;
  const nf = (n) => Number(n || 0).toLocaleString('en-US');
  const rows = summary.top.map((r, i) => `<tr><td>${i + 1}</td><td><a href="${esc(r.profile_url)}" target="_blank" rel="noopener">@${esc(r.handle)}</a><div class="muted">${esc(r.tier)}</div></td><td class="num">${nf(r.followers)}</td><td class="num">${nf(r.median_plays)}</td><td class="num">${esc(r.engagement_pct)}%</td><td class="num"><b>${esc(r.score)}</b></td></tr>`).join('');
  return `<div style="max-width:720px;margin:20px auto"><h1>Your creator report</h1>
<p class="muted">${esc(row.market)} · #${esc(row.hashtags.split(',').join(' #'))}</p>
<div class="card"><p><b>${summary.found}</b> creators found, <b>${summary.smallOnes}</b> of them nano or micro (the affordable ones). Your top 10 reach about <b>${nf(summary.combinedMedianReach)}</b> views per post combined, at a median engagement of <b>${esc(summary.medianEngagement)}%</b>.</p>
<table><thead><tr><th>#</th><th>Creator</th><th class="num">Followers</th><th class="num">Median views</th><th class="num">Engagement</th><th class="num">Fit</th></tr></thead><tbody>${rows}</tbody></table>
<p class="muted">Fit is 0–100: engagement, reach, affordability, recent posting. These are public numbers from recent posts; we have not contacted anyone.</p></div>
<div class="card"><h2 style="margin-top:0">What happens next</h2>
<p>A 30-creator gifted test costs about <b>$${nf(summary.testCost)}</b> in product (assuming $${summary.sampleCost} landed cost each, your number will differ). Creators who post earn commission only on tracked orders.</p>
<p>Create a free account to connect your Shopify store, open a creator programme in three questions, and get a code and tracked link for every creator you add.</p>
<p><a class="btn" href="/signup">Create my free account</a></p></div></div>`;
}

function leadsPage({ rows }) {
  const body = rows.map((r) => `<tr><td>${esc(r.created_at)}</td><td>${esc(r.email)}</td><td>${esc(r.market)}</td><td>${esc(r.hashtags)}</td><td>${esc(r.status)}</td></tr>`).join('');
  return `<h1>Leads</h1><div class="card"><table><thead><tr><th>When</th><th>Email</th><th>Market</th><th>Hashtags</th><th>Status</th></tr></thead><tbody>${body || '<tr><td colspan="5" class="muted">No reports run yet.</td></tr>'}</tbody></table></div>`;
}

function digestPage({ digest }) {
  return `<div style="max-width:640px"><h1>Weekly digest</h1><p class="muted">Sent every Monday morning${digest ? '' : '; none yet'}.</p>
${digest ? `<div class="card"><p class="muted">${esc(digest.created_at)} · ${esc(digest.sent_via === 'email' ? 'emailed' : 'saved here (email not configured)')}</p>${digest.html}</div>` : ''}
<form method="post" action="/digest/send"><button class="btn secondary">Build this week's digest now</button></form></div>`;
}

module.exports = { setupPage, reportFormPage, reportResultPage, leadsPage, digestPage, privacyPage, termsPage, billingPage, authPage, joinPage, portalPage };
