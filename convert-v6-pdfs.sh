#!/bin/bash
V6=~/.openclaw/workspace/restaurant-pdfs/v6
OUT=~/.openclaw/workspace/restaurant-pdfs/pdfs/v6
mkdir -p $OUT

guides="thai-street-food japanese-izakaya brazilian-churrasco moroccan-riad-cafe spanish-tapas-bar korean-street-food modern-indian-chai mediterranean-meze tokyo-kissaten beach-shack-fine-casual parisian-brasserie nyc-bodega-elevated mexican-taqueria"

for g in $guides; do
  echo "Converting $g..."
  xvfb-run wkhtmltopdf \
    --page-size A4 \
    --margin-top 0mm --margin-bottom 0mm \
    --margin-left 0mm --margin-right 0mm \
    --background \
    --no-images \
    --enable-local-file-access \
    --quiet \
    "$V6/$g.html" "$OUT/$g.pdf"
  echo "  Done: $(du -sh $OUT/$g.pdf 2>/dev/null | cut -f1)"
done

echo ""
echo "=== ALL 13 DONE ==="
ls -lh $OUT/*.pdf
