#!/usr/bin/perl
use strict;
use warnings;
my $f = "/workspace/restaurant-pdfs/v7/modern-asian-dessert-bar.html";
open(my $fh, ">", $f) or die "Cannot open $f: $!";
print $fh <<'HTML';
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KitchenFounder Guide #43 — Modern Asian Dessert Bar | v7 · 2026 Edition</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg:#FAFAF8; --text:#1C1C1C; --accent:#C8922A; --accent-light:#E8B86D;
  --accent-pale:#FDF5E6; --border:#E8E8E4; --muted:#6B6B6B;
  --card-bg:#FFFFFF; --section-bg:#F4F3EF;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{font-size:14px;}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);line-height:1.65;}
@media print{
  @page{size:A4;margin:0;}
  .recipe-card{page-break-inside:avoid;break-inside:avoid;}
  .section-header{page-break-inside:avoid;break-inside:avoid;}
  .cover{page-break-after:always;}
  print-color-adjust:exact;
  -webkit-print-color-adjust:exact;
  color-adjust:exact;
}
.cover{background:linear-gradient(160deg,#1C1C1C 0%,#2D2416 50%,#3A2E1A 100%);
  min-height:100vh;display:flex;flex-direction:column;justify-content:center;
  align-items:center;text-align:center;padding:60px 40px;position:relative;}
.cover::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;
  background:radial-gradient(ellipse at 30% 20%,rgba(200,146,42,.15) 0%,transparent 60%),
  radial-gradient(ellipse at 70% 80%,rgba(200,146,42,.10) 0%,transparent 50%);}
.cover-badge{font-size:.7rem;font-weight:600;letter-spacing:.25em;text-transform:uppercase;
  color:var(--accent);border:1px solid var(--accent);padding:6px 16px;border-radius:2px;margin-bottom:32px;}
.cover-gn{font-family:'Playfair Display',serif;font-size:1rem;color:rgba(255,255,255,.5);
  letter-spacing:.1em;margin-bottom:12px;}
.cover-title{font-family:'Playfair Display',serif;font-size:3.2rem;font-weight:700;
  color:#FFF;line-height:1.15;margin-bottom:8px;max-width:700px;}
.cover-sub{font-family:'Playfair Display',serif;font-style:italic;font-size:1.4rem;
  color:var(--accent-light);margin-bottom:32px;}
.cover-div{width:80px;height:2px;background:var(--accent);margin:0 auto 32px;}
.cover-desc{font-size:.9rem;color:rgba(255,255,255,.65);max-width:520px;line-height:1.7;margin-bottom:48px;}
.cover-meta{display:flex;gap:32px;justify-content:center;flex-wrap:wrap;margin-bottom:48px;}
.cover-mi{text-align:center;}
.cover-mi .num{font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;
  color:var(--accent);display:block;}
.cover-mi .lbl{font-size:.7rem;font-weight:600;letter-spacing:.15em;text-transform:uppercase;
  color:rgba(255,255,255,.45);}
.cover-ft{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.35);}
.pw{max-width:900px;margin:0 auto;padding:0 24px 64px;}
.chef-intro{background:var(--accent-pale);border-left:4px solid var(--accent);
  padding:40px 48px;margin:48px 0;border-radius:0 4px 4px 0;}
.ci-lbl{font-size:.65rem;font-weight:700;letter-spacing:.25em;text-transform:uppercase;
  color:var(--accent);margin-bottom:12px;}
.ci-text{font-family:'Playfair Display',serif;font-style:italic;font-size:1.05rem;
  color:var(--text);line-height:1.8;margin-bottom:16px;}
.ci-sig{font-size:.8rem;font-weight:600;color:var(--accent);}
.toc-section{margin-bottom:48px;}
.toc-title{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;
  color:var(--text);margin-bottom:8px;}
