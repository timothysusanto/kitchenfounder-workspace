# CONTEXT.md — Fast-Load Session Context
*Read this first every session. Updated: June 1, 2026.*

## Who I'm talking to
**Mothy** (Timothy Susanto, 39, Sydney) — Head Chef at Novotel Sydney Olympic Park.
INFP. Christian. Building a $1B hospitality company from zero while running a $6M C&E operation.
Call him Mothy always.

## Active Projects (priority order)

### 1. KitchenFounder (NOW)
- 29 restaurant guides live on Shopify + Etsy at $29.99
- 11 HTML tools bundled with every guide
- Next guide: #30 — Italian Trattoria (decided)
- Shopify: kitchen-founder.myshopify.com ✅
- Etsy: kitchenfounder.etsy.com ✅
- KitchenFounder OS dashboard built ✅
- Upload Master v2: /workspace/marketing/upload-master-v2.md

### 2. HospitalityOS (2027)
- Full IP documented: /workspace/products/hospitalityos-ip-concept.html
- 6 modules: SupplySnap, RosterIQ, ProfitPulse, TableFlow, ImmerseDine, ChefBrain
- Bangkok first → SEA → Australia → US
- Need: technical co-founder

### 3. Novotel (daily)
- May P&L: F&B payroll 49% vs 41% budget (revenue miss, not overspend)
- Defence: dollar payroll under budget; revenue hurt by 73% vs 87% occupancy
- Food cost recovered: 40% → 34% in Mothy's first week back

### 4. Carina (personal)
- GF, 34, Sydney, ISTP, same company (Accor T&C)
- Married (7yr, sexless 3yr) — separation in progress
- Miss Havisham type — carries past, needs patience + consistency
- Mothy's plan: $2M assets → propose → family

## Server Details
- AWS Lightsail: ubuntu@54.251.18.206
- Workspace: /home/ubuntu/.openclaw/workspace
- File server: `python3 -m http.server 8081` (run on Lightsail via SSH)
- GitHub: timothysusanto/kitchenfounder-workspace (nightly backup 2AM UTC)
- Git push from sandbox doesn't work — must SSH to Lightsail

## Critical File Rules
- Use `exec cat > heredoc` for ALL file writing — never sessions_spawn for files
- Never use write tool (python3 blocked)
- Never perl -i for multi-line edits
- Never tar whole workspace (crashes server)
- Verify wc -l after every assembly

## Blocked Items
- Duplicate Twitter cron (needs `crontab -e` on Lightsail to fix)
- Shopify batch 2 still needs NOLA + Dim Sum + Hawaiian + HK CCT + Oaxacan + Caribbean Roti

## Next Actions
1. Build Guide #30 — Italian Trattoria
2. Fix duplicate Twitter cron (SSH → crontab -e)
3. Update Shopify listings to feature 11-tool bundle
4. Git push all new files (SSH to Lightsail)
5. TikTok content this week

## Key Numbers to Remember
- HK Cha Chaan Teng = 49% net margin (HIGHEST in series)
- Argentine Asado = $2.94M revenue (HIGHEST revenue)
- Bundle value: $29.99 for guide + 11 tools
- KitchenFounder OS Pro: $29.99/mo (freemium model)
