// api/bot.js
import { Telegraf, Markup } from 'telegraf';

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL;   // например: https://your-app.vercel.app/
const SETUP_SECRET = process.env.SETUP_SECRET; // любой секрет для разовой установки вебхука

if (!BOT_TOKEN)   throw new Error('Missing TELEGRAM_BOT_TOKEN');
if (!WEB_APP_URL) throw new Error('Missing WEB_APP_URL');

const bot = new Telegraf(BOT_TOKEN);

// /start и /play — кнопка WebApp на твой Vercel-сайт
bot.start(async (ctx) => {
  await ctx.reply(
    'Привет! 👋 Нажми «Играть», чтобы открыть “1000 фактов”.',
    Markup.inlineKeyboard([Markup.button.webApp('🎮 Играть', WEB_APP_URL)])
  );
});
bot.command('play', async (ctx) => {
  await ctx.reply(
    'Открыть игру:',
    Markup.inlineKeyboard([Markup.button.webApp('🎮 Играть', WEB_APP_URL)])
  );
});

export default async function handler(req, res) {
  // Разовая установка вебхука: GET /api/bot?setup=1&secret=...
  if (req.method === 'GET' && req.query?.setup) {
    if (!SETUP_SECRET || req.query.secret !== SETUP_SECRET) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers.host;
    const webhookUrl = `${proto}://${host}/api/bot`;

    const api = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
    const r = await fetch(api);
    const j = await r.json();
    return res.status(200).json({ ok: true, webhookUrl, setWebhook: j });
  }

  // Сам webhook: Telegram шлёт POST
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
    } catch (e) {
      console.error('bot error:', e);
      // всё равно отдаём 200, чтобы Telegram не ретраил
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'method not allowed' });
}
