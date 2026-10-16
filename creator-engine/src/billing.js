'use strict';
/**
 * Brand billing: a Stripe subscription (platform fee) plus a performance fee on attributed revenue.
 * Off until STRIPE_SECRET_KEY + STRIPE_PRICE_ID are set; with it off every brand has full access.
 * Talks to Stripe's REST API directly (no SDK). The owner account is never billed.
 */
const crypto = require('crypto');
const config = require('./config');
const { q } = require('./db');

const STRIPE = 'https://api.stripe.com/v1';
const enabled = () => !!(config.stripe.secretKey && config.stripe.priceId);

/** Pure: Stripe-Signature check. Header looks like "t=1700000000,v1=abcd...". Rejects stale timestamps (default 5 min). */
function verifyStripeSignature(rawBody, header, secret, now = Date.now(), toleranceSec = 300) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(String(header).split(',').map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)]; }));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody.toString('utf8')}`).digest('hex');
  // header can carry several v1 values during secret rotation
  return String(header).split(',').filter((kv) => kv.startsWith('v1=')).some((kv) => {
    const got = Buffer.from(kv.slice(3), 'hex'); const exp = Buffer.from(expected, 'hex');
    return got.length === exp.length && crypto.timingSafeEqual(got, exp);
  });
}

/**
 * Pure: where does this brand stand? Free until the programme has produced `freeSales` attributed orders (no card, no clock).
 * owner/billing-off => 'exempt'; paid => 'active'; fewer sales than the free allowance => 'free'; else 'expired' / 'past_due'.
 * `user.attributed_orders` is the brand's lifetime creator-attributed order count.
 */
function accessFor(user, now = Date.now()) {
  if (!user) return { state: 'none', allowed: false };
  if (user.role === 'owner' || !enabled()) return { state: 'exempt', allowed: true };
  if (user.billing_status === 'active') return { state: 'active', allowed: true };
  const sales = Number(user.attributed_orders || 0);
  if (sales < config.stripe.freeSales) return { state: 'free', allowed: true, salesLeft: config.stripe.freeSales - sales };
  return { state: user.billing_status === 'past_due' ? 'past_due' : 'expired', allowed: false };
}

/** Pure: performance fee for a month of attributed revenue. */
const performanceFee = (revenue, pct = config.stripe.performanceFeePct) => Math.round(Number(revenue || 0) * pct) / 100;

function monthKey(d = new Date()) { return d.toISOString().slice(0, 7); }

async function stripePost(path, params) {
  const res = await fetch(`${STRIPE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.stripe.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${path} -> ${res.status}: ${(body.error && body.error.message) || 'error'}`);
  return body;
}

async function checkoutUrl(user) {
  const s = await stripePost('/checkout/sessions', {
    mode: 'subscription',
    'line_items[0][price]': config.stripe.priceId,
    'line_items[0][quantity]': '1',
    client_reference_id: String(user.id),
    customer_email: user.email,
    success_url: `${config.appUrl}/billing?paid=1`,
    cancel_url: `${config.appUrl}/billing`,
  });
  return s.url;
}

async function portalUrl(user) {
  const row = q.userById.get(user.id);
  if (!row || !row.stripe_customer_id) throw new Error('No Stripe customer yet');
  const s = await stripePost('/billing_portal/sessions', { customer: row.stripe_customer_id, return_url: `${config.appUrl}/billing` });
  return s.url;
}

/** Apply a verified Stripe event to our users table. Returns a short note for logging. */
function applyEvent(event) {
  const obj = (event.data && event.data.object) || {};
  if (event.type === 'checkout.session.completed') {
    const id = Number(obj.client_reference_id);
    if (!id || !q.userById.get(id)) return 'unknown user';
    q.setUserBilling.run({ id, billing_status: 'active', stripe_customer_id: obj.customer || null, stripe_subscription_id: obj.subscription || null });
    return `user ${id} active`;
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const u = q.userByStripeCustomer.get(obj.customer);
    if (!u) return 'unknown customer';
    const st = event.type === 'customer.subscription.deleted' ? 'canceled'
      : (obj.status === 'active' || obj.status === 'trialing') ? 'active' : obj.status === 'past_due' ? 'past_due' : 'canceled';
    q.setUserBilling.run({ id: u.id, billing_status: st, stripe_customer_id: null, stripe_subscription_id: obj.id || null });
    return `user ${u.id} ${st}`;
  }
  return 'ignored';
}

function summary(user) {
  const access = accessFor({ ...user, attributed_orders: q.lifetimeOrdersByUser.get(user.id).n });
  const rev = q.monthRevenueByUser.get(user.id, monthKey());
  return { enabled: enabled(), access, month: monthKey(), revenue: rev.revenue, orders: rev.orders, performanceFee: performanceFee(rev.revenue), performanceFeePct: config.stripe.performanceFeePct, freeSales: config.stripe.freeSales };
}

/** Attach the lifetime order count so accessFor can decide. */
const withUsage = (user) => ({ ...user, attributed_orders: user && user.role !== 'owner' ? q.lifetimeOrdersByUser.get(user.id).n : 0 });

module.exports = { withUsage, enabled, verifyStripeSignature, accessFor, performanceFee, checkoutUrl, portalUrl, applyEvent, summary, monthKey };
