#!/bin/bash
cd /home/ubuntu/.openclaw/workspace/shopify-covers

for guide in thai brazilian japanese; do
  echo "Converting $guide..."
  xvfb-run wkhtmltoimage \
    --width 1200 \
    --height 1200 \
    --quality 95 \
    --format png \
    --quiet \
    ${guide}-cover.html \
    ${guide}-cover.png
  echo "$guide done: $(ls -lh ${guide}-cover.png 2>/dev/null | awk '{print $5}')"
done

echo "All covers converted:"
ls -lh *.png

# Profile photo
echo "Converting profile photo..."
xvfb-run wkhtmltoimage \
  --width 800 \
  --height 800 \
  --quality 95 \
  --format png \
  --quiet \
  kf-profile.html \
  kf-profile.png
echo "Profile done: $(ls -lh kf-profile.png 2>/dev/null | awk '{print $5}')"
