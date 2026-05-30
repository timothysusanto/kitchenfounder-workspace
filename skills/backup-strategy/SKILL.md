# Skill: backup-strategy

## NEVER do this
tar -czf backup.tar.gz /workspace/  ← tars entire 10GB workspace, spikes RAM, crashes server

## Safe backup approach — git push (preferred)
cd /home/ubuntu/.openclaw/workspace
git add -A
git commit -m "Manual backup $(date +%Y-%m-%d)"
git push origin main
This is lightweight, incremental, and never crashes the server.

## If tar is needed — chunk it, never whole workspace
Guides only (safe): tar -czf /tmp/guides-backup.tar.gz /workspace/restaurant-pdfs/v7/
Products only: tar -czf /tmp/products-backup.tar.gz /workspace/products/
Skills only: tar -czf /tmp/skills-backup.tar.gz /workspace/skills/
Keep each tar under 200MB. Check size first with: du -sh /workspace/restaurant-pdfs/v7/

## Nightly auto-backup (cron — already configured)
Runs at 2 AM UTC: git add -A && git commit && git push origin main
Log at: /home/ubuntu/git-backup.log
GitHub repo: https://github.com/timothysusanto/kitchenfounder-workspace (private)

## Token rotation reminder
GitHub PAT stored in git remote URL on server.
Token has no expiration — rotate manually every 6-12 months.
To update: git remote set-url origin https://NEW_TOKEN@github.com/timothysusanto/kitchenfounder-workspace.git

## Lightsail instance specs
Server: AWS Lightsail, ubuntu, IP 54.251.18.206
Disk: 58GB total, ~10GB used, 48GB free
RAM: Limited — avoid memory-intensive operations (large tar, wkhtmltopdf batch)
