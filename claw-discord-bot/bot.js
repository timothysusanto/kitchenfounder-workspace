// ============================================================
// CLAW DISCORD BOT
// Claude API + Discord.js · Built July 2 2026
// ============================================================
// SETUP:
//   1. npm install
//   2. Copy .env.example to .env and fill in your keys
//   3. node bot.js
// ============================================================

require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// ── Clients ──────────────────────────────────────────────────
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Load system prompt (startup context) ─────────────────────
const SYSTEM_PROMPT_PATH = process.env.SYSTEM_PROMPT_PATH || './system-prompt.md';
let SYSTEM_PROMPT = '';
try {
  SYSTEM_PROMPT = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
  console.log(`✅ System prompt loaded (${SYSTEM_PROMPT.length} chars)`);
} catch (e) {
  console.error('❌ Could not load system prompt file. Check SYSTEM_PROMPT_PATH in .env');
  process.exit(1);
}

// ── Per-channel conversation history ─────────────────────────
// Keeps last N messages for context window
const MAX_HISTORY = 20;
const conversationHistory = new Map(); // channelId → [{role, content}]

function getHistory(channelId) {
  if (!conversationHistory.has(channelId)) {
    conversationHistory.set(channelId, []);
  }
  return conversationHistory.get(channelId);
}

function addToHistory(channelId, role, content) {
  const history = getHistory(channelId);
  history.push({ role, content });
  // Keep only last MAX_HISTORY messages to avoid token overflow
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

function clearHistory(channelId) {
  conversationHistory.set(channelId, []);
}

// ── Ask Claude ────────────────────────────────────────────────
async function askClaude(channelId, userMessage) {
  addToHistory(channelId, 'user', userMessage);

  const response = await claude.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-opus-4-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: getHistory(channelId),
  });

  const reply = response.content[0].text;
  addToHistory(channelId, 'assistant', reply);
  return reply;
}

// ── Split long messages for Discord (2000 char limit) ─────────
function splitMessage(text, maxLength = 1900) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let current = '';
  const lines = text.split('\n');
  for (const line of lines) {
    if ((current + '\n' + line).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

// ── Discord event: ready ──────────────────────────────────────
discord.once('ready', () => {
  console.log(`✅ Claw is online as ${discord.user.tag}`);
  discord.user.setActivity('KitchenFounder · Guide #53', { type: 'WATCHING' });
});

// ── Discord event: message ────────────────────────────────────
discord.on('messageCreate', async (message) => {
  // Ignore other bots
  if (message.author.bot) return;

  const isDM = message.channel.type === 1; // DM channel
  const isMentioned = message.mentions.has(discord.user);
  const channelId = message.channel.id;

  // Respond to:
  // - All DMs
  // - Server messages where Claw is @mentioned
  // - Messages starting with "Claw," or "claw,"
  const startsWithClaw = message.content.toLowerCase().startsWith('claw');
  if (!isDM && !isMentioned && !startsWithClaw) return;

  // Strip the @mention or "Claw," prefix to get clean message
  let userText = message.content
    .replace(`<@${discord.user.id}>`, '')
    .replace(`<@!${discord.user.id}>`, '')
    .replace(/^claw[,:]?\s*/i, '')
    .trim();

  // Special commands
  if (userText.toLowerCase() === '!clear') {
    clearHistory(channelId);
    await message.reply('🧹 Conversation history cleared. Fresh start.');
    return;
  }

  if (userText.toLowerCase() === '!status') {
    const history = getHistory(channelId);
    await message.reply(`🦾 Claw online · Model: ${process.env.CLAUDE_MODEL || 'claude-opus-4-5'} · History: ${history.length} messages · System prompt: ${SYSTEM_PROMPT.length} chars`);
    return;
  }

  if (!userText) {
    await message.reply("Yeah, I'm here. What do you need?");
    return;
  }

  // Show typing indicator
  await message.channel.sendTyping();

  try {
    // Add sender name context so Claude knows who's talking
    const contextualMessage = `[From: ${message.author.username}]\n${userText}`;
    const reply = await askClaude(channelId, contextualMessage);

    // Split and send (Discord has 2000 char limit per message)
    const chunks = splitMessage(reply);
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (error) {
    console.error('Claude API error:', error);
    await message.reply('⚠️ Something went wrong on my end. Try again in a moment.');
  }
});

// ── Start ─────────────────────────────────────────────────────
discord.login(process.env.DISCORD_BOT_TOKEN);
