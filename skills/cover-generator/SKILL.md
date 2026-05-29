# Skill: cover-generator

## What are covers
Each guide has a matching Shopify/Etsy cover image.
Source: /workspace/shopify-covers/GUIDENAME-cover.html
Format: HTML file with CSS-only design, no external images
Naming: brazilian-cover.html, thai-cover.html, japanese-cover.html, etc.

## Cover design standard
Size target: 1200x1600px (portrait, Shopify/Etsy product image ratio)
Background: cuisine-specific gradient or solid color
Content: Guide title, KitchenFounder branding, key highlights (28 recipes, etc.)
Style: Monocle/Kinfolk editorial — clean, premium, minimal
No external images or fonts — self-contained HTML/CSS only

## Screenshot method (Chrome DevTools)
1. Open cover HTML in Chrome: http://54.251.18.206:8081/shopify-covers/COVER.html
2. Open DevTools: F12
3. Press CMD+Shift+P (Mac) or Ctrl+Shift+P (Windows)
4. Type: Capture full size screenshot
5. Press Enter — saves PNG to Downloads folder
6. Use PNG as product cover on Shopify and Etsy
Note: xvfb-run NOT available on server — Chrome DevTools is the only method.

## All 29 covers complete
Located in: /workspace/shopify-covers/
Files: brazilian-cover.html through roti-cover.html
Last cover: roti-cover.html (Caribbean Roti Shop, Guide #29)

## Building a new cover
Copy an existing cover as template, update: cuisine name, accent color, tagline, highlights.
Keep the KitchenFounder wordmark and $29.99 price badge consistent.
Test at 1200px wide in Chrome before screenshotting.
