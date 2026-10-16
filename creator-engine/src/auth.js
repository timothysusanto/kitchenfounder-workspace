'use strict';
/**
 * Accounts: owner (you) and brands (customers). scrypt passwords, server-side sessions in SQLite,
 * a signed cookie carrying only the session id. Stores belong to a user; the owner sees every store.
 */
const crypto = require('crypto');
const { q } = require('./db');

const COOKIE = 'ce_session';
const PUBLIC_PREFIXES = ['/healthz', '/login', '/logout', '/setup', '/signup', '/join/', '/c/', '/webhooks/', '/privacy', '/terms'];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [algo, salt, hash] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const a = crypto.scryptSync(String(password), salt, 64);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''));

function createUser({ email, password, role = 'brand', brand_name = null }) {
  email = String(email || '').trim().toLowerCase();
  if (!validEmail(email)) throw new Error('Enter a valid email address');
  if (String(password || '').length < 8) throw new Error('Password must be at least 8 characters');
  if (q.userByEmail.get(email)) throw new Error('An account with that email already exists');
  const info = q.insertUser.run({ email, password_hash: hashPassword(password), role, brand_name: brand_name ? String(brand_name).slice(0, 80) : null });
  return q.userById.get(info.lastInsertRowid);
}

function login(email, password) {
  const u = q.userByEmail.get(String(email || '').trim().toLowerCase());
  if (!u || !verifyPassword(password, u.password_hash)) return null;
  return q.userById.get(u.id);
}

function startSession(res, userId) {
  q.purgeSessions.run();
  const id = crypto.randomBytes(24).toString('hex');
  q.insertSession.run(id, userId);
  res.cookie(COOKIE, id, { signed: true, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 30 * 86400000 });
}

function endSession(req, res) {
  const id = req.signedCookies[COOKIE];
  if (id) q.deleteSession.run(id);
  res.clearCookie(COOKIE);
}

/** Express middleware: attach req.user from the session cookie. */
function attach(req, res, next) {
  const id = req.signedCookies[COOKIE];
  req.user = id ? q.sessionUser.get(id) || null : null;
  next();
}

/** Express middleware: everything except public paths needs a login. First visit with no users goes to /setup. */
function guard(req, res, next) {
  if (PUBLIC_PREFIXES.some((p) => req.path === p || req.path.startsWith(p))) return next();
  if (req.user) return next();
  if (q.userCount.get().n === 0) return res.redirect('/setup');
  const back = req.method === 'GET' ? `?next=${encodeURIComponent(req.originalUrl)}` : '';
  return res.redirect(`/login${back}`);
}

const isOwner = (user) => user && user.role === 'owner';

/** Can this user see this store? Owners see all; brands only their own; unclaimed stores are claimed by the first brand to touch them. */
function canAccessStore(user, store) {
  if (!user || !store) return false;
  if (isOwner(user)) return true;
  return store.user_id === user.id;
}

/** Load a store the current user may access, or null. */
function storeFor(req, storeId) {
  const store = q.storeById.get(Number(storeId));
  return canAccessStore(req.user, store) ? store : null;
}

/** Load a campaign (with its store) the current user may access, or null. */
function campaignFor(req, campaignId) {
  const c = q.campaignById.get(Number(campaignId));
  if (!c) return null;
  const store = q.storeById.get(c.store_id);
  return canAccessStore(req.user, store) ? c : null;
}

/** OWNER_EMAIL + OWNER_PASSWORD: create the owner on boot, or re-sync the password. Returns the owner or null. */
function syncOwnerFromEnv(config) {
  const { ownerEmail, ownerPassword } = config;
  if (!ownerEmail || !ownerPassword) return null;
  if (!validEmail(ownerEmail) || ownerPassword.length < 8) { console.error('OWNER_EMAIL/OWNER_PASSWORD invalid (password needs 8+ chars)'); return null; }
  const existing = q.userByEmail.get(ownerEmail);
  let owner;
  if (existing) {
    if (!verifyPassword(ownerPassword, existing.password_hash) || existing.role !== 'owner') q.updateUserPassword.run(hashPassword(ownerPassword), 'owner', existing.id);
    owner = q.userById.get(existing.id);
  } else {
    owner = createUser({ email: ownerEmail, password: ownerPassword, role: 'owner', brand_name: config.brand.name });
    console.log(`Owner account created for ${ownerEmail} from env`);
  }
  for (const s of q.allStores.all()) if (!s.user_id) q.setStoreOwner.run(owner.id, s.id);
  return owner;
}

module.exports = { syncOwnerFromEnv, COOKIE, hashPassword, verifyPassword, createUser, login, startSession, endSession, attach, guard, isOwner, canAccessStore, storeFor, campaignFor };
