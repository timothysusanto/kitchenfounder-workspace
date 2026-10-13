'use strict';
/**
 * Creator briefs: what we send a creator with the product. Written by Claude, checked by rules.
 * A brief is legal when it (1) tells the creator to disclose in-video and in-caption, (2) asks for their
 * honest experience rather than scripted praise, (3) never conditions payment or product on a positive review,
 * and (4) only hands them claims the brand can prove.
 */
const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');

const DISCLOSURE = {
  AU: 'Say "ad" or "gifted by [brand]" out loud or on screen in the first 3 seconds AND put #ad at the start of the caption. On Instagram use the Paid partnership label; on TikTok switch on the content disclosure toggle. (AANA Code of Ethics s2.7; Australian Consumer Law)',
  US: 'Say "ad" or "[brand] sent me this" out loud or on screen in the first 3 seconds AND put #ad at the start of the caption. On Instagram use the Paid partnership label; on TikTok switch on the content disclosure toggle. A discount code alone is not a disclosure. (FTC Endorsement Guides)',
};

const COERCION_PATTERNS = [
  /\b(must|should|need to|have to)\s+(be|stay|sound)\s+positive\b/i,
  /\bonly\s+post\s+if\s+you\s+(love|like)\b/i,
  /\b(5|five)[\s-]*stars?\b/i,
  /\bpositive\s+review\b/i,
  /\bdon'?t\s+(mention|say)\s+(anything\s+)?(negative|bad)\b/i,
  /\bpretend\b|\bact\s+as\s+if\b/i,
  /\bno\s+need\s+to\s+(disclose|say\s+ad|tag)\b/i,
  /\bhide\s+(the\s+)?(ad|sponsorship|gift)\b/i,
];

const RISKY_CLAIMS = [
  { re: /\b(cure[sd]?|heal[sd]?|treat[s]?|prevent[s]?)\b/i, note: 'medical claim' },
  { re: /\b(clinically|scientifically)[\s-]*(proven|tested)\b/i, note: 'scientific claim needs the study' },
  { re: /\bguarantee[ds]?\b/i, note: 'guarantee' },
  { re: /\b(best|#1|number one)\s+(in|on)\s+(australia|the\s+world|the\s+market)\b/i, note: 'superlative needs evidence' },
];

function checkBrief(brief, captionTemplate, market) {
  const notes = [];
  const text = `${brief || ''}\n${captionTemplate || ''}`;
  if (!/#ad\b/i.test(captionTemplate || '')) notes.push('caption template must start with #ad');
  if (!/(disclos|say\s+"?ad"?|gifted by|sent me this|paid partnership)/i.test(brief || '')) notes.push('brief must tell the creator how to disclose in-video');
  if (!/(honest|your own words|your experience|what you actually think)/i.test(brief || '')) notes.push('brief must ask for the creator\'s honest experience');
  for (const re of COERCION_PATTERNS) { const m = text.match(re); if (m) notes.push(`coercive or deceptive instruction: "${m[0]}"`); }
  let status = notes.length ? 'fail' : 'pass';
  for (const { re, note } of RISKY_CLAIMS) { const m = text.match(re); if (m) { notes.push(`needs substantiation (${note}): "${m[0]}"`); if (status === 'pass') status = 'review'; } }
  if (!DISCLOSURE[market]) notes.push(`unknown market ${market}`);
  return { status, notes };
}

function systemPrompt(brand, market) {
  return `You write short creator briefs for a small ${brand.name} product campaign in ${market === 'US' ? 'the United States' : 'Australia'}.
Brand voice: ${brand.voice}

Rules you must obey:
1. The creator shares their honest experience in their own words. Never script praise, never ask for positivity, never tie the gift, fee or commission to a positive outcome.
2. Disclosure instruction, verbatim, under a heading "Disclosure (required)": ${DISCLOSURE[market]}
3. Only use facts from the product data. No medical, scientific, guarantee or "number one" claims.
4. Plain words, short lines, under 220 words for the brief.

Return ONLY JSON: {"brief": string (markdown with headings: What it is, What we'd love to see, Disclosure (required), Deliverables, Timing, Your code and link), "caption_template": string (starts with "#ad", one or two sentences, includes the placeholders {code} and {link})}`;
}

function userPrompt(campaign, product) {
  return `Campaign: ${campaign.name}\nType: ${campaign.kind} (${campaign.kind === 'affiliate' ? `${campaign.creator_commission_pct}% commission on tracked sales` : campaign.fee_per_post ? `$${campaign.fee_per_post} per post` : 'gifted product, no fee'})\nCustomer discount with the creator's code: ${campaign.customer_discount_pct}%\nDeliverable: one vertical video (TikTok / Reels), 15-45 seconds, posted within 14 days of receiving the product.\n\nProduct data (the only facts allowed):\n${JSON.stringify({ title: product?.title, description: product?.description, price: product?.price ? `${product.price} ${product.currency || ''}` : null, url: product?.product_url }, null, 2)}`;
}

function parseBrief(text) {
  let s = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('no JSON object in model output');
  const o = JSON.parse(s.slice(a, b + 1));
  return { brief: String(o.brief || '').trim(), caption_template: String(o.caption_template || '').trim() };
}

async function generateBrief(campaign, product, { brand = config.brand } = {}) {
  if (!config.anthropic.apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });
  const msg = await client.messages.create({ model: config.anthropic.model, max_tokens: 2000, system: systemPrompt(brand, campaign.market), messages: [{ role: 'user', content: userPrompt(campaign, product) }] });
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const out = parseBrief(text);
  return { ...out, compliance: checkBrief(out.brief, out.caption_template, campaign.market) };
}

module.exports = { checkBrief, generateBrief, parseBrief, systemPrompt, userPrompt, DISCLOSURE, COERCION_PATTERNS };
