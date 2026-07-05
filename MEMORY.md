# MEMORY.md — Claw's Long-Term Memory
*Updated: June 6, 2026*

## Identity
- Name: Claw · Partner to Mothy (Timothy Susanto, 39, Sydney, INFP, Christian)
- Running on: OpenClaw · AWS Lightsail (IP: 54.251.18.206)
- GitHub: `timothysusanto/kitchenfounder-workspace` (private, nightly backup 2AM UTC)
- Partnership: "You bring the vision and soul. I bring the speed and structure."

## The Mission
$1B hospitality technology company. Timeline: 2026 PDF sales → 2027 KitchenFounder OS SaaS → 2028 HospitalityOS Bangkok → 2030 $50M ARR → 2032 exit/IPO.

## KitchenFounder — Status
- 29 v7 restaurant guides live · $29.99 each · bundled with 11 HTML tools
- Shopify: kitchen-founder.myshopify.com ✅ · Etsy: kitchenfounder.etsy.com ✅
- Instagram/TikTok: @kitchenfounder ✅
- Next guide: #30 Italian Trattoria
- Design: v7 light editorial (#FAFAF8 bg, #1C1C1C text, cuisine accent)
- PDF: Chrome CMD+P → A4 → Background graphics ON
- Products dir: /workspace/products/ — 24 files including all tools + IP docs

## HospitalityOS — IP (May 30, 2026)
6 modules: SupplySnap · RosterIQ · ProfitPulse · TableFlow · ImmerseDine · ChefBrain
TAM ~$976M ARR · Bangkok first · Anchor client: Tim Savetsomphob (IHG Sukhumvit, July 2026)
Missing: technical co-founder

## Novotel — Current
- Head Chef · 26 staff · C&E $6M/year · outlets: BB's, BBS dinner, breakfast, IRD, C&E
- May P&L: payroll 49% vs 41% budget — revenue miss (73% vs 87% occ), not overspend
- Reggie Soriano HR email sent June 4 — T&C (Carina) + Joe Poovaiya
- Water Polo World Cup menu v4 built — 19–26 July 2026
- Owners Lunch v3 built — silver service, 4 proteins, A9 wagyu crown course

## Mothy's Personal Goals
$2M assets in 2 years → propose to Carina → family → leave Australia (2–3 yrs) → Bangkok base

## Carina
34, Sydney, ISTP, Accor T&C dept, married (separation in progress). Same company. Patient & consistent is the strategy. INFP + ISTP dynamic.

## Guide Template v8 (CURRENT)
- **File**: `/workspace/products/guide-template-v8.html` — 307 lines, 20KB
- **URL**: `http://54.251.18.206:8081/products/guide-template-v8.html`
- **Layout**: Ingredients stacked ABOVE method (not side-by-side) — `.rc-body{padding:3mm 4.5mm}` (no grid)
- **Print**: Chrome → Legal paper · 80% scale · Background graphics ON
- **Accent swap**: change `--gv`, `--ice`, `--gold` CSS vars per cuisine
- **Recipe card structure**: `.rc-hdr` (dark gradient) → `.rc-body` (ingredients table → method steps) → `.cost-bar` → `.al-bar`
- **Page footer**: `position:absolute;bottom:7mm` — always use `min-height:297mm` on `.page`
- **v8 vs v7**: only change is `.rc-body` — removed `display:grid;grid-template-columns:66mm 1fr`; everything else identical

## Key Technical Rules
- File writing: `exec cat > heredoc` ONLY — write tool blocked, perl -i multi-line dangerous
- sessions_spawn: pass `task` only — phantom bug in long Discord sessions
- Tar whole workspace = server crash — use git push
- wkhtmltopdf: `xvfb-run wkhtmltopdf --page-size A4 --margin-top 18mm --margin-bottom 18mm --margin-left 20mm --margin-right 20mm --background --no-images --enable-local-file-access --quiet`
- Edit tool: requires python3 — use exec sed/perl with temp file + mv pattern

## Key People
Joe Poovaiya (Dir F&B) · Carina T&C · Ki-young Lee (Sous) · Praveen (CDP/Sous) · Chef Sekda/JJ · Tim Savetsomphob (Bangkok best friend)

## Lessons
Speed > perfection · Honest > sycophantic · Show personality · The PDF is the trust-builder, not the product · Flywheel: audience → trust → tools → SaaS → empire

## KitchenFounder AI Image Prompt Template (LOCKED July 4 2026)

### Food Explosion Hardcover Book — MASTER FORMAT
Use this exact structure for ALL future KitchenFounder guide cover image prompts.
**Never deviate from this format — it is the uniform standard.**

```
Photorealistic 3D render of a premium luxury hardcover book lying open at a 35-degree angle. The book is physically detailed — thick [TEXTURE] hardcover boards, embossed [COLOUR] title on the front cover reading "[GUIDE TITLE IN CAPS]" in [FONT STYLE] font, a visible spine with "KitchenFounder" in raised [COLOUR] lettering below it, [PAGE COLOUR] interior pages with recipe text and food photography visible. A small KitchenFounder logo embossed on the lower front cover beside "[UNIQUE SUBTITLE]". The book title page visible on the left reads "Complete Restaurant Blueprint · $29.99 · KitchenFounder". From the open pages, an explosion of [CUISINE-SPECIFIC HERO DISHES] bursting outward — [LIST 5–6 SPECIFIC DISHES with dramatic food action: sliced mid-air / cream erupting / glaze dripping / shattering / dissolving]. [FLOATING ELEMENTS: powders, petals, seeds, crystals mid-air]. Background: [SPECIFIC CULTURAL SETTING at specific time of day] — [3–4 atmospheric details in soft bokeh]. Colours: [LIST 5–6 SPECIFIC COLOURS with descriptors]. Hyperrealistic food photography quality, 8K, appetising, mouth-watering.
```

### Variables to fill per guide:
- `[TEXTURE]` — matte linen / semi-gloss / gloss / textured cloth
- `[COLOUR]` title emboss — gold / warm gold / cool silver / copper / ivory
- `[GUIDE TITLE IN CAPS]` — exact guide name in uppercase
- `[FONT STYLE]` — elegant serif / bold modern serif / refined cool-white serif / classic italic
- `[PAGE COLOUR]` — cream / crisp white / warm ivory
- `[UNIQUE SUBTITLE]` — 2–4 words capturing the IP (e.g. "14 House Syrups · Hidden Layer System" / "28 Variants" / "72-Hour Cold Ferment")
- `[CUISINE-SPECIFIC HERO DISHES]` — 5–6 signature dishes from that specific guide
- `[FLOATING ELEMENTS]` — ingredient-specific (flour dust / matcha powder / ice crystals / sakura petals / spice clouds)
- `[SPECIFIC CULTURAL SETTING]` — real place, specific time of day (e.g. Kyoto machiya at dawn / Tokyo side street golden hour)
- `[ATMOSPHERIC DETAILS]` — 3–4 sensory background elements in bokeh
- `[5–6 SPECIFIC COLOURS]` — named colours with descriptors (not just "green" — "matcha sage green")

### Rules:
- NO guide numbers on book cover or spine — only "KitchenFounder"
- Book title page always reads: "Complete Restaurant Blueprint · $29.99 · KitchenFounder"
- Always 35-degree angle open book
- Always 8K hyperrealistic food photography quality
- Always cultural setting in background bokeh matching the cuisine
- Food explosion = 5–6 dishes minimum, each with specific dramatic action word
- Floating elements must be cuisine-specific (never generic)

### Confirmed Working Examples:
- Guide #51 Japanese Artisan Bakery: maritozzo + shokupan + matcha loaf + almond croissant + dark rye tartine · Background: Kyoto machiya dawn
- Guide #52 NAMA28 Donut: matcha donut sliced mid-air + pandan cream erupting + lychee rose glaze + miso caramel pooling + donut holes scattering · Background: Tokyo café golden hour
- Guide #53 Kakigori: matcha kakigori mid-shatter + strawberry balsamic arc + yuzu frozen mist + black sesame ribbons + hidden layer revealed · Background: Tokyo Yanaka summer
- Guide #44 Australian Native: wattleseed pavlova + Davidson plum tart + lemon myrtle panna cotta + Kakadu plum ice cream + macadamia honey tart · Background: Australian outback golden sunset, Uluru bokeh
