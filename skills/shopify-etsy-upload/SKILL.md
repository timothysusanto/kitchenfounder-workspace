# Skill: shopify-etsy-upload

## PDF Generation (Chrome method — recommended)
1. SSH into Lightsail: ssh ubuntu@54.251.18.206
2. Run: cd ~/.openclaw/workspace && python3 -m http.server 8081 &
3. Open Chrome on Windows/Mac
4. Go to: http://54.251.18.206:8081/restaurant-pdfs/v7/GUIDENAME.html
5. Press Ctrl+P (Windows) or CMD+P (Mac)
6. Destination: Save as PDF
7. Settings: A4, Background graphics ON, Default margins
8. Save — produces full-fidelity PDF with all colors and styling
Note: wkhtmltopdf on server does NOT render CSS backgrounds — use Chrome only

## Shopify Upload Process
Store: kitchen-founder.myshopify.com
App for digital delivery: Pendora Downloads (installed)
1. Shopify Admin → Products → Add product
2. Title: [Cuisine] Restaurant Operations Guide — KitchenFounder
3. Price: $29.99 USD
4. Variant: must be "Default Title" (not custom variants — Pendora requires this)
5. Description: copy from /workspace/marketing/upload-master.md
6. Upload cover image from /workspace/shopify-covers/GUIDE-cover.html (screenshot it first)
7. In Pendora app: link the PDF file to the product
8. Publish to Online Store

## Etsy Upload Process
Shop: kitchenfounder.etsy.com
1. Etsy Shop Manager → Listings → Add a listing
2. Type: Digital download
3. Title: SEO-optimized 140-char title (from /workspace/marketing/etsy/etsy-listings.md)
4. Price: $29.99 USD
5. Tags: 13 tags from etsy-listings.md
6. Description: full description from etsy-listings.md
7. Upload the PDF file directly (Etsy handles digital delivery automatically)
8. Upload cover image
9. Publish

## Cover Image Generation
Source files: /workspace/shopify-covers/GUIDENAME-cover.html
Method: Open in Chrome → F12 DevTools → CMD+Shift+P → "Capture full size screenshot"
Output: PNG file, use as product cover on both Shopify and Etsy
Note: xvfb-run not available on server — Chrome DevTools method only

## All Copy Ready
Shopify + Etsy copy for ALL 29 guides: /workspace/marketing/upload-master.md (1079 lines)
Etsy listings #1-21: /workspace/marketing/etsy/etsy-listings.md
Shopify batch 2: /workspace/marketing/shopify/shopify-listings-batch2.md
