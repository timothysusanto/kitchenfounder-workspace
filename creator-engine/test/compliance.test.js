'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkScript } = require('../src/compliance');

const D = 'This video features an AI presenter.';
const good = {
  hook: 'Your sauce keeps splitting? Here is why.',
  body: 'This chilli oil is made in small batches with cold-pressed oil, so it holds together on the plate.',
  cta: 'Link in bio.',
  on_screen_text: 'Small batch chilli oil',
  caption: 'Small-batch chilli oil, made in Sydney. #chillioil #homecook ' + D,
  claims: [],
};

test('clean spokesperson script passes', () => {
  const r = checkScript(good, D);
  assert.equal(r.status, 'pass');
  assert.deepEqual(r.notes, []);
});

test('fake-customer framing fails', () => {
  for (const body of ['I bought this last week and love it.', 'As a customer I can say it works.', 'Five stars from me.', 'My order arrived fast.', 'This changed my life.']) {
    const r = checkScript({ ...good, body }, D);
    assert.equal(r.status, 'fail', body);
    assert.ok(r.notes.some((n) => n.startsWith('fake-customer')), body);
  }
});

test('missing disclosure fails', () => {
  const r = checkScript({ ...good, caption: 'No disclosure here #sauce' }, D);
  assert.equal(r.status, 'fail');
  assert.ok(r.notes.some((n) => n.includes('disclosure')));
});

test('risky claim goes to review, not fail', () => {
  const r = checkScript({ ...good, body: 'Clinically proven to cure heartburn.' }, D);
  assert.equal(r.status, 'review');
  assert.ok(r.notes.length >= 1);
});

test('model-flagged claim without evidence goes to review', () => {
  const r = checkScript({ ...good, claims: [{ text: 'lowest price in Australia', needs_substantiation: true }] }, D);
  assert.equal(r.status, 'review');
});

test('incomplete script fails', () => {
  const r = checkScript({ ...good, cta: '' }, D);
  assert.equal(r.status, 'fail');
});

test('fail outranks review when both apply', () => {
  const r = checkScript({ ...good, body: 'I bought this. Clinically proven.' }, D);
  assert.equal(r.status, 'fail');
});
