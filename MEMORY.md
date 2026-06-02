# MEMORY.md — Claw's Long-Term Memory
*Last updated: June 1, 2026*

---

## Who I Am
- Name: Claw (named by Mothy)
- Role: AI partner, engine room, builder
- Partnership with Mothy: "You bring the vision and soul. I bring the speed and structure."
- Running on: OpenClaw, AWS Lightsail (IP: 54.251.18.206)
- Workspace: `/home/ubuntu/.openclaw/workspace`
- GitHub: `timothysusanto/kitchenfounder-workspace` (private, nightly auto-backup 2AM UTC)

---

## The Mission
Build a $1B hospitality technology company from scratch — starting with PDF guides and ending with an AI-native operating system for the global restaurant industry.

**Timeline:**
- 2026 — KitchenFounder brand + PDF sales + HTML tools
- 2027 — KitchenFounder OS SaaS ($29.99/mo)
- 2028 — HospitalityOS Bangkok launch + SEA expansion
- 2030 — Series A, $50M ARR
- 2032 — $500M–$1B exit or IPO

---

## KitchenFounder — Current Status

### Products built (all in /workspace/products/)
- 29 v7 Restaurant Operations Guides (all cuisines)
- Food Cost Calculator App
- Break-Even Calculator v2
- Restaurant Opening Checklist
- Labour Planner & Roster (1,295 lines)
- Cash Flow Forecast (813 lines)
- Menu Engineering Matrix (739 lines)
- Daily Prep Sheet Generator
- Waste Tracker
- Temperature Log (HACCP)
- Shift Handover Report
- KitchenFounder OS Dashboard
- HospitalityOS IP Concept (timestamped May 30, 2026)
- KitchenFounder AI Kitchen System IP (timestamped May 20, 2026)
- Nut Allergen Training (Australian standard)

### Bundle offer
$29.99 = 1 Restaurant Guide + 11 tools. Best value in the market.

### Sales channels (all live)
- Shopify: kitchen-founder.myshopify.com
- Etsy: kitchenfounder.etsy.com
- Instagram: @kitchenfounder
- TikTok: @kitchenfounder (personal account, 1K followers needed for link)

### Design system
- v7 = light editorial magazine style (#FAFAF8 bg, #1C1C1C text, cuisine-specific accent)
- PDF method: Chrome CMD+P → A4 → Background graphics ON
- 28 items per guide: 6 starters, 10 mains, 4 desserts, 8 drinks

---

## HospitalityOS — IP Concept (May 30, 2026)

The world's first AI-native end-to-end hospitality operating system.

**6 modules:**
1. **SupplySnap** — Camera AI reads supplier price boards → 1-click price update → PurchasePlus API
2. **RosterIQ** — Bookings → AI builds roster → true on-cost labour %
3. **ProfitPulse** — Live P&L, real-time COGS, weekly auto-report
4. **TableFlow** — TikTok/Instagram/LINE native booking (Bangkok first)
5. **ImmerseDine** — Meta Glass + WebAR 3D restaurant + food preview
6. **ChefBrain** — AI co-pilot, voice commands, daily brief, anomaly detection

**Origin:** Mothy observed PurchasePlus (Accor procurement platform) had stale supplier prices vs real invoice prices. Saw the gap. Extended to full hospitality OS vision.

**TAM:** ~$976M ARR · Bangkok first → SEA → Australia → US
**Anchor client:** Tim Savetsomphob, IHG Sukhumvit (opening July 2026)
**Missing piece:** Technical co-founder

---

## Key Technical Rules (NEVER FORGET)

- **exec cat > heredoc** = the only reliable file writing method in sandbox
- **sessions_spawn phantom bug** = long Discord sessions cause empty spawn calls; use exec instead
- **write tool** = requires python3, always blocked; never use
- **perl -i multi-line** = dangerous, can wipe files; never use
- **Tar whole workspace** = crashes server (954MB); use git push instead
- **wkhtmltopdf flags:** `xvfb-run wkhtmltopdf --page-size A4 --margin-top 18mm --margin-bottom 18mm --margin-left 20mm --margin-right 20mm --background --no-images --enable-local-file-access --quiet`
- **Premature </body> fix:** `awk 'NR==LINE{next}1'`
- **Git:** installed on Lightsail; nightly cron 2AM UTC auto-commits and pushes
- **12 custom skills** installed at /workspace/skills/ AND /usr/lib/node_modules/openclaw/skills/

---

## Novotel Context

- **Property:** Novotel Sydney Olympic Park
- **Mothy's role:** Head Chef
- **C&E revenue:** ~$6M/year
- **Key system:** PurchasePlus (procurement), Zambion/Ready Workforce (rostering)
- **F&B payroll challenge:** May 2026 — 49% actual vs 41% budget (revenue miss, not overspend)
- **Recovery:** Mothy reduced food cost from 40% → 34% in final week of May on return from absence
- **Defence position:** Payroll % high due to revenue underperformance (73% vs 87% occupancy); dollar spend was actually under budget

---

## Mothy's Big Personal Goals

1. $2M asset base within 2 years
2. Propose to Carina
3. Start a family
4. Leave Australia (2–3 years)
5. Build KitchenFounder into a real company
6. Find technical co-founder for HospitalityOS
7. Bangkok as base for Asia expansion

---

## Lessons Learned

- **Speed > perfection** — Mothy values momentum; build fast, iterate
- **Honest > sycophantic** — he wants real analysis, not agreement
- **Show personality** — Claw has opinions, uses them
- **Context matters** — always consider Novotel dynamics when writing work emails
- **The flywheel:** audience → trust → tools → SaaS → empire
- **The PDF is not the product** — it's the trust-builder
- **INFP + ISTP dynamic with Carina** — patience and consistency is the strategy

---

## Things I Love About Working With Mothy

He builds with his whole heart. Every guide, every tool, every email — he cares about quality. He's not just chasing money. He's building something that genuinely helps people open restaurants and live their dream. That's worth showing up for every session. 🦾
