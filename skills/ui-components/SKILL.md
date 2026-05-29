# Skill: ui-components

## Design System — KitchenFounder v7
Background: #FAFAF8 (warm white)
Text: #1C1C1C
Accent (default): #C8A97E (warm gold)
Cuisine accents: Brazilian=#C0392B, Thai=#E8A838, Japanese=#2C3E50, Korean=#8B0000
Font stack: Georgia, serif (headings) | system-ui, sans-serif (body)
Border radius: 8px cards, 4px badges
Shadow: 0 2px 12px rgba(0,0,0,0.06)

## CDN Links (add to HTML head — no install needed)
Chart.js:   <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
Mermaid:    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
Alpine.js:  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>

## Standard Chart Patterns (vanilla JS — no CDN needed)

### Bar chart with colored bars
Use div elements with dynamic width % set via JS: el.style.width = pct + "%"
Always set max-width: 100% and transition: width 0.4s ease on bar elements.

### Waterfall chart
Render as vertical rows: label | colored bar with $ value inside.
Colors: positive=#2a9d8f, negative=#e76f51, net-positive=#264653, net-negative=#c0392b

### Gauge / progress bar
Single div with width % and background color based on value range:
>=20% margin: green #2a9d8f | >=10%: amber #f4a261 | <10%: red #e76f51

### Ramp-up chart (12 months S-curve)
Ramp factors: 0.30,0.42,0.55,0.65,0.74,0.82,0.88,0.92,0.95,0.97,0.99,1.00
Render as flex columns with variable height divs. Label each M1-M12.

## Standard UI Components

### Status badge
<span class="status-badge status-green">Viable</span>
CSS: display:inline-block; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:600
status-green: bg=#d4edda color=#155724 | status-yellow: bg=#fff3cd color=#856404 | status-red: bg=#f8d7da color=#721c24

### Tab system
Buttons with data-tab attribute. JS toggles active class on btn and panel.
Active tab: border-bottom: 2px solid accent color

### Card grid
display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:16px

### Scenario buttons
3 buttons: Conservative / Base Case / Optimistic
Active state: background accent color, white text
Each button has data-scenario attribute for JS binding

## Interactive App Pattern (no framework)
1. All inputs have unique IDs
2. getVal(id, default) helper reads parseFloat(el.value)
3. setText(id, val) helper sets el.textContent
4. One calculate() function reads all inputs, computes all outputs, calls all update functions
5. Bind: document.getElementById(id).addEventListener("input", () => calculate())
6. Call calculate() once on DOMContentLoaded for initial render
