'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');
const { checkScript } = require('./compliance');

const ANGLES = [
  'problem the product solves', 'how it is made or sourced', 'three ways to use it', 'who it is for and who it is not for',
  'a common mistake it fixes', 'what is in the box', 'price and value, stated plainly', 'a quick demo moment',
  'myth vs fact', 'a day-in-the-life use', 'the one detail people miss', 'comparison to doing it the hard way',
  'seasonal or occasion use', 'a question the founder gets asked most', 'a specific feature explained',
  'how to store or care for it', 'first-time buyer walkthrough', 'pairing or bundle idea', 'behind the recipe or design', 'the founder\'s reason for making it',
];

function systemPrompt(brand) {
  return `You write short vertical video scripts (9:16, 20-35 seconds) read by an AI presenter who is the brand's spokesperson.

Brand: ${brand.name}
Brand voice: ${brand.voice}

Hard rules, no exceptions:
1. The presenter is a spokesperson, never a customer. Never write "I bought", "I ordered", "my order", "as a customer", reviews, star ratings, before/after stories, or personal results.
2. Make no claim you cannot see in the product data. No medical, scientific, guarantee or "number one" claims. If a claim would need evidence, put it in "claims" with needs_substantiation true instead of the script.
3. Every caption ends with this exact line: "${brand.disclosure}"
4. Plain words. Short sentences. One idea per video. The hook is the first spoken sentence and must earn the next 3 seconds.
5. Spoken text (hook + body + cta) is 55-90 words total.

Return ONLY a JSON array (no prose, no code fences). Each item:
{"angle": string, "hook": string, "body": string, "cta": string, "on_screen_text": string (max 6 words), "caption": string (1-2 sentences for the post, with 2-4 hashtags, ending with the disclosure line), "claims": [{"text": string, "needs_substantiation": boolean}]}`;
}

function userPrompt(product, count) {
  const p = {
    title: product.title,
    description: product.description,
    price: product.price ? `${product.price} ${product.currency || ''}`.trim() : null,
    tags: product.tags,
    url: product.product_url,
  };
  return `Product data (the only facts you may use):\n${JSON.stringify(p, null, 2)}\n\nWrite ${count} scripts, one per angle, in this order of angles:\n${ANGLES.slice(0, count).map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
}

/** Pure: turn model text into an array of script objects. Tolerates code fences and stray prose. */
function parseScripts(text) {
  if (typeof text !== 'string') throw new Error('model returned no text');
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) throw new Error('no JSON array in model output');
  const arr = JSON.parse(s.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error('model output is not an array');
  return arr.map((x, i) => ({
    idx: i + 1,
    angle: String(x.angle || ANGLES[i] || ''),
    hook: String(x.hook || '').trim(),
    body: String(x.body || '').trim(),
    cta: String(x.cta || '').trim(),
    on_screen_text: String(x.on_screen_text || '').trim(),
    caption: String(x.caption || '').trim(),
    claims: Array.isArray(x.claims) ? x.claims : [],
  }));
}

function spokenText(script) {
  return [script.hook, script.body, script.cta].filter(Boolean).join(' ');
}

async function generateScripts(product, { count = 20, brand = config.brand } = {}) {
  if (!config.anthropic.apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });
  const msg = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 8000,
    system: systemPrompt(brand),
    messages: [{ role: 'user', content: userPrompt(product, count) }],
  });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const scripts = parseScripts(text);
  return scripts.map((s) => ({ ...s, compliance: checkScript(s, brand.disclosure) }));
}

module.exports = { generateScripts, parseScripts, spokenText, systemPrompt, userPrompt, ANGLES };
