// server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const { Telegraf, Markup } = require('telegraf');

const app = express();

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN не задан в .env');
  process.exit(1);
}
const GAME_URL = (process.env.GAME_URL || `http://localhost:${PORT}/`).replace(/\/?$/, '/');

const bot = new Telegraf(BOT_TOKEN);

// Раздача статики
app.use(express.static(path.join(__dirname, 'public')));

// Простой API для здоровья
app.get('/health', (_req, res) => res.json({ ok: true }));

// Старт бота — кнопка WebApp
bot.start(async (ctx) => {
  await ctx.reply(
    'Привет! 👋 Нажми «Играть», чтобы открыть веб-игру “1000 фактов”.',
    Markup.inlineKeyboard([Markup.button.webApp('🎮 Играть', GAME_URL)])
  );
});

// Альтернативная команда
bot.command('play', async (ctx) => {
  await ctx.reply(
    'Открыть игру:',
    Markup.inlineKeyboard([Markup.button.webApp('🎮 Играть', GAME_URL)])
  );
});

// Запуск
(async () => {
  // Поллинг (без вебхуков, удобно локально)
  bot.launch().then(() => {
    console.log('🤖 Bot polling запущен');
  }).catch((e) => {
    console.error('Ошибка запуска бота:', e);
    process.exit(1);
  });

  app.listen(PORT, () => {
    console.log(`🌐 Web-сервер: http://localhost:${PORT}`);
    console.log(`🎮 GAME_URL: ${GAME_URL}`);
  });

  // Корректная остановка
  process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(0); });
  process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(0); });
})();
