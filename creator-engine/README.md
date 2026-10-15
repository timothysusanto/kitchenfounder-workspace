# Creator Engine for Shopify brands

Find the right small creators for a Shopify brand, brief and seed them legally, give every creator their own discount code and tracked link, match every Shopify order back to the creator who caused it, and show which creators to put ad money behind. Built for food, drink, cookware and hospitality brands selling in Australia and the United States.

The loop, in one line: **discover → campaign + brief → codes and links → orders → report → amplify the winners.**

## Why this and not AI videos

Creators drive sales in three ways that have published numbers behind them: seeding at volume paid on results (gifted or $100–500 a post; 20–50% of gifted creators post; affiliate codes convert 1–3%), running the posts that worked as ads from the creator's own handle (Meta Partnership Ads: −19% CPA, 2.4× conversion lift; TikTok Spark Ads: +43% conversion rate), and on TikTok Shop in the US, the creator video being the checkout (video + LIVE carried 64% of US GMV in 2025). AI-presenter videos reduce trust in food and retail (45% of Australians trust a brand less; only 12% comfortable for packaged goods), so they are kept only as an optional hook-testing tool under **Hook tests**.

## What each screen does

| Screen | What you do there |
|---|---|
| **Stores** | Connect a Shopify store (OAuth). Set its market: AU or US. |
| **1 · Find creators** | Enter hashtags, pick TikTok or Instagram, click Discover. Apify pulls the posts (about US$0.003 each), the app collapses them into creators and scores them 0–100: engagement, reach, affordability (nano/micro score higher), recency, and in the US, proof they already sell via TikTok Shop. Accounts with huge reach and tiny engagement ("finds" aggregators) are penalised. |
| **2 · Campaigns & briefs** | Create a campaign for a product: gifted, paid per post, or affiliate commission; customer discount %; landed sample cost. **Generate brief** writes the creator brief with Claude, then the rules check it: it must tell the creator how to disclose (in-video and `#ad` in caption, market-specific wording), must ask for their honest experience, and must not condition anything on positivity. Add creators from the discovery list. **Issue codes + links** creates a Shopify discount code per creator (`write_discounts`) and a UTM link per creator. Track each creator through shortlisted → invited → agreed → shipped → posted → amplified, record fees, usage-rights purchases, and Spark / Partnership ad auth codes and spend. |
| **3 · Sales report** | **Sync Shopify orders** pulls the last 60 days of orders and attributes each one to a creator by discount code first, then by `utm_source=creator&utm_content=<handle>` from the customer journey. Per creator: spend (fee + rights + ad spend + sample once shipped), orders, revenue, CAC, ROAS. Blended CAC and ROAS for the store. **Winners to amplify** lists creators with 2+ orders and ROAS ≥ 2× and tells you to buy usage rights and run the post as an ad if you have not. CSV download. |
| **Hook tests** (optional) | The earlier AI-presenter pipeline (Claude scripts → HeyGen render → review queue). Use it to test hooks cheaply; have a human re-shoot the winner. |

## AU vs US, built in

| | Australia | United States |
|---|---|---|
| TikTok Shop affiliate | Not live (no confirmed date) | Live. Needs a US entity, EIN, US address and US fulfilment; brands set 10–20% commission; 6% referral fee; GMV Max amplifies affiliate videos |
| Shopify Collabs network | Creators are US/UK/CA only | Available; free + 2.9% on commission payouts |
| Instagram affiliate tagging | Not rolled out | Live since spring 2026; brand sets commission, Meta takes no cut |
| YouTube Shopping affiliate | Not available | Available |
| What this app does | Seeding + per-creator codes/links + Spark/Partnership ads on winners | Same, plus TikTok Shop commission and sample settings in the campaign, and Shop-proof in creator scoring |
| Disclosure wording in briefs | AANA Code of Ethics s2.7, Australian Consumer Law | FTC Endorsement Guides, 16 CFR Part 465 |

An Australian brand that wants TikTok Shop US needs a US LLC and a US 3PL first; until then, US creators are reached through Instagram affiliate tags, Collabs and seeding with codes.

