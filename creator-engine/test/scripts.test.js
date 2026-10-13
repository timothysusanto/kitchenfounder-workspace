'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseScripts, spokenText, systemPrompt, userPrompt, ANGLES } = require('../src/scripts');

const sample = [
  { angle: 'a', hook: 'H1', body: 'B1', cta: 'C1', on_screen_text: 'T1', caption: 'cap1', claims: [] },
  { angle: 'b', hook: 'H2', body: 'B2', cta: 'C2', on_screen_text: 'T2', caption: 'cap2', claims: [{ text: 'x', needs_substantiation: true }] },
];

test('parses a plain JSON array', () => {
  const out = parseScripts(JSON.stringify(sample));
  assert.equal(out.length, 2);
  assert.equal(out[0].idx, 1);
  assert.equal(out[1].claims.length, 1);
});

test('parses JSON wrapped in code fences and prose', () => {
  const text = 'Here you go:\n```json\n' + JSON.stringify(sample) + '\n```\nDone.';
  const out = parseScripts(text);
  assert.equal(out.length, 2);
  assert.equal(out[1].hook, 'H2');
});

test('fills missing fields safely', () => {
  const out = parseScripts('[{"hook":"only hook"}]');
  assert.equal(out[0].body, '');
  assert.equal(out[0].angle, ANGLES[0]);
  assert.deepEqual(out[0].claims, []);
});

test('rejects output with no array', () => {
  assert.throws(() => parseScripts('Sorry, I cannot do that.'));
});

test('spoken text joins hook, body, cta', () => {
  assert.equal(spokenText({ hook: 'a', body: 'b', cta: 'c' }), 'a b c');
});

test('prompts carry the rules and the product facts', () => {
  const sys = systemPrompt({ name: 'Brand', voice: 'calm', disclosure: 'DISC' });
  assert.match(sys, /never a customer/i);
  assert.match(sys, /DISC/);
  const usr = userPrompt({ title: 'Chilli Oil', description: 'd', price: '12', currency: 'AUD', tags: 't', product_url: 'u' }, 3);
  assert.match(usr, /Chilli Oil/);
  assert.match(usr, /Write 3 scripts/);
  assert.equal(ANGLES.length, 20);
});
