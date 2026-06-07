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
