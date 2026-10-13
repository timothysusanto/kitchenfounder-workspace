'use strict';
/**
 * The legal line for AI-presenter ads, encoded as code.
 *
 * Allowed: an AI avatar acting as a clearly labelled brand spokesperson.
 * Not allowed: the avatar posing as a customer, buyer, reviewer or "real person" with personal experience
 * of the product (FTC 16 CFR Part 465; Australian Consumer Law s29(1)(e)), undisclosed realistic AI
 * (Meta "AI Info" label, TikTok AI Disclosure tag, YouTube altered-content label), or unsubstantiated claims.
 *
 * This module is deterministic on purpose: the model writes, the rules decide.
 */

const FAKE_CUSTOMER_PATTERNS = [
  /\bI\s+(bought|ordered|purchased|got|received|use[d]?|tried|own)\b/i,
  /\bmy\s+(order|purchase|delivery|package|experience)\b/i,
  /\b(as|being|speaking as)\s+a\s+(real\s+)?(customer|buyer|user|client|mum|mom|dad|parent|chef)\b/i,
  /\b(customer|verified|honest|real)\s+(review|testimonial)\b/i,
  /\b(this|it)\s+(changed|saved|transformed)\s+my\s+(life|business|kitchen|restaurant)\b/i,
  /\b(five|5)[\s-]*stars?\b/i,
  /\b(before|after)\s+(and|&)\s+(after|before)\b/i,
  /\bnot\s+(an?\s+)?(ad|sponsored|paid)\b/i,
  /\b(I'?m|I am)\s+(not\s+)?(an?\s+)?(actor|AI|robot|avatar)\b/i, // the avatar should never comment on its own nature in-script; disclosure is on the label
];

const RISKY_CLAIM_PATTERNS = [
  { re: /\b(cure[sd]?|heal[sd]?|treat[s]?|prevent[s]?)\b/i, note: 'medical claim' },
  { re: /\b(clinically|scientifically|lab)[\s-]*(proven|tested|backed)\b/i, note: 'scientific claim needs the study' },
  { re: /\b(guarantee[ds]?|guaranteed\s+results|risk[\s-]*free)\b/i, note: 'guarantee claim' },
  { re: /\b(number|no\.?|#)\s*1\b|\bbest[\s-]*selling\b|\bworld'?s\s+best\b/i, note: 'superlative needs evidence' },
  { re: /\b(doctor|dietitian|nutritionist)[\s-]*(recommended|approved)\b/i, note: 'professional endorsement needs evidence' },
  { re: /\b(lose|lost)\s+\d+\s*(kg|kilos|pounds|lbs)\b/i, note: 'weight-loss claim' },
  { re: /\b\d{2,3}\s*%\s*(off|discount|cheaper|more|faster|better)\b/i, note: 'percentage claim needs evidence' },
];

function allText(script) {
  return [script.hook, script.body, script.cta, script.on_screen_text, script.caption].filter(Boolean).join('\n');
}

/**
 * @returns {{status:'pass'|'fail'|'review', notes:string[]}}
 *  fail   = fake-customer framing or missing disclosure; never ship.
 *  review = a claim that needs substantiation; a human must attach evidence or cut it.
 *  pass   = nothing flagged.
 */
function checkScript(script, disclosureLine) {
  const notes = [];
  const text = allText(script);

  for (const re of FAKE_CUSTOMER_PATTERNS) {
    const m = text.match(re);
    if (m) notes.push(`fake-customer framing: "${m[0]}"`);
  }

  const caption = script.caption || '';
  if (!disclosureLine || !caption.toLowerCase().includes(disclosureLine.toLowerCase())) {
    notes.push('caption is missing the AI disclosure line');
  }

  let status = notes.length ? 'fail' : 'pass';

  for (const { re, note } of RISKY_CLAIM_PATTERNS) {
    const m = text.match(re);
    if (m) {
      notes.push(`needs substantiation (${note}): "${m[0]}"`);
      if (status === 'pass') status = 'review';
    }
  }

  const claims = Array.isArray(script.claims) ? script.claims : [];
  for (const c of claims) {
    if (c && c.needs_substantiation && !c.evidence) {
      notes.push(`model flagged claim without evidence: "${c.text}"`);
      if (status === 'pass') status = 'review';
    }
  }

  if (!script.hook || !script.body || !script.cta) {
    notes.push('script is incomplete (hook, body and cta are required)');
    status = 'fail';
  }

  return { status, notes };
}

module.exports = { checkScript, FAKE_CUSTOMER_PATTERNS, RISKY_CLAIM_PATTERNS };
