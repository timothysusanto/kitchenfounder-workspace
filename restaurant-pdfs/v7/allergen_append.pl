#!/usr/bin/perl
use strict;
my $file = "/workspace/restaurant-pdfs/v7/modern-asian-dessert-bar.html";
open(my $fh, ">>", $file) or die "Cannot open: $!";

# Legend: G=Gluten, D=Dairy, E=Eggs, N=Nuts, S=Soya, Se=Sesame, B=Boba/Tapioca
# Values: Y=Yes, N=No, M=May contain (cross-contamination risk), *=See note

my $allergen_table = <<'HTML';
<table style="width:100%;border-collapse:collapse;font-size:7.5px;margin-bottom:3mm">
  <thead>
    <tr style="background:var(--accent);color:#fff">
      <th style="padding:2mm 2.5mm;text-align:left;font-weight:700;width:22%">Menu Item</th>
      <th style="padding:2mm;text-align:center;font-weight:700;width:9%">Gluten</th>
      <th style="padding:2mm;text-align:center;font-weight:700;width:9%">Dairy</th>
      <th style="padding:2mm;text-align:center;font-weight:700;width:9%">Eggs</th>
      <th style="padding:2mm;text-align:center;font-weight:700;width:9%">Nuts</th>
      <th style="padding:2mm;text-align:center;font-weight:700;width:9%">Soya</th>
      <th style="padding:2mm;text-align:center;font-weight:700;width:9%">Sesame</th>
      <th style="padding:2mm;text-align:center;font-weight:700;width:24%">Boba/Tapioca ⚑</th>
    </tr>
  </thead>
  <tbody>
HTML

