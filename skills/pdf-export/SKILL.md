# Skill: pdf-export

## Recommended Method: Chrome Print to PDF
This is the ONLY method that produces full-fidelity PDFs with CSS backgrounds.

### Steps
1. Start file server on Lightsail: python3 -m http.server 8081
2. Open Chrome on Windows (Ctrl+P) or Mac (CMD+P)
3. Navigate to: http://54.251.18.206:8081/restaurant-pdfs/v7/FILENAME.html
4. Print dialog: Save as PDF | A4 | Background graphics: ON | Default margins
5. Output: ~2-5MB full-color PDF

## wkhtmltopdf (server-side — limited)
Installed on server but uses unpatched QT build — does NOT render CSS backgrounds.
Produces ~360KB output, missing colors and backgrounds. Use only as fallback.
Working flags: xvfb-run wkhtmltopdf --page-size A4 --margin-top 18mm --margin-bottom 18mm --margin-left 20mm --margin-right 20mm --background --no-images --enable-local-file-access --quiet
Note: --print-media-type flag NOT supported on this server build.
Note: xvfb-run may not be available in current sandbox — check first.

## File serving
Start: cd ~/.openclaw/workspace && python3 -m http.server 8081 &
Stop: kill $(lsof -ti:8081) or pkill -f "http.server 8081"
WARNING: Port 8081 exposes ALL workspace files publicly. Stop server when not in use.
Base URL: http://54.251.18.206:8081/

## PDF file sizes
Chrome method: 2-5MB per guide (full fidelity, all colors)
wkhtmltopdf method: ~360KB (no CSS backgrounds)

## v7 guide HTML locations
All guides: /workspace/restaurant-pdfs/v7/
Naming: brazilian-churrasco.html, thai-street-food.html, japanese-izakaya.html, etc.
