// ============================================================
//  ФИЗИКУМ — main.js (исправленный)
// ============================================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const themeScreen = document.getElementById('theme-screen');
const sandboxScreen = document.getElementById('sandbox-screen');
const themeLabel = document.getElementById('theme-label');
const zoomLabel = document.getElementById('zoom-label');
const backBtn = document.getElementById('back-btn');
const paletteEl = document.getElementById('palette');

// ---------- Мир создаём ДО первого draw() ----------
const world = new World();

// ---------- Камера ----------
const camera = {
  x: 0,
  y: 0,
  scale: 1,
  minScale: 0.2,
  maxScale: 4,

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.scale + canvas.width / 2,
      y: (wy - this.y) * this.scale + canvas.height / 2,
    };
  },

  screenToWorld(sx, sy) {
    return {
      x: (sx - canvas.width / 2) / this.scale + this.x,
      y: (sy - canvas.height / 2) / this.scale + this.y,
    };
  },

  zoomAt(sx, sy, factor) {
    const before = this.screenToWorld(sx, sy);
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    const after = this.screenToWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    updateZoomLabel();
  },
};

function updateZoomLabel() {
  zoomLabel.textContent = Math.round(camera.scale * 100) + '%';
}

// ---------- Resize ----------
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}
window.addEventListener('resize', resizeCanvas);

// ---------- Сетка ----------
function drawGrid() {
  const scale = camera.scale;

  const baseStep = 50;
  let step = baseStep;
  while (step * scale < 20) step *= 5;
  while (step * scale > 200) step /= 5;

  const topLeft = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(canvas.width, canvas.height);

  const startX = Math.floor(topLeft.x / step) * step;
  const endX = Math.ceil(bottomRight.x / step) * step;
  const startY = Math.floor(topLeft.y / step) * step;
  const endY = Math.ceil(bottomRight.y / step) * step;

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#1a1f2b';
  ctx.beginPath();
  for (let x = startX; x <= endX; x += step) {
    const sx = camera.worldToScreen(x, 0).x;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, canvas.height);
  }
  for (let y = startY; y <= endY; y += step) {
    const sy = camera.worldToScreen(0, y).y;
    ctx.moveTo(0, sy);
    ctx.lineTo(canvas.width, sy);
  }
  ctx.stroke();

  // крупная сетка
  const bigStep = step * 5;
  const bStartX = Math.floor(topLeft.x / bigStep) * bigStep;
  const bEndX = Math.ceil(bottomRight.x / bigStep) * bigStep;
  const bStartY = Math.floor(topLeft.y / bigStep) * bigStep;
  const bEndY = Math.ceil(bottomRight.y / bigStep) * bigStep;

  ctx.strokeStyle = '#252b3a';
  ctx.beginPath();
  for (let x = bStartX; x <= bEndX; x += bigStep) {
    const sx = camera.worldToScreen(x, 0).x;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, canvas.height);
  }
  for (let y = bStartY; y <= bEndY; y += bigStep) {
    const sy = camera.worldToScreen(0, y).y;
    ctx.moveTo(0, sy);
    ctx.lineTo(canvas.width, sy);
  }
  ctx.stroke();

  // оси
  const origin = camera.worldToScreen(0, 0);
  ctx.strokeStyle = '#3a4a6a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(canvas.width, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, canvas.height);
  ctx.stroke();
}

// ---------- Главный рендер ----------
function draw() {
  ctx.fillStyle = '#0f1115';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);
  world.render(ctx);
  ctx.restore();
}

// ---------- Панорамирование и зум ----------
let isPanning = false;
let panStart = { x: 0, y: 0 };
let cameraStart = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0 || e.button === 1) {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    cameraStart = { x: camera.x, y: camera.y };
    canvas.classList.add('dragging');
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  const dx = e.clientX - panStart.x;
  const dy = e.clientY - panStart.y;
  camera.x = cameraStart.x - dx / camera.scale;
  camera.y = cameraStart.y - dy / camera.scale;
  draw();
});

window.addEventListener('mouseup', () => {
  isPanning = false;
  canvas.classList.remove('dragging');
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  camera.zoomAt(e.clientX, e.clientY, factor);
  draw();
}, { passive: false });

// ---------- Переключение экранов ----------
const THEME_NAMES = {
  mechanics: '⚙️ Механика',
  optics: '🔦 Оптика',
  electricity: '⚡ Электричество',
};

let currentTheme = null;

document.querySelectorAll('.theme-card').forEach((card) => {
  card.addEventListener('click', () => {
    currentTheme = card.dataset.theme;
    themeLabel.textContent = THEME_NAMES[currentTheme] || currentTheme;
    themeScreen.classList.add('hidden');
    sandboxScreen.classList.remove('hidden');
    resizeCanvas();
    camera.x = 0;
    camera.y = 0;
    camera.scale = 1;
    updateZoomLabel();
    buildPalette(currentTheme);   // ← палитра строится здесь
    draw();
  });
});

backBtn.addEventListener('click', () => {
  sandboxScreen.classList.add('hidden');
  themeScreen.classList.remove('hidden');
  currentTheme = null;
  world.clear();
  paletteEl.innerHTML = '';
});

// ---------- Палитра ----------
function buildPalette(theme) {
  paletteEl.innerHTML = '';
  const items = REGISTRY[theme] || [];
  if (items.length === 0) {
    paletteEl.innerHTML = '<div class="palette-empty">Нет элементов</div>';
    return;
  }
  const title = document.createElement('div');
  title.className = 'palette-title';
  title.textContent = 'Элементы';
  paletteEl.appendChild(title);

  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.innerHTML = `<span class="palette-icon">${item.icon}</span><span>${item.label}</span>`;
    btn.addEventListener('click', () => spawnElement(item.cls));
    paletteEl.appendChild(btn);
  });
}

function spawnElement(cls) {
  const center = camera.screenToWorld(canvas.width / 2, canvas.height / 2);
  const offset = (Math.random() - 0.5) * 40;
  const el = new cls(center.x + offset, center.y + offset);
  world.add(el);
  world.select(el);
  draw();
}

// ---------- Взаимодействие с объектами ----------
let draggingEl = null;
let dragOffset = { x: 0, y: 0 };
let downScreen = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const w = camera.screenToWorld(e.clientX, e.clientY);
  const hit = world.hitTest(w.x, w.y);

  if (hit) {
    world.select(hit);
    draggingEl = hit;
    dragOffset = { x: w.x - hit.x, y: w.y - hit.y };
    downScreen = { x: e.clientX, y: e.clientY };
    isPanning = false;                     // отменяем пан
    e.stopImmediatePropagation();
    draw();
  } else {
    world.select(null);
    draw();
  }
}, true);

window.addEventListener('mousemove', (e) => {
  if (!draggingEl) return;
  const w = camera.screenToWorld(e.clientX, e.clientY);
  draggingEl.x = w.x - dragOffset.x;
  draggingEl.y = w.y - dragOffset.y;
  draw();
});

window.addEventListener('mouseup', () => {
  draggingEl = null;
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const sel = world.selected;
    if (sel) {
      world.remove(sel);
      draw();
    }
  }
});

// ---------- Старт ----------
resizeCanvas();