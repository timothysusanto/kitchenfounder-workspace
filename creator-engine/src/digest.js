'use strict';
/**
 * Monday digest for brand owners: what sold, what you owe, who to chase.
 * Built from the database only. Sent by Resend when RESEND_API_KEY + DIGEST_FROM are set; always saved so /digest can show it.
 */
const config = require('./config');
const { q } = require('./db');
const loop = require('./loop');
const { esc } = require('./views');

const usd = (n) => `$${Number(n || 0).toFixed(2)}`;

/** Local calendar parts in a timezone. Pure. */
function localParts(date, timeZone) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), weekday: p.weekday };
}

/** Pure: the digest "week" key = the local date of that week's Monday. */
function weekKey(date, timeZone) {
  const { date: d, weekday } = localParts(date, timeZone);
  const back = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekday];
  const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() - back);
  return t.toISOString().slice(0, 10);
}

/** Pure: is it time to send? Monday, at/after the configured local hour. */
function isSendTime(date, { timezone, hour }) {
  const p = localParts(date, timezone);
  return p.weekday === 'Mon' && p.hour >= hour;
}

function storesFor(user) { return user.role === 'owner' ? q.allStores.all() : q.storesForUser.all(user.id); }

/** Gather the numbers for one user. */
function gather(user, now = new Date()) {
  const since = new Date(now.getTime() - 7 * 86400000).toISOString();
  const out = { stores: [] };
  for (const store of storesFor(user)) {
    const week = q.weekOrders.get(store.id, since);
    const rep = loop.report(store.id);
    out.stores.push({
      shop: store.shop, name: q.userById.get(store.user_id || user.id)?.brand_name || store.shop,
      orders: week.orders, revenue: week.revenue,
      top: q.weekTopCreators.all(store.id, since),
      newCreators: q.newCreatorsSince.get(store.id, since.slice(0, 19).replace('T', ' ')).n,
      owed: rep.commissionOwed, payouts: rep.rows.filter((r) => r.commissionOwed > 0.005).sort((a, b) => b.commissionOwed - a.commissionOwed).slice(0, 5).map((r) => ({ handle: r.handle, owed: r.commissionOwed, email: r.payout_email })),
      chase: q.staleCreators.all(store.id).map((r) => r.handle),
      totalCreators: rep.rows.length, attributedOrders: rep.attributedOrders, attributedRevenue: rep.attributedRevenue,
      programmeOpen: q.campaignsByStore.all(store.id).some((c) => c.is_public),
    });
  }
  return out;
}

/** Pure-ish: turn the numbers into a subject, text and html. One clear next action per store. */
function render(user, data) {
  const lines = []; const html = [];
  let totalOrders = 0; let totalRev = 0;
  for (const s of data.stores) {
    totalOrders += s.orders; totalRev += s.revenue;
    let next;
    if (!s.programmeOpen) next = 'Open your creator programme (3 questions) so creators can join.';
    else if (s.totalCreators === 0) next = 'Share your join link: put it in your order-confirmation email, your footer and your Instagram bio.';
    else if (s.owed > 0.005) next = `Pay ${s.payouts.length} creator${s.payouts.length === 1 ? '' : 's'} (${usd(s.owed)} owed), then mark them paid.`;
    else if (s.chase.length) next = `Message the ${s.chase.length} creator${s.chase.length === 1 ? '' : 's'} who joined 2+ weeks ago and have no sales yet.`;
    else next = 'Invite 5 more creators this week.';
    lines.push(`${s.name}`, `  This week: ${s.orders} order${s.orders === 1 ? '' : 's'} from creators, ${usd(s.revenue)} revenue.`);
    lines.push(`  New creators: ${s.newCreators}. Commission owed: ${usd(s.owed)}.`);
    if (s.top.length) lines.push(`  Top: ${s.top.map((t) => `@${t.handle} (${t.orders}, ${usd(t.revenue)})`).join(', ')}`);
    for (const p of s.payouts) lines.push(`  Pay @${p.handle}: ${usd(p.owed)}${p.email ? ` → ${p.email}` : ''}`);
    if (s.chase.length) lines.push(`  No sales after 2 weeks: ${s.chase.map((h) => '@' + h).join(', ')}`);
    lines.push(`  Next: ${next}`, '');
    html.push(`<h2 style="margin:18px 0 6px">${esc(s.name)}</h2>
<p style="margin:0 0 6px"><b>${s.orders}</b> order${s.orders === 1 ? '' : 's'} from creators this week · <b>${usd(s.revenue)}</b> revenue · ${s.newCreators} new creator${s.newCreators === 1 ? '' : 's'}</p>
${s.top.length ? `<p style="margin:0 0 6px">Top: ${s.top.map((t) => `@${esc(t.handle)} (${t.orders} · ${usd(t.revenue)})`).join(', ')}</p>` : ''}
${s.payouts.length ? `<p style="margin:0 0 6px"><b>To pay (${usd(s.owed)}):</b><br>${s.payouts.map((p) => `@${esc(p.handle)}: ${usd(p.owed)}${p.email ? ` → ${esc(p.email)}` : ''}`).join('<br>')}</p>` : ''}
${s.chase.length ? `<p style="margin:0 0 6px">No sales after 2 weeks: ${s.chase.map((h) => '@' + esc(h)).join(', ')}</p>` : ''}
<p style="margin:8px 0 0;padding:8px 10px;background:#eef6ff;border-radius:6px"><b>Next:</b> ${esc(next)}</p>`);
  }
  if (!data.stores.length) { lines.push('No store connected yet. Connect your Shopify store to start.'); html.push('<p>No store connected yet. Connect your Shopify store to start.</p>'); }
  const subject = totalOrders ? `This week: ${totalOrders} creator order${totalOrders === 1 ? '' : 's'}, ${usd(totalRev)}` : 'Your creator programme this week';
  const text = `${subject}\n\n${lines.join('\n')}\nOpen your dashboard: ${config.appUrl}`;
  const body = `<div style="font:15px/1.5 system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0f1218"><h1 style="font-size:20px">${esc(subject)}</h1>${html.join('')}<p style="margin-top:18px"><a href="${esc(config.appUrl)}">Open your dashboard</a></p></div>`;
  return { subject, text, html: body };
}

async function sendEmail(to, { subject, text, html }) {
  const { resendKey, from } = config.digest;
  if (!resendKey || !from) return 'saved';
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text, html }) });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return 'email';
}

/** Build, save and (if configured) email one user's digest for this week. Idempotent per week unless force. */
async function sendFor(user, { now = new Date(), force = false, send = sendEmail } = {}) {
  const week = weekKey(now, config.digest.timezone);
  if (!force && q.digestFor.get(user.id, week)) return null;
  const d = render(user, gather(user, now));
  let via = 'saved';
  try { via = await send(user.email, d); } catch (e) { console.error(`digest email failed for ${user.email}: ${e.message}`); }
  q.insertDigest.run({ user_id: user.id, week: force ? `${week}-manual-${Date.now()}` : week, subject: d.subject, text: d.text, html: d.html, sent_via: via });
  return { ...d, via };
}

/** Called hourly. Sends to every account that has a store, once per week. */
async function tick(now = new Date(), opts = {}) {
  if (!isSendTime(now, config.digest)) return 0;
  let n = 0;
  for (const u of q.digestUsers.all()) {
    if (!storesFor(u).length) continue;
    if (await sendFor(u, { now, ...opts })) n++;
  }
  return n;
}

module.exports = { localParts, weekKey, isSendTime, gather, render, sendFor, tick };
