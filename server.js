// server.js (ESM-версия)
import 'dotenv/config';
import path from 'path';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не задан');
  process.exit(1);
}
const GAME_URL = (process.env.WEB_APP_URL || process.env.GAME_URL || '').replace(/\/?$/, '/');
const SETUP_SECRET = process.env.SETUP_SECRET || 'my-secret-42';

const bot = new Telegraf(BOT_TOKEN, { webhookReply: true });

bot.start(async (ctx) => {
  await ctx.reply(
    'Привет 👋 Нажми «Играть», чтобы открыть игру!',
    Markup.inlineKeyboard([Markup.button.webApp('🎮 Играть', GAME_URL)])
  );
});

bot.command('play', async (ctx) => {
  await ctx.reply(
    'Открыть игру:',
    Markup.inlineKeyboard([Markup.button.webApp('🎮 Играть', GAME_URL)])
  );
});

// статика
app.use(express.static(path.join(__dirname, 'public')));

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// webhook
const WEBHOOK_PATH = '/bot';
app.post(WEBHOOK_PATH, bot.webhookCallback(WEBHOOK_PATH));

// setup
app.get('/setup', async (req, res) => {
  if (req.query.secret !== SETUP_SECRET) {
    return res.status(403).send('Forbidden');
  }
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const publicBase = `${proto}://${host}`;
  const webhookUrl = `${publicBase}${WEBHOOK_PATH}`;
  try {
    const api = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
    const r = await fetch(api);
    const j = await r.json();
    res.json({ ok: true, webhookUrl, result: j });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on :${PORT}`);
  console.log(`🤖 Webhook endpoint: POST ${WEBHOOK_PATH}`);
  console.log(`🎮 GAME_URL: ${GAME_URL}`);
});