.toc-sub{font-size:.8rem;color:var(--muted);margin-bottom:28px;}
.toc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;}
.toc-item{display:flex;align-items:center;gap:12px;padding:10px 14px;
  background:var(--card-bg);border:1px solid var(--border);border-radius:4px;
  font-size:.82rem;color:var(--text);text-decoration:none;}
.toc-num{font-weight:700;color:var(--accent);font-size:.75rem;min-width:22px;}
.toc-name{flex:1;font-weight:500;}
.toc-cat{font-size:.65rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);}
.section-header{background:var(--text);color:#FFF;padding:32px 48px;margin:48px 0 32px;
  page-break-inside:avoid;break-inside:avoid;}
.sh-label{font-size:.65rem;font-weight:700;letter-spacing:.3em;text-transform:uppercase;
  color:var(--accent);margin-bottom:6px;}
.sh-title{font-family:'Playfair Display',serif;font-size:1.8rem;font-weight:700;color:#FFF;}
.sh-desc{font-size:.82rem;color:rgba(255,255,255,.6);margin-top:6px;max-width:540px;}
.recipe-grid{display:grid;gap:32px;}
.recipe-card{background:var(--card-bg);border:1px solid var(--border);border-radius:6px;
  overflow:hidden;page-break-inside:avoid;break-inside:avoid;}
.rch{background:var(--section-bg);padding:20px 28px;border-bottom:1px solid var(--border);
  display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
.rnum{font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;
  color:var(--accent);line-height:1;min-width:48px;}
.rtg{flex:1;}
.rtitle{font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;
  color:var(--text);margin-bottom:4px;}
.rsub{font-size:.78rem;color:var(--muted);font-style:italic;}
.tags{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start;}
.tag{font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  padding:3px 8px;border-radius:2px;background:#EFF0EB;color:var(--muted);border:1px solid var(--border);}
.gf{background:#EFF7EF;color:#2D6A2D;border-color:#B8D8B8;}
.vg{background:#EFF7EF;color:#2D6A2D;border-color:#B8D8B8;}
.df{background:#F0F4FF;color:#2D4AA0;border-color:#B8C8F0;}
.nf{background:#FFF5EE;color:#A04020;border-color:#F0C8A8;}
.cost{background:var(--accent-pale);color:var(--accent);border-color:var(--accent-light);font-size:.68rem;}
.rbody{padding:24px 28px;display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.rcol{display:flex;flex-direction:column;gap:20px;}
.rst{font-size:.65rem;font-weight:700;letter-spacing:.25em;text-transform:uppercase;
  color:var(--accent);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border);}
.ings{list-style:none;display:flex;flex-direction:column;gap:5px;}
.ings li{font-size:.82rem;color:var(--text);display:flex;gap:8px;
  padding:3px 0;border-bottom:1px dotted var(--border);}
.ings li:last-child{border-bottom:none;}
.ia{font-weight:600;color:var(--accent);min-width:70px;font-size:.78rem;}
.in{flex:1;}
.steps{list-style:none;display:flex;flex-direction:column;gap:8px;}
.steps li{font-size:.82rem;color:var(--text);display:flex;gap:10px;line-height:1.55;}
.sn{font-weight:700;color:var(--accent);min-width:20px;font-size:.78rem;padding-top:1px;}
.note{background:var(--accent-pale);border-left:3px solid var(--accent);
  padding:12px 16px;border-radius:0 4px 4px 0;}
.nlbl{font-size:.6rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
  color:var(--accent);margin-bottom:4px;}
.ntxt{font-size:.8rem;color:var(--text);line-height:1.55;}
.tip{background:#F0F4FF;border-left:3px solid #5B7FD4;padding:12px 16px;border-radius:0 4px 4px 0;}
.tlbl{font-size:.6rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
  color:#5B7FD4;margin-bottom:4px;}
.ttxt{font-size:.8rem;color:var(--text);line-height:1.55;}
.plating{background:#FFF0F5;border-left:3px solid #D45B8A;padding:12px 16px;border-radius:0 4px 4px 0;}
.plbl{font-size:.6rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
  color:#D45B8A;margin-bottom:4px;}
.ptxt{font-size:.8rem;color:var(--text);line-height:1.55;}
.gfooter{background:var(--text);color:rgba(255,255,255,.5);text-align:center;
  padding:32px 24px;font-size:.72rem;letter-spacing:.1em;margin-top:64px;}
.gfooter strong{color:var(--accent);}
</style>
</head>
<body>
<div class="cover">
  <div class="cover-badge">KitchenFounder Professional Series</div>
  <div class="cover-gn">Guide No. 43</div>
  <h1 class="cover-title">Modern Asian Dessert Bar</h1>
  <p class="cover-sub">The Complete Operator's Recipe Guide</p>
  <div class="cover-div"></div>
  <p class="cover-desc">28 signature recipes spanning Japanese kakigori, Taiwanese taro balls, Hong Kong egg waffles, Korean bingsu, and the full spectrum of photogenic Asian desserts. Built for the Instagram generation — every recipe engineered for visual impact, consistent execution, and cafe-scale profitability.</p>
  <div class="cover-meta">
    <div class="cover-mi"><span class="num">28</span><span class="lbl">Recipes</span></div>
    <div class="cover-mi"><span class="num">6</span><span class="lbl">Starters</span></div>
    <div class="cover-mi"><span class="num">10</span><span class="lbl">Main Plates</span></div>
    <div class="cover-mi"><span class="num">4</span><span class="lbl">Sharing</span></div>
    <div class="cover-mi"><span class="num">8</span><span class="lbl">Drinks</span></div>
  </div>
  <div class="cover-ft">KitchenFounder &nbsp;·&nbsp; v7 · 2026 Edition &nbsp;·&nbsp; Inspired by Sydney Haymarket's Dessert Scene</div>
</div>
<div class="pw">
<div class="chef-intro">
  <div class="ci-lbl">From the Chef's Bench</div>
  <p class="ci-text">"I grew up watching my grandmother press purple taro balls by hand in Taipei. Years later I was plating Raindrop Cakes in a Hong Kong hotel kitchen, obsessing over how light caught the wobble of mizu shingen mochi. When I arrived in Sydney and walked through Haymarket for the first time, I felt that same electricity — the queues snaking outside at 10pm, the phones raised to capture every layered bingsu before the first spoon touches it. This is not just sugar and cream. It is storytelling on a plate, for a generation that shares before they eat."</p>
  <p class="ci-text">"Every recipe in this guide has been tested in a high-volume cafe environment. Gram weights are real. Food costs are current Sydney pricing. Plating notes come from direct experience shooting content alongside our social media team. If a dessert does not photograph beautifully, we rework it until it does. Flavour and aesthetics are not in competition here — they are the same thing."</p>
  <p class="ci-text">"A celebrated Haymarket dessert bar gave me the model: keep the menu tight, obsess over visual impact, train every team member on presentation standards. What follows is 28 recipes that can anchor a dessert bar operation from opening day. All metric. All costed. All designed to be executed consistently by a two-person kitchen."</p>
  <div class="ci-sig">— Chef Mei-Lin Chen &nbsp;|&nbsp; Taipei · Hong Kong · Sydney &nbsp;|&nbsp; KitchenFounder Guide #43</div>
</div>
<div class="toc-section">
  <div class="toc-title">Contents</div>
  <div class="toc-sub">28 recipes across 4 categories — all metric, all photographed, all cafe-ready</div>
  <div class="toc-grid">
    <a class="toc-item" href="#r1"><span class="toc-num">01</span><span class="toc-name">Honey Toast Tower</span><span class="toc-cat">Starter</span></a>
    <a class="toc-item" href="#r2"><span class="toc-num">02</span><span class="toc-name">Matcha Shaved Ice Kakigori</span><span class="toc-cat">Starter</span></a>
    <a class="toc-item" href="#r3"><span class="toc-num">03</span><span class="toc-name">Strawberry Crepe Cake</span><span class="toc-cat">Starter</span></a>
    <a class="toc-item" href="#r4"><span class="toc-num">04</span><span class="toc-name">Black Sesame Lava Cake</span><span class="toc-cat">Starter</span></a>
    <a class="toc-item" href="#r5"><span class="toc-num">05</span><span class="toc-name">Taro Ball Soup</span><span class="toc-cat">Starter</span></a>
    <a class="toc-item" href="#r6"><span class="toc-num">06</span><span class="toc-name">Mango Pomelo Sago</span><span class="toc-cat">Starter</span></a>
    <a class="toc-item" href="#r7"><span class="toc-num">07</span><span class="toc-name">Bingsu Korean Shaved Ice</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r8"><span class="toc-num">08</span><span class="toc-name">Raindrop Cake</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r9"><span class="toc-num">09</span><span class="toc-name">Dango Skewers</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r10"><span class="toc-num">10</span><span class="toc-name">Souffle Pancakes</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r11"><span class="toc-num">11</span><span class="toc-name">Crepe Roll</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r12"><span class="toc-num">12</span><span class="toc-name">Churros with Dipping Sauces</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r13"><span class="toc-num">13</span><span class="toc-name">Waffle Tower</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r14"><span class="toc-num">14</span><span class="toc-name">Basque Cheesecake Asian Style</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r15"><span class="toc-num">15</span><span class="toc-name">Coconut Jelly with Mango</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r16"><span class="toc-num">16</span><span class="toc-name">Red Bean Mochi Sundae</span><span class="toc-cat">Main</span></a>
    <a class="toc-item" href="#r17"><span class="toc-num">17</span><span class="toc-name">Asian Dessert Platter for 2</span><span class="toc-cat">Sharing</span></a>
    <a class="toc-item" href="#r18"><span class="toc-num">18</span><span class="toc-name">Boba Dessert Flight</span><span class="toc-cat">Sharing</span></a>
    <a class="toc-item" href="#r19"><span class="toc-num">19</span><span class="toc-name">Instagram Dessert Tower</span><span class="toc-cat">Sharing</span></a>
    <a class="toc-item" href="#r20"><span class="toc-num">20</span><span class="toc-name">Mini Dessert Tasting Box</span><span class="toc-cat">Sharing</span></a>
    <a class="toc-item" href="#r21"><span class="toc-num">21</span><span class="toc-name">Brown Sugar Boba Milk Tea</span><span class="toc-cat">Drink</span></a>
    <a class="toc-item" href="#r22"><span class="toc-num">22</span><span class="toc-name">Matcha Soft Serve Frappe</span><span class="toc-cat">Drink</span></a>
    <a class="toc-item" href="#r23"><span class="toc-num">23</span><span class="toc-name">Taro Boba Latte</span><span class="toc-cat">Drink</span></a>
    <a class="toc-item" href="#r24"><span class="toc-num">24</span><span class="toc-name">Strawberry Yakult Soda</span><span class="toc-cat">Drink</span></a>
    <a class="toc-item" href="#r25"><span class="toc-num">25</span><span class="toc-name">Mango Coconut Slushie</span><span class="toc-cat">Drink</span></a>
    <a class="toc-item" href="#r26"><span class="toc-num">26</span><span class="toc-name">Hojicha Latte</span><span class="toc-cat">Drink</span></a>
    <a class="toc-item" href="#r27"><span class="toc-num">27</span><span class="toc-name">Lychee Pandan Iced Tea</span><span class="toc-cat">Drink</span></a>
    <a class="toc-item" href="#r28"><span class="toc-num">28</span><span class="toc-name">Ube Purple Latte</span><span class="toc-cat">Drink</span></a>
  </div>
</div>
HTML
print "Part 1 (header+TOC) written\n";
