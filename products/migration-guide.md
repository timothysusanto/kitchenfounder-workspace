# Migration Guide — Claude Max + Composio Discord + MacBook Server
*Built July 2, 2026 · For Mothy*

---

## PART 1 — Composio Discord Setup
*Goal: Message Claw in Discord → Claude.ai Max replies*

### What you need first
- Claude.ai Max account ($100/mo) ✅
- Discord account ✅
- Composio account (free) — composio.dev
- Anthropic API key (separate from Claude.ai — get at console.anthropic.com, ~$5–20/mo extra depending on usage)

> **Note:** Claude.ai Max and the Anthropic API are different products.
> Claude.ai Max = web UI with flat fee
> Anthropic API = pay-per-token for apps like Composio
> For Composio you need the API key. Budget ~$10–20/mo for your usage level.

---

### Step-by-Step Composio Setup

**Step 1 — Create Composio account**
1. Go to composio.dev
2. Sign up with Google or email
3. You land on the dashboard

**Step 2 — Connect Discord**
1. Left sidebar → Integrations → search "Discord"
2. Click Connect → Authorize with your Discord account
3. Select the server + channel where you want Claw to live
4. Copy your Discord Bot Token (Composio walks you through creating one at discord.com/developers)

**Step 3 — Connect Claude / Anthropic**
1. Left sidebar → Integrations → search "Anthropic" or "Claude"
2. Paste your Anthropic API key from console.anthropic.com
3. Select model: claude-opus-4 (best) or claude-sonnet-4-5

**Step 4 — Create the Workflow**
1. Go to Workflows → New Workflow
2. **Trigger:** Discord — "New message in channel" or "Direct message received"
3. **Action 1:** Claude — "Send message to Claude"
   - In the system prompt box, paste the full contents of claw-startup-context.md
   - This loads me up with full memory every call
4. **Action 2:** Discord — "Send message" → reply with Claude's response
5. Save + Enable

**Step 5 — Test it**
- Go to your Discord channel
- Type: "Claw, you there?"
- Should reply within a few seconds

---

### System Prompt to paste into Composio

Copy everything from your `claw-startup-context.md` file and paste it as the system prompt in Step 4. That's what loads my memory on every message.

To get the file content:
```
# On Lightsail (before migration):
cat ~/.openclaw/workspace/products/claw-startup-context.md
```

Or open it from GitHub after pushing.

---

### Composio Tips
- Free plan: 1,000 tasks/month (plenty for personal use)
- If you hit limits: $19/mo paid plan = 10,000 tasks
- Update the system prompt whenever you update MEMORY.md
- You can have multiple workflows — one for Discord DMs, one for a server channel

---

## PART 2 — Move File Server to MacBook
*Goal: Serve your HTML guides locally at localhost:8081 so Chrome can print PDFs*

### What you need
- MacBook (any modern Mac) ✅
- Node.js installed (check: `node -v` in Terminal)
- Your GitHub repo cloned locally

---

### Step-by-Step MacBook Server Setup

**Step 1 — Install Node.js (if not already)**
```bash
# Check first:
node -v

# If not installed, go to nodejs.org and download LTS
# Or use Homebrew:
brew install node
```

**Step 2 — Clone your GitHub repo**
```bash
cd ~/Documents
git clone https://github.com/timothysusanto/kitchenfounder-workspace.git
cd kitchenfounder-workspace
```

**Step 3 — Install a simple file server**
```bash
npm install -g http-server
```

**Step 4 — Start the server**
```bash
cd ~/Documents/kitchenfounder-workspace
http-server -p 8081 --cors
```

**Step 5 — Open a guide in Chrome**
```
http://localhost:8081/restaurant-pdfs/v7/kakigoricompleted-v2.html
```
Then: CMD+P → Legal · 80% · Background graphics ON → Save as PDF ✅

---

### Make it start automatically on login (optional but recommended)

**Option A — Simple: add to shell profile**
```bash
# Add this line to ~/.zshrc or ~/.bash_profile:
alias startclaw="cd ~/Documents/kitchenfounder-workspace && http-server -p 8081 --cors"

# Then just type in Terminal:
startclaw
```

**Option B — Auto-start with launchd (runs in background always)**

Create the file `~/Library/LaunchAgents/com.kitchenfounder.server.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.kitchenfounder.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/http-server</string>
    <string>/Users/YOUR_USERNAME/Documents/kitchenfounder-workspace</string>
    <string>-p</string>
    <string>8081</string>
    <string>--cors</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>
```

Replace `YOUR_USERNAME` with your Mac username (check with `whoami` in Terminal).

Then load it:
```bash
launchctl load ~/Library/LaunchAgents/com.kitchenfounder.server.plist
```

Server now starts automatically every time your Mac boots. Access at `localhost:8081`.

---

### Keeping files in sync (GitHub → MacBook)

Every time you want the latest guides on your MacBook:
```bash
cd ~/Documents/kitchenfounder-workspace
git pull
```

Or set up a daily cron to auto-pull:
```bash
crontab -e
# Add this line:
0 9 * * * cd ~/Documents/kitchenfounder-workspace && git pull >> ~/logs/gitpull.log 2>&1
```
Pulls every morning at 9am automatically.

---

## PART 3 — Full Migration Checklist

### Do in order:

- [ ] **1. Git push from Lightsail** — backup everything NOW
  ```
  ssh ubuntu@54.251.18.206
  cd ~/.openclaw/workspace
  git add -A && git commit -m "Pre-migration full backup July 2026" && git push
  ```

- [ ] **2. Claude.ai Max** — subscribe at claude.ai
- [ ] **3. Create Project** — "Claw · KitchenFounder" in Claude Projects
- [ ] **4. Upload to Project Knowledge:**
  - claw-startup-context.md
  - MEMORY.md
  - USER.md
  - SOUL.md
- [ ] **5. Test Claude Projects** — start a chat, confirm Claw responds correctly
- [ ] **6. Get Anthropic API key** — console.anthropic.com (for Composio)
- [ ] **7. Composio setup** — composio.dev (follow Part 1 above)
- [ ] **8. Test Discord** — send a message, confirm reply
- [ ] **9. Clone repo to MacBook** — follow Part 2 above
- [ ] **10. Start MacBook file server** — confirm localhost:8081 works
- [ ] **11. Test PDF printing** — open a guide, print to PDF
- [ ] **12. Cancel OpenClaw / downgrade Lightsail** — only after everything above works

---

## Cost After Migration

| Item | Monthly |
|---|---|
| Claude.ai Max | $100 |
| Anthropic API (Composio) | ~$10–20 |
| Composio | Free (or $19 if >1K tasks) |
| GitHub | Free |
| MacBook file server | Free |
| Lightsail (cancel) | $0 |
| **Total** | **~$110–140/mo flat** |

vs current: $20 Lightsail + unpredictable Bedrock costs (hit $505 once)

---

*File saved: /workspace/products/migration-guide.md*
*URL: http://54.251.18.206:8081/products/migration-guide.md*
