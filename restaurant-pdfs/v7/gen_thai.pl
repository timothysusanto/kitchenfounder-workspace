#!/usr/bin/perl
use strict;
use warnings;
my $f = "/workspace/restaurant-pdfs/v7/thai-dessert-bar.html";
open(my $fh, ">", $f) or die "Cannot open $f: $!";

# ── HEAD + CSS ──────────────────────────────────────────────────────────────
print $fh <<'HTML';
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KitchenFounder Guide #42 — Thai Dessert Bar · v7 · 2026 Edition</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #FAFAF8;
    --text: #1C1C1C;
    --gold: #C8922A;
    --gold-light: #F0D99A;
    --gold-pale: #FDF6E3;
    --muted: #6B6B6B;
    --border: #E2D9C8;
    --card-bg: #FFFFFF;
    --section-bg: #F5F0E8;
    --danger: #8B2020;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    line-height: 1.65;
  }
  @media print {
    @page { size: A4; margin: 0; }
    body { background: var(--bg); print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none; }
    .recipe-card { page-break-inside: avoid; }
    .section-header { page-break-inside: avoid; }
    .cover { page-break-after: always; }
    .toc-page { page-break-after: always; }
    .intro-page { page-break-after: always; }
  }
  .cover {
    width: 210mm;
    min-height: 297mm;
    background: linear-gradient(160deg, #1A0A1A 0%, #2B0D3A 40%, #1C1C1C 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 40px;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(ellipse at 50% 40%, rgba(200,146,42,0.18) 0%, transparent 70%);
  }
  .cover-badge {
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--gold);
    border: 1px solid var(--gold);
    padding: 6px 18px;
    margin-bottom: 40px;
    position: relative;
  }
  .cover-guide-num {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: rgba(200,146,42,0.7);
    letter-spacing: 2px;
    margin-bottom: 16px;
    position: relative;
  }
  .cover-title {
    font-family: 'Playfair Display', serif;
    font-size: 52px;
    font-weight: 700;
    color: #FAFAF8;
    line-height: 1.15;
    margin-bottom: 12px;
    position: relative;
  }
  .cover-subtitle {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    font-style: italic;
    color: var(--gold);
    margin-bottom: 32px;
    position: relative;
  }
  .cover-divider {
    width: 80px;
    height: 2px;
    background: var(--gold);
    margin: 0 auto 32px;
    position: relative;
  }
  .cover-desc {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: rgba(250,250,248,0.65);
    max-width: 480px;
    line-height: 1.8;
    margin-bottom: 50px;
    position: relative;
  }
  .cover-stats {
    display: flex;
    gap: 40px;
    margin-bottom: 50px;
    position: relative;
  }
  .cover-stat { text-align: center; }
  .cover-stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    color: var(--gold);
  }
  .cover-stat-label {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(250,250,248,0.5);
    margin-top: 4px;
  }
  .cover-edition {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(250,250,248,0.4);
    position: absolute;
    bottom: 36px;
  }
  .cover-icon {
    font-size: 80px;
    margin-bottom: 20px;
    position: relative;
    opacity: 0.9;
  }
  .page {
    width: 210mm;
    padding: 18mm 18mm 16mm;
    background: var(--bg);
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--gold);
    padding-bottom: 10px;
    margin-bottom: 24px;
  }
  .page-header-brand {
    font-family: 'Playfair Display', serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--gold);
    letter-spacing: 1px;
  }
  .page-header-info {
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .toc-page { background: var(--section-bg); }
  .toc-title {
    font-family: 'Playfair Display', serif;
    font-size: 36px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 8px;
  }
  .toc-subtitle {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 28px;
    letter-spacing: 0.5px;
  }
  .toc-section { margin-bottom: 20px; }
  .toc-section-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--gold-light);
  }
  .toc-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 5px 0;
    border-bottom: 1px dotted var(--border);
  }
  .toc-item-name { font-size: 12px; color: var(--text); }
  .toc-item-num { font-size: 10px; color: var(--gold); font-weight: 600; }
  .chef-letter {
    background: var(--gold-pale);
    border-left: 4px solid var(--gold);
    padding: 28px 32px;
    border-radius: 2px;
    margin-bottom: 28px;
  }
  .chef-letter-heading {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-style: italic;
    color: var(--text);
    margin-bottom: 14px;
  }
  .chef-letter p {
    font-size: 12.5px;
    line-height: 1.85;
    color: #3A3A3A;
    margin-bottom: 12px;
  }
  .chef-letter-sig {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-style: italic;
    color: var(--gold);
    margin-top: 16px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 20px;
  }
  .info-box {
    background: var(--card-bg);
    border: 1px solid var(--border);
    padding: 16px 18px;
    border-radius: 3px;
  }
  .info-box-title {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
  }
  .info-box p { font-size: 11.5px; line-height: 1.7; color: var(--text); }
  .section-header {
    background: linear-gradient(135deg, #1A0A1A 0%, #2B0D3A 100%);
    padding: 28px 30px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .section-header::after {
    content: '';
    position: absolute;
    top: 0; right: 0; bottom: 0;
    width: 4px;
    background: var(--gold);
  }
  .section-header-num {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 6px;
  }
  .section-header-title {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: #FAFAF8;
    margin-bottom: 6px;
  }
  .section-header-desc {
    font-size: 12px;
    color: rgba(250,250,248,0.6);
    font-style: italic;
  }
  .recipe-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  .recipe-card-header {
    background: linear-gradient(135deg, var(--gold-pale) 0%, #FFF9EE 100%);
    border-bottom: 2px solid var(--gold);
    padding: 16px 20px 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .recipe-number {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: var(--gold);
    line-height: 1;
    margin-right: 14px;
    flex-shrink: 0;
  }
  .recipe-title-block { flex: 1; }
  .recipe-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
    margin-bottom: 4px;
  }
  .recipe-subtitle {
    font-size: 11px;
    color: var(--muted);
    font-style: italic;
    line-height: 1.4;
  }
  .recipe-meta-right {
    text-align: right;
    flex-shrink: 0;
    margin-left: 10px;
  }
  .recipe-cost {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 700;
    color: var(--gold);
  }
  .recipe-cost-label {
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .allergen-tags {
    display: flex;
    gap: 4px;
    margin-top: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .tag {
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.5px;
    padding: 2px 6px;
    border-radius: 2px;
    border: 1px solid var(--gold);
    color: var(--gold);
    background: transparent;
  }
  .tag.gf { border-color: #4A7C59; color: #4A7C59; }
  .tag.vg { border-color: #2E6B4F; color: #2E6B4F; }
  .tag.nf { border-color: #8B6914; color: #8B6914; }
  .tag.df { border-color: #2C5F8A; color: #2C5F8A; }
  .recipe-body { padding: 16px 20px; }
  .recipe-two-col {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 20px;
    margin-bottom: 14px;
  }
  .ingredients-block h4,
  .method-block h4 {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--gold-light);
  }
  .ingredients-list { list-style: none; }
  .ingredients-list li {
    font-size: 11.5px;
    padding: 3px 0;
    border-bottom: 1px solid #F0ECE4;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .ingredient-name { color: var(--text); }
  .ingredient-qty { color: var(--muted); font-weight: 500; white-space: nowrap; font-size: 11px; }
  .method-list { list-style: none; counter-reset: method-steps; }
  .method-list li {
    counter-increment: method-steps;
    font-size: 11.5px;
    padding: 4px 0 4px 22px;
    border-bottom: 1px solid #F0ECE4;
    position: relative;
    line-height: 1.6;
  }
  .method-list li::before {
    content: counter(method-steps);
    position: absolute;
    left: 0;
    font-size: 9px;
    font-weight: 700;
    color: var(--gold);
    background: var(--gold-pale);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 5px;
  }
  .recipe-notes {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-top: 12px;
  }
  .note-box {
    background: var(--section-bg);
    border-left: 3px solid var(--gold);
    padding: 10px 12px;
    border-radius: 0 2px 2px 0;
  }
  .note-box.tip { border-left-color: #4A7C59; }
  .note-box.plating { border-left-color: #8B6914; }
  .note-box-title {
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 5px;
  }
  .note-box.tip .note-box-title { color: #4A7C59; }
  .note-box.plating .note-box-title { color: #8B6914; }
  .note-box p { font-size: 10.5px; line-height: 1.6; color: #3A3A3A; }
  .sourcing-bar {
    background: linear-gradient(90deg, #1A0A1A, #2B0D3A);
    padding: 8px 14px;
    margin-top: 12px;
    border-radius: 2px;
    font-size: 10.5px;
    color: rgba(250,250,248,0.8);
  }
  .sourcing-bar strong {
    color: var(--gold);
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-right: 6px;
  }
  .drink-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 16px 20px;
    margin-bottom: 16px;
    page-break-inside: avoid;
  }
  .drink-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--gold-light);
  }
  .drink-number {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--gold);
    margin-right: 12px;
    flex-shrink: 0;
  }
  .drink-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }
  .drink-subtitle { font-size: 10.5px; color: var(--muted); font-style: italic; }
  .drink-two-col {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 16px;
    margin-bottom: 10px;
  }
  .sharing-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-top: 3px solid var(--gold);
    border-radius: 4px;
    padding: 20px;
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  .sharing-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 4px;
  }
  .sharing-card-sub { font-size: 10.5px; color: var(--muted); font-style: italic; margin-bottom: 14px; }
  .footer-bar {
    background: #1A0A1A;
    padding: 20px 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 30px;
  }
  .footer-brand {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    color: var(--gold);
  }
  .footer-info { font-size: 10px; color: rgba(250,250,248,0.4); text-align: right; }
</style>
</head>
<body>
HTML

print "Part 1 (head+CSS) done\n";
close $fh;
