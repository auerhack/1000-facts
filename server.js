// server.js — Render (CommonJS), webhook + static
require('dotenv').config();
const path = require('path');
const express = require('express');
const { Telegraf, Markup } = require('telegraf');

// fallback fetch для Node < 18
const hasGlobalFetch = typeof fetch === 'function';
const fetchSafe = hasGlobalFetch
  ? fetch
  : (...args) => import('node-fetch').then(m => m.default(...args));

const app = express();
app.use(express.json()); // важно для /bot

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN (или BOT_TOKEN) не задан');
  process.exit(1);
}

const GAME_URL = (process.env.WEB_APP_URL || process.env.GAME_URL || '').replace(/\/?$/, '/');
const SETUP_SECRET = process.env.SETUP_SECRET || 'my-secret-42';

const bot = new Telegraf(BOT_TOKEN, { webhookReply: true });

// Команды
bot.start(async (ctx) => {
  await ctx.reply(
    'Привет! 👋 Нажми «Играть», чтобы открыть веб-игру “1000 фактов”.',
    Markup.inlineKeyboard([Markup.button.webApp('🎮 Играть', GAME_URL || `${ctx?.telegram?.options?.apiRoot || ''}`)])
  );
});
bot.command('play', async (ctx) => {
  await ctx.reply(
    'Открыть игру:',
    Markup.inlineKeyboard([Markup.button.webApp('🎮 Играть', GAME_URL)])
  );
});

// Статика (игра)
const __dirname = __dirname || path.dirname(require.main.filename);
app.use(express.static(path.join(__dirname, 'public')));

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Webhook endpoint
const WEBHOOK_PATH = '/bot';
app.post(WEBHOOK_PATH, bot.webhookCallback(WEBHOOK_PATH));

// One-time webhook setup
app.get('/setup', async (req, res) => {
  if (req.query.secret !== SETUP_SECRET) return res.status(403).send('Forbidden');

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const publicBase = `${proto}://${host}`;
  const webhookUrl = `${publicBase}${WEBHOOK_PATH}`;

  try {
    const api = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
    const r = await fetchSafe(api);
    const j = await r.json();
    res.json({ ok: true, webhookUrl, result: j });
  } catch (e) {
    console.error('Webhook setup error:', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Старт сервера (без bot.launch!)
app.listen(PORT, () => {
  console.log(`🌐 Server running on :${PORT}`);
  console.log(`📦 Static: /public`);
  console.log(`🤖 Webhook: POST ${WEBHOOK_PATH}`);
  if (GAME_URL) console.log(`🎮 GAME_URL: ${GAME_URL}`);
});