my @items = (
  # name, G, D, E, N, S, Se, B, note
  ["01 · Honey Toast Tower", "Y", "Y", "Y", "M", "M", "N", "N", "Japanese milk bread — gluten. Ice cream — dairy. Honey butter — dairy."],
  ["02 · Matcha Kakigori", "N", "Y", "N", "N", "N", "N", "N", "GF. Condensed milk — dairy. Red bean anko — nut-free. Mochi topping — GF sticky rice flour."],
  ["03 · Strawberry Crepe Cake", "Y", "Y", "Y", "N", "N", "N", "N", "Crepe batter contains wheat flour and eggs. Fresh cream — dairy."],
  ["04 · Black Sesame Lava Cake", "Y", "Y", "Y", "N", "Y", "Y", "N", "Cake batter — gluten, eggs, dairy. Black sesame paste — sesame. Soy lecithin in chocolate — soya."],
  ["05 · Taro Ball Soup", "N", "N", "N", "N", "N", "N", "N", "GF, DF, EF, NF. Taro and sweet potato balls are glutinous rice/tapioca — GF but check coconut milk label for cross-contamination."],
  ["06 · Mango Pomelo Sago", "N", "N", "N", "N", "N", "N", "N", "GF, DF, EF, NF. Sago pearls — tapioca. Coconut milk — check label."],
  ["07 · Korean Bingsu", "N", "Y", "N", "N", "N", "N", "N", "Milk ice base — dairy. Condensed milk — dairy. Toppings vary — advise on specific toppings if allergies present."],
  ["08 · Raindrop Cake", "N", "N", "N", "N", "Y", "N", "N", "GF, DF, EF. Roasted soybean powder (kinako) — soya. Black sugar syrup — GF. Naturally clean allergen profile."],
  ["09 · Japanese Soufflé Pancakes", "Y", "Y", "Y", "N", "N", "N", "N", "Contains gluten (flour), eggs (whole + separated whites), dairy (butter, milk). Main allergen item."],
  ["10 · Crepe Roll", "Y", "Y", "Y", "N", "N", "N", "N", "Crepe — gluten, eggs, dairy. Diplomat cream — dairy, eggs. Mango or strawberry filling — nut-free."],
  ["11 · Churros + 3 Sauces", "Y", "Y", "Y", "N", "Y", "N", "N", "Churro dough — gluten, eggs, dairy. Matcha sauce — GF but check mix. Dark chocolate may contain soya lecithin."],
  ["12 · HK Egg Waffle Tower", "Y", "Y", "Y", "N", "N", "N", "N", "Bubble waffle batter — gluten, eggs, dairy. Ice cream — dairy. Sauce toppings vary."],
  ["13 · Basque Cheesecake", "Y", "Y", "Y", "N", "N", "N", "N", "Cream cheese — dairy. Eggs — present. Flour base — gluten. Classic allergen-heavy item."],
  ["14 · Coconut Jelly", "N", "N", "N", "N", "N", "N", "N", "GF, DF, EF, NF, SF. Made from coconut milk and agar-agar. Clean allergen profile — suitable for most dietary needs."],
  ["15 · Red Bean Mochi Sundae", "N*", "Y", "N", "N", "N", "N", "N", "Mochi skin — GF (rice flour). *Cross-contamination risk in shared kitchen. Ice cream — dairy. Red bean — nut-free."],
  ["16 · Dango Skewers", "N*", "Y", "N", "N", "Y", "N", "N", "Dango — glutinous rice flour (GF). *Kitchen cross-contamination. Tare glaze may contain soya. Matcha and sesame variations: confirm per order."],
  ["17 · Asian Dessert Platter for 2", "Y", "Y", "Y", "M", "M", "M", "N", "Contains multiple items — all major allergens present. Suitable for sharing only where both guests have no severe allergies. Cross-contamination certain."],
  ["18 · Boba Dessert Flight", "N*", "Y", "N", "N", "Y", "N", "Y", "Boba pearls — tapioca (GF). Dessert items vary — see individual items. Taro boba — soya possible in taro paste (check label)."],
  ["19 · Instagram Dessert Tower", "Y", "Y", "Y", "M", "M", "M", "N", "Multi-item tower — all major allergens present. Not suitable for allergy guests. Honey toast + crepe cake + churros all contain gluten, dairy, eggs."],
  ["20 · Mini Dessert Tasting Box", "N*", "Y", "N", "N", "M", "N", "N", "Mix of GF and non-GF items in one box — cross-contamination unavoidable. Raindrop cake and taro balls are GF; mochi is GF. Sago — GF. Dairy present in ice cream items."],
  ["21 · Tiger Brown Sugar Boba", "N", "Y", "N", "N", "N", "N", "Y ⚑", "GF. Oat milk (check GF certified oats). Brown sugar — GF. Tapioca pearls — boba/tapioca choking hazard."],
  ["22 · Matcha Soft Serve Frappe", "N*", "Y", "N", "N", "M", "N", "N", "Oat milk — check GF status. Soft serve — dairy. Whipped cream — dairy. Matcha — GF. *Equipment cross-contamination if blender shared."],
  ["23 · Taro Boba Latte", "N", "N*", "N", "N", "N", "N", "Y ⚑", "GF, EF. Oat milk — DF (check label). Taro paste — DF (if made without dairy). Tapioca pearls — boba choking hazard note."],
  ["24 · Strawberry Yakult Soda", "N", "Y", "N", "N", "N", "N", "N", "GF. Yakult — dairy (contains milk solids). Strawberry purée — GF. Soda water — GF. Clean except dairy."],
  ["25 · Mango Coconut Slushie", "N", "N", "N", "N", "N", "N", "N", "GF, DF, EF, NF, SF — completely clean allergen profile. Fresh mango, coconut milk, ice. Check coconut milk brand for additives."],
  ["26 · Hojicha Latte", "N", "N*", "N", "N", "N", "N", "N", "GF. Oat milk — DF. Honey — GF, NF. No significant allergens. Cross-contamination from shared steam wand only risk."],
  ["27 · Lychee Pandan Iced Tea", "N", "N", "N", "N", "N", "N", "N", "GF, DF, EF, NF, SF. Jasmine cold brew, pandan syrup, lychee. Cleanest allergen profile on the drinks menu."],
  ["28 · Ube Purple Latte", "N", "N*", "N", "N", "N", "N", "N", "GF. Oat milk — DF. Ube extract — GF. Espresso shot — GF. Note: ube is a purple yam — not a nut. No tree nut or peanut allergens."],
);