## Setup in 20 minutes

```bash
git clone https://github.com/timothysusanto/kitchenfounder-workspace
cd kitchenfounder-workspace/creator-engine
npm install
cp .env.example .env   # fill in the keys below
npm start              # open http://localhost:3000
```

1. **Shopify — pick one.**
   - *Option A, one store (simplest):* in your store admin go to Settings → Apps and sales channels → Develop apps → Create app. Under Admin API scopes tick `read_products`, `read_orders`, `write_discounts`, install the app and reveal the token (`shpat_…`). Set `SHOPIFY_SHOP=your-store.myshopify.com` and `SHOPIFY_ACCESS_TOKEN=shpat_…`. The store connects itself on boot.
   - *Option B, OAuth (to connect other brands' stores):* Partner Dashboard → Apps → Create app manually. App URL `http://localhost:3000`, redirect URL `http://localhost:3000/auth/shopify/callback`. Copy Client ID and secret into `.env`. Scopes requested: `read_products,read_orders,write_discounts` (orders are limited to the last 60 days unless Shopify grants `read_all_orders`).
2. **Anthropic key** — console.anthropic.com → API keys → `ANTHROPIC_API_KEY`.
3. **Apify token** — console.apify.com → Settings → Integrations → `APIFY_TOKEN`. The free plan is enough to start.
4. **Brand voice** — `BRAND_NAME`, `BRAND_VOICE`, `DEFAULT_MARKET` (AU or US).
5. Optional: `HEYGEN_API_KEY` for hook tests.

Then: connect the store → set market → Find creators with 2–3 hashtags → create a campaign → Generate brief → add 20–30 creators → Issue codes + links → ship product → update statuses as posts go live → Sync orders weekly → amplify the winners.

## Deploy to Railway

Deploy from GitHub; `nixpacks.toml` adds FFmpeg. Add a volume at `/data` and set `DATA_DIR=/data`. Set every variable from `.env.example`; set `APP_URL` to the Railway domain and update the Shopify app URLs. Optional cron: `node src/cli.js poll` every 5 minutes for hook-test renders.

## Commands

```bash
npm test                    # 31 tests: scoring, brief rules, code/UTM generation, order matching, economics, Shopify HMAC, routes
npm run dev                 # auto-restart
node src/cli.js poll        # HeyGen render polling (hook tests only)
```

## Files

```
src/discovery.js    Apify runs, post → creator collapse, scoring (pure, tested), seed hashtags by market
src/briefs.js       Claude brief generation + the brief rules (disclosure, honesty, no coercion, claims)
src/attribution.js  discount code per creator (Shopify), UTM links, order fetch, matching, economics
src/loop.js         the loop as functions: discover, campaign, brief, tracking, orders, report, CSV
src/views_loop.js   the four loop screens
src/server.js       routes
src/db.js           SQLite schema: stores, products, creators, campaigns, campaign_creators, attributed_orders (+ hook-test tables)
src/shopify.js      OAuth, HMAC, Admin GraphQL
src/scripts.js, compliance.js, heygen.js, render.js   hook tests (optional)
test/               node:test suites
```

## Costs per campaign (30 creators)

- Discovery: ~US$0.50 per 180 posts scraped.
- Samples: 30 × landed cost (you enter it; $30 is a common planning number).
- Fees: $0 for gifted; $100–500 per post for paid nano/micro.
- Usage rights on 3–5 winners: +30–50% of their fee.
- Ad spend on winners: whatever the brand puts behind Spark / Partnership ads.
- Claude: cents. Shopify, Apify: free tiers to start.

## Legal lines the app enforces

A brief fails if it lacks the in-video and `#ad` disclosure instruction, does not ask for the creator's honest experience, or contains coercive language ("only post if you love it", "must be positive", "no need to disclose"). It goes to review if it contains medical, scientific, guarantee or "#1" claims. Codes cannot be issued on a failed brief. These map to the FTC Endorsement Guides and 16 CFR Part 465 (US) and the AANA Code of Ethics s2.7 and Australian Consumer Law (AU).
