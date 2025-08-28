/* public/game.js
 * Игра "1000 фактов": тап справа -> следующий факт, тап слева -> предыдущий.
 * Случайная "колода" без повторов, затем автоперетасовка.
 * Canvas fullscreen, автоподгон текста, плавная анимация.
 */

// --- Анти-зум (pinch, ctrl+wheel, double-tap) --- //
(() => {
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => {
    document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  });
  document.addEventListener('touchmove', e => {
    if (e.scale && e.scale !== 1) e.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  window.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_'].includes(e.key)) {
      e.preventDefault();
    }
  });
})();

// --- Telegram WebApp UX (необязательно) --- //
const tg = window.Telegram?.WebApp;
try {
  tg?.ready();
  tg?.expand();
  tg?.MainButton?.hide();
} catch (_) { /* noop */ }

const canvas   = document.getElementById('game');
const ctx      = canvas.getContext('2d');

const elIdx    = document.getElementById('idx');
const elTotal  = document.getElementById('total');
const btnCopy  = document.getElementById('btnCopy');

let DPR = Math.max(1, window.devicePixelRatio || 1);
let W = 0, H = 0;

let facts = [];
let index = -1;
let anim = { playing: false, text: '', lines: [], startTs: 0 };

// Случайная последовательность без повторов:
let order = [];
let cur = -1;

/* ---------- Canvas sizing ---------- */
function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);
  canvas.width  = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize, { passive: true });
resize();

/* ---------- Background ---------- */
function drawBackground() {
  const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H));
  g.addColorStop(0, '#101726');
  g.addColorStop(1, '#0b0f15');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  const step = 32;
  ctx.beginPath();
  for (let x = 0; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ---------- Text layout ---------- */
function wrapText(text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(/\s+/g);
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    const w = ctx.measureText(test).width;
    if (w <= maxWidth) { line = test; }
    else { if (line) lines.push(line); line = words[i]; }
  }
  if (line) lines.push(line);
  return lines;
}

function layoutText(text) {
  const pad = Math.min(W, H) * 0.08;
  const maxWidth = W - pad * 2;
  const maxHeight = H - pad * 2;

  let fontSize = Math.floor(Math.min(W, H) * 0.05);
  let lines, lineHeight;
  for (let tries = 0; tries < 40; tries++) {
    const font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    lines = wrapText(text, maxWidth, font);
    lineHeight = Math.floor(fontSize * 1.25);
    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= maxHeight) break;
    fontSize -= 2;
    if (fontSize < 14) break;
  }
  return { lines, fontSize, lineHeight, pad };
}

/* ---------- Rendering ---------- */
function render() {
  drawBackground();

  ctx.fillStyle = 'rgba(255,255,255,0.66)';
  ctx.font = '500 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('тап справа → следующий | тап слева → предыдущий', W / 2, 28);

  if (!anim.playing) { requestAnimationFrame(render); return; }

  const duration = 450;
  const now = performance.now();
  const t = Math.min(1, (now - anim.startTs) / duration);
  const ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;

  const { lines, fontSize, lineHeight } = anim;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf0f6';
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;

  const totalHeight = lines.length * lineHeight;
  let y = (H - totalHeight) / 2;

  ctx.save();
  ctx.globalAlpha = ease;
  lines.forEach((line, i) => {
    const localY = y + i * lineHeight - (1 - ease) * 10;
    ctx.fillText(line, W / 2, localY);
  });
  ctx.restore();

  requestAnimationFrame(render);
}

/* ---------- Random order ---------- */
function shuffleOrder(n) {
  order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  cur = -1;
}

/* ---------- Show fact ---------- */
function showFactByCur() {
  if (!facts.length || cur < 0 || cur >= order.length) return;
  index = order[cur];
  const text = facts[index];
  const layout = layoutText(text);
  anim = { playing: true, text, ...layout, startTs: performance.now() };

  if (elIdx)   elIdx.textContent = String(cur + 1);
  if (elTotal) elTotal.textContent = String(order.length);
}

function showNextRandom() {
  if (!facts.length) return;
  if (cur + 1 >= order.length) shuffleOrder(facts.length);
  cur += 1;
  showFactByCur();
}

function showPrevRandom() {
  if (!facts.length) return;
  cur = Math.max(0, cur - 1);
  showFactByCur();
}

/* ---------- Input handlers ---------- */
function handlePointer(e) {
  const x = e.clientX ?? (e.changedTouches?.[0]?.clientX);
  if (x == null) return;
  if (x > W/2) showNextRandom();
  else showPrevRandom();
}

/* ---------- Clipboard ---------- */
async function copyCurrentFact() {
  if (index < 0 || !facts.length || !btnCopy) return;
  const text = `Факт #${cur + 1}: ${facts[index]}`;
  try {
    await navigator.clipboard.writeText(text);
    const oldText = btnCopy.textContent;
    btnCopy.textContent = 'Скопировано ✅';
    btnCopy.disabled = true;
    setTimeout(() => {
      btnCopy.textContent = oldText;
      btnCopy.disabled = false;
    }, 2000);
  } catch {
    const oldText = btnCopy.textContent;
    btnCopy.textContent = 'Ошибка ❌';
    btnCopy.disabled = true;
    setTimeout(() => {
      btnCopy.textContent = oldText;
      btnCopy.disabled = false;
    }, 2000);
  }
}

/* ---------- Load facts ---------- */
async function loadFacts() {
  try {
    const res = await fetch('/facts.txt', { cache: 'no-store' });
    const raw = await res.text();
    facts = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!facts.length) {
      facts = ['Добавьте факты в файл facts.txt (один факт в строке).'];
    }
    if (elTotal) elTotal.textContent = String(facts.length);
  } catch (e) {
    console.error(e);
    facts = ['Не удалось загрузить facts.txt'];
  }
}

/* ---------- Init ---------- */
(async function init() {
  await loadFacts();
  shuffleOrder(facts.length);
  showNextRandom();
  render();

  canvas.addEventListener('click', handlePointer);
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); handlePointer(e); }, { passive: false });

  if (btnCopy) btnCopy.addEventListener('click', (e) => {
    e.stopPropagation();
    copyCurrentFact();
  });
})();
