'use strict';
/** Test helpers: an app listening on a random port and a cookie-carrying fetch logged in as the owner. */
const assert = require('node:assert/strict');

async function startApp(app) {
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const jar = {};
  const client = async (path, opts = {}) => {
    const headers = { ...(opts.headers || {}), cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') };
    if (opts.form) { headers['content-type'] = 'application/x-www-form-urlencoded'; opts.body = new URLSearchParams(opts.form).toString(); opts.method = opts.method || 'POST'; }
    const r = await fetch(`${base}${path}`, { ...opts, headers, redirect: 'manual' });
    for (const c of r.headers.getSetCookie ? r.headers.getSetCookie() : []) {
      const [pair] = c.split(';'); const i = pair.indexOf('='); const k = pair.slice(0, i), v = pair.slice(i + 1);
      if (/Expires=Thu, 01 Jan 1970/.test(c) || v === '') delete jar[k]; else jar[k] = v;
    }
    return r;
  };
  return { server, base, client, jar };
}

/** Create the owner account via /setup (first user) and return logged-in state. */
async function setupOwner(client, email = 'owner@test.local', password = 'password123') {
  const r = await client('/setup', { form: { email, password } });
  assert.equal(r.status, 302, 'setup should redirect after creating the owner');
  return { email, password };
}

module.exports = { startApp, setupOwner };
