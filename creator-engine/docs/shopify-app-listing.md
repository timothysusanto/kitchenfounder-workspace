# Shopify app listing pack (Creator Engine)

**App name:** Creator Engine · **Tagline (≤62 chars):** Creator codes, tracked links and real sales per creator.

**Intro:** Find small creators who fit your products, give each their own discount code and tracked link, and see which creator caused each order. Pay on results, put ad money behind the winners.

**Features:** 1) Creator discovery and scoring. 2) Compliant creator briefs (AU and US disclosure rules). 3) Per-creator codes and links. 4) Real-time order attribution, including subscription renewals. 5) Public creator programme page and creator portal with earnings. 6) Commission tracking.

**Pricing text:** Free until your creators produce your first 3 attributed orders. Then a monthly fee plus 10% of revenue from creator-attributed orders.

**Scopes and why:** `read_products` (list products for campaigns), `read_orders` (attribute orders to creators), `write_discounts` (create each creator's code).

**Data use:** No customer names, emails or addresses stored. See /privacy.

**Compliance webhooks:** `/webhooks/shopify/compliance` (HMAC-verified): customers/data_request, customers/redact, shop/redact.

**Submission checklist (Dev Dashboard):** set App URL and redirect URL to the Railway domain; add the three compliance webhook subscriptions; test install on a dev store; add 3 screenshots (stores, campaign, report); support email; submit for review. Review takes days to weeks and needs a human on Shopify's side — it cannot be automated.