my $row = 0;
for my $item (@items) {
  my ($name, $g, $d, $e, $n, $s, $se, $b, $note) = @$item;
  my $bg = ($row % 2 == 0) ? "#FAFAF8" : "#FFFFFF";
  
  my %colours = ('Y' => '#B91C1C', 'N' => '#166534', 'M' => '#92400E', 'Y ⚑' => '#7C3AED');
  my %bgs = ('Y' => '#FEE2E2', 'N' => '#F0FDF4', 'M' => '#FEF3C7', 'Y ⚑' => '#EDE9FE');
  
  sub cell {
    my ($val) = @_;
    my %c = ('Y' => '#B91C1C', 'N' => '#166534', 'M' => '#92400E', 'Y ⚑' => '#7C3AED');
    my %b = ('Y' => '#FEE2E2', 'N' => '#F0FDF4', 'M' => '#FEF3C7', 'Y ⚑' => '#EDE9FE');
    my $clean = $val; $clean =~ s/ ⚑//;
    my $color = $c{$val} // '#333';
    my $bg = $b{$val} // '#fff';
    return qq{<td style="padding:1.5mm 2mm;text-align:center;background:$bg;color:$color;font-weight:700;font-size:7px">$clean</td>};
  }
  
  $allergen_table .= qq{    <tr style="background:$bg">
      <td style="padding:1.5mm 2.5mm;font-size:7.5px;font-weight:600;color:var(--accent)">$name</td>
} . cell($g) . "\n" . cell($d) . "\n" . cell($e) . "\n" . cell($n) . "\n" . cell($s) . "\n" . cell($se) . "\n" . cell($b) . qq{
    </tr>
    <tr style="background:$bg"><td colspan="8" style="padding:0.5mm 2.5mm 2mm;font-size:7px;color:var(--mid);line-height:1.5">$note</td></tr>\n};
  $row++;
}

$allergen_table .= "  </tbody>\n</table>\n";
print $fh $allergen_table;

print $fh <<'HTML2';
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm;margin-bottom:3mm;font-size:7.5px">
  <div style="background:#FEE2E2;padding:2.5mm 3mm;border-left:3px solid #B91C1C"><strong style="color:#B91C1C">Y = Contains</strong> — allergen definitively present in standard recipe</div>
  <div style="background:#F0FDF4;padding:2.5mm 3mm;border-left:3px solid #166534"><strong style="color:#166534">N = Does not contain</strong> — not in recipe but cross-contamination risk in shared kitchen</div>
  <div style="background:#FEF3C7;padding:2.5mm 3mm;border-left:3px solid #92400E"><strong style="color:#92400E">M = May contain</strong> — not in recipe but present in multi-item dishes or shared equipment</div>
</div>

<div class="note-box" style="margin-bottom:3mm;background:#EDE9FE;border-left-color:#7C3AED">
  <strong style="color:#7C3AED">⚑ Boba/Tapioca Choking Hazard Notice:</strong> All drinks and desserts containing tapioca boba pearls present a choking hazard for children under 3 years of age and for elderly guests or those with swallowing difficulties. Pearls should not be served to young children without parental supervision. Advise staff to mention this when boba drinks are ordered for or near young children. Post a visible notice at the ordering counter per NSW Food Authority recommendation.
</div>

<div class="note-box" style="background:#F0FDF4;border-left-color:#166534">
  <strong style="color:#166534">★ Naturally Allergen-Friendly Items (DF + GF + EF + NF):</strong> Coconut Jelly (14), Mango Pomelo Sago (06), Mango Coconut Slushie (25), Lychee Pandan Iced Tea (27), Taro Ball Soup (05 — check coconut milk). These items are excellent options for guests with multiple dietary needs. Always confirm with kitchen on prep day as recipes may be adapted for seasonal variations.
</div>

<div class="page-footer"><span class="pf-l">KitchenFounder · Modern Asian Dessert Bar</span><span class="pf-r">v7 · 2026 Edition · Module 10 · Allergen Guide</span></div>
</div>
HTML2

close($fh);
print "Allergen table written.\n";
