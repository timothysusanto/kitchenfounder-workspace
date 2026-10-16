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
  const pay = campaign.kind === 'affiliate'
    ? `<b>${campaign.creator_commission_pct}% commission</b> on every order that uses your code or link${sub}`
    : campaign.kind === 'paid' ? `<b>${money(campaign.fee_per_post)}</b> per post, plus your own discount code` : '<b>Free product</b> plus your own discount code';
  const price = campaign.product_price ? ` · ${money(campaign.product_price, campaign.product_currency)}${campaign.is_subscription ? `/${campaign.billing_interval || 'month'}` : ''}` : '';
  const per = campaign.product_price ? Number(campaign.product_price) * campaign.creator_commission_pct / 100 : 0;
  const perSale = campaign.kind === 'affiliate' && campaign.product_price
    ? (campaign.is_subscription
      ? ` That is <b>${money(per, campaign.product_currency)} per member, every ${campaign.billing_interval || 'month'}</b>: 100 members who stay a year is about ${money(per * 100 * 12, campaign.product_currency)} to you.`
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
function portalPage({ cc, orders }) {
  const brand = cc.store_brand || cc.shop.replace('.myshopify.com', '');
  const commission = cc.kind === 'affiliate' ? Number(cc.revenue) * Number(cc.creator_commission_pct) / 100 : 0;
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
 <p><b>${cc.orders}</b> orders · <b>${money(cc.revenue, cc.product_currency)}</b> revenue${cc.kind === 'affiliate' ? ` · <b>${money(commission, cc.product_currency)}</b> earned at ${cc.creator_commission_pct}% · paid ${money(cc.commission_paid, cc.product_currency)} · <b>owed ${money(owed, cc.product_currency)}</b>` : ''}</p>
 <table><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Matched by</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">No orders yet. Orders appear here within a minute of checkout.</td></tr>'}</tbody></table>
 <p class="muted" style="margin-top:8px">Payouts go to ${esc(cc.payout_email || cc.email || 'the email you gave')}.</p></div>
${cc.brief ? `<div class="card"><h2 style="margin-top:0">Brief</h2><pre style="color:var(--ink);font-size:13px">${esc(cc.brief)}</pre>${cc.caption_template ? `<p class="muted">Caption to adapt: ${esc(cc.caption_template)}</p>` : ''}</div>` : ''}
<div class="card"><b>Disclosure rule (${esc(cc.market)})</b><p class="muted">Say it is a paid partnership in the first seconds of the video and put #ad in the caption. ${cc.market === 'US' ? 'FTC Endorsement Guides.' : 'AANA Code of Ethics s2.7 and the Australian Consumer Law.'} Share your honest experience.</p>
<p class="muted">Bookmark this page: it is your private link.</p></div></div>`;
}

module.exports = { authPage, joinPage, portalPage };
