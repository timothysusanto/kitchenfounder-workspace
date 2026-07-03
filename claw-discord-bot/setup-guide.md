# Claw Discord Bot Setup Guide

## Step 1 - Anthropic API key
1. Go to console.anthropic.com
2. API Keys > Create Key > name it Claw Discord Bot
3. Copy the sk-ant-... key and save it

## Step 2 - Create Discord Bot
1. discord.com/developers/applications
2. New Application > name Claw > Create
3. Bot > Add Bot > Reset Token > copy token
4. Enable: MESSAGE CONTENT INTENT + SERVER MEMBERS INTENT
5. OAuth2 > URL Generator > bot scope > Send Messages + Read Messages permissions
6. Open generated URL in browser > Add to your server

## Step 3 - MacBook setup (Terminal)
cd ~/Documents
git clone https://github.com/timothysusanto/kitchenfounder-workspace.git
cd kitchenfounder-workspace/claw-discord-bot
npm install
cp .env.example .env
# then open .env and fill in your ANTHROPIC_API_KEY and DISCORD_BOT_TOKEN
cp ../products/claw-startup-context.md ./system-prompt.md

## Step 4 - Start the bot
node bot.js
# Should see: System prompt loaded + Claw is online

## Step 5 - Test in Discord
@Claw hey you there?
Claw, what is my guide count?
# or DM the bot directly

## Step 6 - Auto-start on Mac boot (launchd)
# Create ~/Library/LaunchAgents/com.claw.discordbot.plist
# Replace YOUR_USERNAME with output of: whoami

## Bot commands
!clear  = reset conversation history
!status = show model + history count

## Monthly cost
Claude.ai Max: $100
Anthropic API: ~$10-20
MacBook hosting: $0
Total: ~$110-120/mo flat
