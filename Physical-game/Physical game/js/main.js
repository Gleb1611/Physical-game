// ============================================================
//  ФИЗИКУМ 2.5 — Главный контроллер, Dock Studio UI, камера,
//  инспектор объекта/среды, телеметрия и осциллограф
// ============================================================

const viewportEl = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const themeScreen = document.getElementById('theme-screen');
const sandboxScreen = document.getElementById('sandbox-screen');
const backBtn = document.getElementById('back-btn');
const paletteItemsEl = document.getElementById('palette-items');
const presetsListEl = document.getElementById('presets-list');

const playBtn = document.getElementById('play-btn');
const stepBtn = document.getElementById('step-btn');
const resetBtn = document.getElementById('reset-btn');
const vectorsBtn = document.getElementById('vectors-btn');
const snapBtn = document.getElementById('snap-btn');
const clearBtn = document.getElementById('clear-btn');

const simStatusBadge = document.getElementById('sim-status-badge');
const simStatusText = document.getElementById('sim-status-text');
const contextHint = document.getElementById('context-hint');

const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomResetBtn = document.getElementById('zoom-reset-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const centerCamBtn = document.getElementById('center-cam-btn');

const inspBadge = document.getElementById('insp-badge');
const inspTitle = document.getElementById('insp-title');
const inspBody = document.getElementById('insp-body');
const inspActions = document.getElementById('insp-actions');
const inspTelemetry = document.getElementById('insp-telemetry');
const inspCloseBtn = document.getElementById('insp-close');
const inspDupBtn = document.getElementById('insp-dup-btn');
const inspDelBtn = document.getElementById('insp-del-btn');

const chartTitle = document.getElementById('chart-title');
const chartLegend = document.getElementById('chart-legend');
const chartCanvas = document.getElementById('chart-canvas');
const chartCtx = chartCanvas.getContext('2d');
const statusToast = document.getElementById('status-toast');

const world = new World();

// ---------- Камера ----------
const camera = {
  x: 0,
  y: 0,
  scale: 1,
  minScale: 0.25,
  maxScale: 3.5,

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

  reset() {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    updateZoomLabel();
  },
};

function eventToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function updateZoomLabel() {
  zoomResetBtn.textContent = Math.round(camera.scale * 100) + '%';
}

zoomInBtn.addEventListener('click', () => {
  camera.zoomAt(canvas.width / 2, canvas.height / 2, 1.2);
});

zoomOutBtn.addEventListener('click', () => {
  camera.zoomAt(canvas.width / 2, canvas.height / 2, 1 / 1.2);
});

zoomResetBtn.addEventListener('click', () => {
  camera.scale = 1;
  updateZoomLabel();
  showToast('Масштаб 100%');
});

centerCamBtn.addEventListener('click', () => {
  camera.reset();
  showToast('Камера отцентрирована');
});

// ---------- Уведомления ----------
let toastTimer = null;
function showToast(msg) {
  statusToast.textContent = msg;
  statusToast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => statusToast.classList.add('hidden'), 2200);
}

// ---------- Resize ----------
function resizeCanvas() {
  const rect = viewportEl.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
  }
}
window.addEventListener('resize', resizeCanvas);
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resizeCanvas).observe(viewportEl);
}

// ---------- Сетка ----------
function drawGrid() {
  const scale = camera.scale;
  let step = 50;
  while (step * scale < 22) step *= 5;
  while (step * scale > 220) step /= 5;

  const topLeft = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(canvas.width, canvas.height);

  const startX = Math.floor(topLeft.x / step) * step;
  const endX = Math.ceil(bottomRight.x / step) * step;
  const startY = Math.floor(topLeft.y / step) * step;
  const endY = Math.ceil(bottomRight.y / step) * step;

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#111622';
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

  const bigStep = step * 5;
  const bStartX = Math.floor(topLeft.x / bigStep) * bigStep;
  const bEndX = Math.ceil(bottomRight.x / bigStep) * bigStep;
  const bStartY = Math.floor(topLeft.y / bigStep) * bigStep;
  const bEndY = Math.ceil(bottomRight.y / bigStep) * bigStep;

  ctx.strokeStyle = '#192132';
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

  const origin = camera.worldToScreen(0, 0);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.22)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(canvas.width, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, canvas.height);
  ctx.stroke();
}

// ---------- Рендер сцены ----------
function draw() {
  ctx.fillStyle = '#080b11';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);
  world.render(ctx, camera.scale);
  ctx.restore();
}

// ---------- Переключение разделов и пресетов ----------
let currentTheme = null;
let activePresetId = null;
let chartHistory = [];
let draggedPaletteItem = null;

function openTheme(theme) {
  currentTheme = theme;
  world.theme = theme;
  themeScreen.classList.add('hidden');
  sandboxScreen.classList.remove('hidden');

  document.querySelectorAll('.theme-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.theme === theme);
  });

  resizeCanvas();
  camera.reset();
  buildPalette(theme);
  buildPresetsList(theme);
  setupChartLegend(theme);

  const themePresets = PRESETS[theme] || [];
  if (themePresets.length > 0) {
    loadPreset(themePresets[0]);
  } else {
    world.clear();
    syncInspector();
  }
}

document.querySelectorAll('.theme-card').forEach((card) => {
  card.addEventListener('click', () => openTheme(card.dataset.theme));
});

document.querySelectorAll('.theme-tab').forEach((tab) => {
  tab.addEventListener('click', () => openTheme(tab.dataset.theme));
});

backBtn.addEventListener('click', () => {
  sandboxScreen.classList.add('hidden');
  themeScreen.classList.remove('hidden');
  currentTheme = null;
});

function buildPalette(theme) {
  paletteItemsEl.innerHTML = '';
  const items = REGISTRY[theme] || [];

  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.draggable = true;
    btn.innerHTML = `
      <span class="palette-icon">${item.icon}</span>
      <span class="palette-item-text">
        <span class="palette-item-title">${item.label}</span>
        <span class="palette-item-sub">${item.sub || ''}</span>
      </span>
    `;
    btn.addEventListener('click', () => spawnElement(item.cls));
    btn.addEventListener('dragstart', (e) => {
      draggedPaletteItem = item;
      e.dataTransfer.setData('text/plain', item.label);
    });
    paletteItemsEl.appendChild(btn);
  });
}

// Поддержка перетаскивания элементов из левой палитры прямо на холст
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  if (!draggedPaletteItem) return;
  const pt = eventToCanvas(e);
  const w = camera.screenToWorld(pt.x, pt.y);
  spawnElement(draggedPaletteItem.cls, w.x, w.y);
  draggedPaletteItem = null;
});

function buildPresetsList(theme) {
  presetsListEl.innerHTML = '';
  const list = PRESETS[theme] || [];
  for (const p of list) {
    const btn = document.createElement('button');
    btn.className = 'preset-card';
    btn.dataset.id = p.id;
    btn.textContent = p.name;
    btn.addEventListener('click', () => {
      loadPreset(p);
      showToast(`Загружен опыт: ${p.name}`);
    });
    presetsListEl.appendChild(btn);
  }
}

function loadPreset(preset) {
  activePresetId = preset.id;
  document.querySelectorAll('.preset-card').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === preset.id);
  });

  world.clear();
  chartHistory = [];
  camera.reset();
  preset.build(world);
  world.saveAllStates();
  setRunning(true);
  syncInspector();
}

function spawnElement(cls, wx = null, wy = null) {
  const center = camera.screenToWorld(canvas.width / 2, canvas.height / 2);
  const offset = (Math.random() - 0.5) * 32;
  const x = wx !== null ? wx : center.x + offset;
  const y = wy !== null ? wy : center.y + offset;

  const el = new cls(x, y);
  if (el instanceof Block || el instanceof Ball) {
    el.vx = el.properties.vx || 0;
    el.vy = el.properties.vy || 0;
  }
  world.add(el);
  world.select(el);
  syncInspector();
  showToast(`Добавлен: ${el.label}`);
}

// ---------- Управление временем и скоростью ----------
function setRunning(state) {
  world.running = state;
  if (state) {
    playBtn.textContent = '⏸ Пауза';
    playBtn.classList.add('running');
    simStatusBadge.className = 'status-pill running';
    simStatusText.textContent = 'Симуляция активна';
  } else {
    playBtn.textContent = '▶ Старт';
    playBtn.classList.remove('running');
    simStatusBadge.className = 'status-pill paused';
    simStatusText.textContent = 'На паузе';
  }
}

playBtn.addEventListener('click', () => {
  setRunning(!world.running);
});

stepBtn.addEventListener('click', () => {
  setRunning(false);
  world.running = true;
  world.update(1 / 60);
  world.running = false;
  updateInspectorTelemetry();
  recordChartSample();
  renderChart();
});

resetBtn.addEventListener('click', () => {
  world.restoreAllStates();
  chartHistory = [];
  syncInspector();
  showToast('Возвращено к начальному состоянию');
});

document.querySelectorAll('.speed-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    const s = parseFloat(pill.dataset.speed) || 1;
    world.timeScale = s;
    document.querySelectorAll('.speed-pill').forEach((p) => p.classList.toggle('active', p === pill));
    showToast(`Скорость времени: ${s}×`);
  });
});

vectorsBtn.addEventListener('click', () => {
  world.showVectors = !world.showVectors;
  vectorsBtn.classList.toggle('active', world.showVectors);
});

snapBtn.addEventListener('click', () => {
  world.snapToGrid = !world.snapToGrid;
  snapBtn.classList.toggle('active', world.snapToGrid);
  showToast(world.snapToGrid ? 'Привязка к сетке: ВКЛ' : 'Привязка к сетке: ВЫКЛ');
});

clearBtn.addEventListener('click', () => {
  world.clear();
  chartHistory = [];
  activePresetId = null;
  document.querySelectorAll('.preset-card').forEach((b) => b.classList.remove('active'));
  syncInspector();
  showToast('Холст очищен');
});

// ---------- Правая панель: Инспектор объекта или Параметры среды ----------
function syncInspector() {
  const sel = world.selected;
  inspBody.innerHTML = '';

  if (!sel) {
    // Показываем настройки физической среды, когда ничего не выделено
    inspBadge.textContent = 'СРЕДА';
    inspTitle.textContent = 'Параметры лаборатории';
    inspCloseBtn.classList.add('hidden');
    inspActions.classList.add('hidden');
    contextHint.textContent =
      currentTheme === 'electricity'
        ? 'Тяните от синей клеммы ● для соединения проводом'
        : 'Кликните по объекту для изменения его свойств';

    if (currentTheme === 'mechanics') {
      const rowPlanet = document.createElement('div');
      rowPlanet.className = 'prop-row';
      rowPlanet.innerHTML = `
        <div class="prop-label-line"><span>Гравитация (небесное тело)</span></div>
        <select id="planet-select">
          <option value="9.81" ${Math.abs(world.gravity - 9.81) < 0.1 ? 'selected' : ''}>🌍 Земля (g = 9.81 м/с²)</option>
          <option value="1.62" ${Math.abs(world.gravity - 1.62) < 0.1 ? 'selected' : ''}>🌙 Луна (g = 1.62 м/с²)</option>
          <option value="3.71" ${Math.abs(world.gravity - 3.71) < 0.1 ? 'selected' : ''}>🔴 Марс (g = 3.71 м/с²)</option>
          <option value="24.79" ${Math.abs(world.gravity - 24.79) < 0.1 ? 'selected' : ''}>🪐 Юпитер (g = 24.79 м/с²)</option>
          <option value="0" ${world.gravity === 0 ? 'selected' : ''}>🛰️ Невесомость (g = 0 м/с²)</option>
        </select>
      `;
      const rowG = document.createElement('div');
      rowG.className = 'prop-row';
      rowG.innerHTML = `
        <div class="prop-label-line">
          <span>Ускорение g</span>
          <span class="prop-val" id="g-val-label">${world.gravity.toFixed(2)} м/с²</span>
        </div>
        <input type="range" id="g-range" min="0" max="30" step="0.1" value="${world.gravity}">
      `;
      inspBody.appendChild(rowPlanet);
      inspBody.appendChild(rowG);

      const selEl = rowPlanet.querySelector('#planet-select');
      const rangeEl = rowG.querySelector('#g-range');
      const labelEl = rowG.querySelector('#g-val-label');

      selEl.addEventListener('change', () => {
        world.gravity = parseFloat(selEl.value);
        rangeEl.value = world.gravity;
        labelEl.textContent = `${world.gravity.toFixed(2)} м/с²`;
      });
      rangeEl.addEventListener('input', () => {
        world.gravity = parseFloat(rangeEl.value);
        labelEl.textContent = `${world.gravity.toFixed(2)} м/с²`;
      });
    } else {
      const info = document.createElement('div');
      info.style.fontSize = '12px';
      info.style.color = '#8b95b0';
      info.style.lineHeight = '1.5';
      info.textContent =
        currentTheme === 'optics'
          ? 'Выберите источник света, линзу, зеркало или призму на холсте, чтобы настроить фокусное расстояние, показатель преломления или спектр.'
          : 'Выберите батарею, лампу, резистор или прибор для настройки ЭДС и сопротивления. Клик по ключу замыкает/размыкает цепь.';
      inspBody.appendChild(info);
    }

    updateInspectorTelemetry();
    return;
  }

  // Когда выбран конкретный элемент
  inspBadge.textContent = sel.type.toUpperCase();
  inspTitle.textContent = sel.label;
  inspCloseBtn.classList.remove('hidden');
  inspActions.classList.remove('hidden');
  contextHint.textContent = `Выбран: ${sel.label} (Del — удалить, Ctrl+D — дублировать)`;

  if (sel.rotatable) {
    const degVal = Math.round((sel.rotation * 180) / Math.PI);
    const row = document.createElement('div');
    row.className = 'prop-row';
    row.innerHTML = `
      <div class="prop-label-line">
        <span>Угол поворота θ</span>
        <span class="prop-val" id="rot-val-label">${degVal}°</span>
      </div>
      <input type="range" min="-180" max="180" step="1" value="${degVal}">
      <div class="quick-angles">
        <button class="angle-chip" data-deg="-90">-90°</button>
        <button class="angle-chip" data-deg="-45">-45°</button>
        <button class="angle-chip" data-deg="0">0°</button>
        <button class="angle-chip" data-deg="45">+45°</button>
        <button class="angle-chip" data-deg="90">+90°</button>
      </div>
    `;
    const input = row.querySelector('input');
    const valLabel = row.querySelector('#rot-val-label');
    const setDeg = (deg) => {
      sel.rotation = (deg * Math.PI) / 180;
      input.value = deg;
      valLabel.textContent = `${deg}°`;
      sel.saveState();
    };
    input.addEventListener('input', () => setDeg(parseFloat(input.value)));
    row.querySelectorAll('.angle-chip').forEach((chip) => {
      chip.addEventListener('click', () => setDeg(parseFloat(chip.dataset.deg)));
    });
    inspBody.appendChild(row);
  }

  const schema = sel.getPropertySchema();
  for (const field of schema) {
    const curVal = sel.properties[field.key];
    const row = document.createElement('div');
    row.className = 'prop-row';

    if (field.type === 'boolean') {
      row.innerHTML = `
        <label class="prop-toggle">
          <span>${field.label}</span>
          <input type="checkbox" ${curVal ? 'checked' : ''}>
        </label>
      `;
      const cb = row.querySelector('input');
      cb.addEventListener('change', () => {
        sel.properties[field.key] = cb.checked;
        applyImmediatePropertyEffect(sel, field.key, cb.checked);
      });
    } else if (field.type === 'select') {
      const optsHtml = field.options
        .map((o) => `<option value="${o.value}" ${o.value === curVal ? 'selected' : ''}>${o.label}</option>`)
        .join('');
      row.innerHTML = `
        <div class="prop-label-line"><span>${field.label}</span></div>
        <select>${optsHtml}</select>
      `;
      const select = row.querySelector('select');
      select.addEventListener('change', () => {
        sel.properties[field.key] = select.value;
        applyImmediatePropertyEffect(sel, field.key, select.value);
      });
    } else {
      row.innerHTML = `
        <div class="prop-label-line">
          <span>${field.label}</span>
          <span class="prop-val">${curVal} ${field.unit || ''}</span>
        </div>
        <input type="range" min="${field.min}" max="${field.max}" step="${field.step}" value="${curVal}">
      `;
      const range = row.querySelector('input');
      const valSpan = row.querySelector('.prop-val');
      range.addEventListener('input', () => {
        const num = parseFloat(range.value);
        sel.properties[field.key] = num;
        valSpan.textContent = `${num} ${field.unit || ''}`;
        applyImmediatePropertyEffect(sel, field.key, num);
      });
    }

    inspBody.appendChild(row);
  }

  updateInspectorTelemetry();
}

function applyImmediatePropertyEffect(el, key, value) {
  if (el instanceof Pendulum && key === 'angle') {
    el.theta = (value * Math.PI) / 180;
    el.omega = 0;
  } else if (el instanceof Spring && key === 'displacement') {
    el.disp = value;
    el.vel = 0;
  } else if ((el instanceof Block || el instanceof Ball) && (key === 'vx' || key === 'vy')) {
    el[key] = value;
  }
  el.saveState();
}

function updateInspectorTelemetry() {
  const sel = world.selected;
  let items = [];

  if (sel) {
    items = sel.getTelemetry(world);
  } else if (currentTheme === 'mechanics') {
    let ek = 0, ep = 0;
    for (const el of world.elements) {
      if (typeof el.getEnergy === 'function') {
        const en = el.getEnergy(260, world.gravity);
        ek += en.ek;
        ep += en.ep;
      }
    }
    items = [
      { name: 'Объектов', value: `${world.elements.length}` },
      { name: 'Гравитация g', value: `${world.gravity.toFixed(2)} м/с²` },
      { name: 'Суммарная Ek', value: `${ek.toFixed(1)} Дж` },
      { name: 'Суммарная Ep', value: `${ep.toFixed(1)} Дж` },
    ];
  } else if (currentTheme === 'optics') {
    let rays = 0, hits = 0;
    for (const el of world.elements) {
      if (el instanceof LightSource) rays += el.emitRays().length;
      if (el instanceof OpticalScreen) hits += el.hits.length;
    }
    items = [
      { name: 'Элементов', value: `${world.elements.length}` },
      { name: 'Испущено лучей', value: `${rays}` },
      { name: 'На экране', value: `${hits}` },
      { name: 'Среда', value: 'Воздух (n=1.00)' },
    ];
  } else if (currentTheme === 'electricity') {
    let totalP = 0, maxI = 0;
    for (const el of world.elements) {
      if (el instanceof Lamp || el instanceof Resistor) totalP += el.power || 0;
      if (el instanceof Battery) maxI = Math.max(maxI, Math.abs(el.current || 0));
    }
    items = [
      { name: 'Компонентов', value: `${world.elements.length}` },
      { name: 'Ток источника I', value: `${maxI.toFixed(2)} А` },
      { name: 'Мощность цепи P', value: `${totalP.toFixed(2)} Вт` },
      { name: 'Закон расчёта', value: 'Узловой МУП' },
    ];
  }

  inspTelemetry.innerHTML = items
    .map(
      (item) => `
      <div class="telemetry-card">
        <div class="telemetry-name">${item.name}</div>
        <div class="telemetry-value">${item.value}</div>
      </div>
    `
    )
    .join('');
}

inspCloseBtn.addEventListener('click', () => {
  world.select(null);
  syncInspector();
});

inspDupBtn.addEventListener('click', () => {
  const sel = world.selected;
  if (!sel) return;
  const copy = sel.clone();
  world.add(copy);
  world.select(copy);
  syncInspector();
  showToast(`Скопирован: ${copy.label}`);
});

inspDelBtn.addEventListener('click', () => {
  const sel = world.selected;
  if (!sel) return;
  world.remove(sel);
  syncInspector();
  showToast('Объект удалён');
});

// ---------- Взаимодействие мышью на холсте ----------
let mode = 'idle'; // 'idle' | 'pan' | 'drag-el' | 'rotate-el' | 'drag-wire' | 'drag-wire-end' | 'drag-bob'
let activeEl = null;
let activeWireEnd = null; // 'A' | 'B'
let dragOffset = { x: 0, y: 0 };
let panStart = { x: 0, y: 0 };
let camStart = { x: 0, y: 0 };
let downScreenPos = { x: 0, y: 0 };
let wireStartPort = null;
let hasMovedDuringDrag = false;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('mousedown', (e) => {
  const cPt = eventToCanvas(e);
  const w = camera.screenToWorld(cPt.x, cPt.y);
  downScreenPos = { x: e.clientX, y: e.clientY };
  hasMovedDuringDrag = false;

  if (e.button === 1 || e.button === 2) {
    mode = 'pan';
    panStart = { x: e.clientX, y: e.clientY };
    camStart = { x: camera.x, y: camera.y };
    canvas.classList.add('panning');
    return;
  }

  if (e.button !== 0) return;

  // 1. Ручка вращения у выделенного объекта
  const curSel = world.selected;
  if (curSel && curSel.hitRotationHandle(w.x, w.y, camera.scale)) {
    mode = 'rotate-el';
    activeEl = curSel;
    return;
  }

  // 2. В Электричестве: клик по клемме (порту) создаёт новый провод
  if (currentTheme === 'electricity') {
    const portHit = world.findPortAt(w.x, w.y, 14 / camera.scale);
    if (portHit) {
      mode = 'drag-wire';
      wireStartPort = portHit;
      world.wirePreview = {
        x1: portHit.x,
        y1: portHit.y,
        x2: w.x,
        y2: w.y,
        snapPort: null,
      };
      return;
    }
  }

  // 3. Попадание по объекту
  const hit = world.hitTest(w.x, w.y);
  if (hit) {
    world.select(hit);
    activeEl = hit;
    syncInspector();

    // Если это провод и кликнули по его концу — переподключаем конец провода
    if (hit instanceof Wire) {
      const endTag = hit.hitEndpoint(w.x, w.y, 14 / camera.scale);
      if (endTag) {
        mode = 'drag-wire-end';
        activeWireEnd = endTag;
        return;
      }
    }

    if (hit instanceof Pendulum) {
      const bob = hit.getBobPos();
      if (Math.hypot(w.x - bob.x, w.y - bob.y) <= 26) {
        mode = 'drag-bob';
        return;
      }
    }

    if (hit instanceof Spring) {
      const bob = hit.getBobWorldPos();
      if (Math.hypot(w.x - bob.x, w.y - bob.y) <= 28) {
        mode = 'drag-bob';
        return;
      }
    }

    mode = 'drag-el';
    dragOffset = { x: w.x - hit.x, y: w.y - hit.y };
  } else {
    world.select(null);
    syncInspector();
    mode = 'pan';
    panStart = { x: e.clientX, y: e.clientY };
    camStart = { x: camera.x, y: camera.y };
    canvas.classList.add('panning');
  }
});

window.addEventListener('mousemove', (e) => {
  const cPt = eventToCanvas(e);
  const w = camera.screenToWorld(cPt.x, cPt.y);

  if (mode === 'idle') {
    const sel = world.selected;
    if (sel && sel.hitRotationHandle(w.x, w.y, camera.scale)) {
      canvas.className = 'hover-rotate';
    } else if (currentTheme === 'electricity' && world.findPortAt(w.x, w.y, 14 / camera.scale)) {
      canvas.className = 'hover-port';
    } else if (world.hitTest(w.x, w.y)) {
      canvas.className = 'hover-item';
    } else {
      canvas.className = '';
    }
    return;
  }

  if (Math.hypot(e.clientX - downScreenPos.x, e.clientY - downScreenPos.y) > 4) {
    hasMovedDuringDrag = true;
  }

  if (mode === 'pan') {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    camera.x = camStart.x - dx / camera.scale;
    camera.y = camStart.y - dy / camera.scale;
  } else if (mode === 'drag-el' && activeEl && hasMovedDuringDrag) {
    let nx = w.x - dragOffset.x;
    let ny = w.y - dragOffset.y;
    if (world.snapToGrid) {
      nx = Math.round(nx / 25) * 25;
      ny = Math.round(ny / 25) * 25;
    }
    if (activeEl instanceof Wire) {
      const dx = nx - activeEl.x;
      const dy = ny - activeEl.y;
      if (!activeEl.portA) {
        activeEl.x1 += dx;
        activeEl.y1 += dy;
      }
      if (!activeEl.portB) {
        activeEl.x2 += dx;
        activeEl.y2 += dy;
      }
    }
    if (activeEl instanceof Block || activeEl instanceof Ball) {
      activeEl.vx = 0;
      activeEl.vy = 0;
      activeEl.trail = [];
    }
    activeEl.x = nx;
    activeEl.y = ny;
    if (!world.running) activeEl.saveState();
  } else if (mode === 'drag-wire-end' && activeEl instanceof Wire) {
    const snap = world.findPortAt(w.x, w.y, 20 / camera.scale);
    if (activeWireEnd === 'A') {
      if (snap) {
        activeEl.portA = { elId: snap.element.id, portIndex: snap.index };
        activeEl.x1 = snap.x;
        activeEl.y1 = snap.y;
      } else {
        activeEl.portA = null;
        activeEl.x1 = w.x;
        activeEl.y1 = w.y;
      }
    } else if (activeWireEnd === 'B') {
      if (snap) {
        activeEl.portB = { elId: snap.element.id, portIndex: snap.index };
        activeEl.x2 = snap.x;
        activeEl.y2 = snap.y;
      } else {
        activeEl.portB = null;
        activeEl.x2 = w.x;
        activeEl.y2 = w.y;
      }
    }
  } else if (mode === 'rotate-el' && activeEl) {
    let ang = Math.atan2(w.y - activeEl.y, w.x - activeEl.x) + Math.PI / 2;
    if (e.shiftKey) {
      const step = Math.PI / 12;
      ang = Math.round(ang / step) * step;
    }
    activeEl.rotation = ang;
    if (!world.running) activeEl.saveState();
    syncInspector();
  } else if (mode === 'drag-bob' && activeEl) {
    if (activeEl instanceof Pendulum) {
      const dx = w.x - activeEl.x;
      const dy = Math.max(20, w.y - activeEl.y);
      activeEl.theta = Math.atan2(dx, dy);
      activeEl.omega = 0;
      activeEl.properties.angle = Math.round((activeEl.theta * 180) / Math.PI);
      activeEl.saveState();
      syncInspector();
    } else if (activeEl instanceof Spring) {
      const rest = activeEl.properties.restLength || 140;
      activeEl.disp = Math.max(-80, Math.min(140, w.y - activeEl.y - rest));
      activeEl.vel = 0;
      activeEl.properties.displacement = Math.round(activeEl.disp);
      activeEl.saveState();
      syncInspector();
    }
  } else if (mode === 'drag-wire' && world.wirePreview) {
    const snap = world.findPortAt(w.x, w.y, 20 / camera.scale);
    const validSnap =
      snap && (snap.element.id !== wireStartPort.element.id || snap.index !== wireStartPort.index)
        ? snap
        : null;
    world.wirePreview.x2 = validSnap ? validSnap.x : w.x;
    world.wirePreview.y2 = validSnap ? validSnap.y : w.y;
    world.wirePreview.snapPort = validSnap;
  }
});

window.addEventListener('mouseup', () => {
  // Клик без перетаскивания по Ключу переключает его
  if (mode === 'drag-el' && activeEl instanceof Switch && !hasMovedDuringDrag) {
    activeEl.properties.closed = !activeEl.properties.closed;
    activeEl.saveState();
    syncInspector();
    showToast(activeEl.properties.closed ? 'Ключ замкнут (Вкл)' : 'Ключ разомкнут (Выкл)');
  }

  if (mode === 'drag-wire' && world.wirePreview) {
    const target = world.wirePreview.snapPort;
    if (target && wireStartPort) {
      connectPorts(
        world,
        wireStartPort.element,
        wireStartPort.index,
        target.element,
        target.index
      );
      showToast('Клеммы соединены проводом');
    }
    world.wirePreview = null;
    wireStartPort = null;
  }

  mode = 'idle';
  activeEl = null;
  activeWireEnd = null;
  hasMovedDuringDrag = false;
  canvas.classList.remove('panning');
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const cPt = eventToCanvas(e);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    camera.zoomAt(cPt.x, cPt.y, factor);
  },
  { passive: false }
);

// ---------- Горячие клавиши ----------
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  if (e.key === 'Escape') {
    world.select(null);
    syncInspector();
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    const sel = world.selected;
    if (sel) {
      world.remove(sel);
      syncInspector();
      showToast('Объект удалён');
    }
  } else if (e.code === 'Space') {
    e.preventDefault();
    setRunning(!world.running);
  } else if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
    stepBtn.click();
  } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
    resetBtn.click();
  } else if (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М') {
    vectorsBtn.click();
  } else if (e.key === 'g' || e.key === 'G' || e.key === 'п' || e.key === 'П') {
    snapBtn.click();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В')) {
    e.preventDefault();
    inspDupBtn.click();
  }
});

// ---------- Осциллограф в реальном времени ----------
function setupChartLegend(theme) {
  chartHistory = [];
  if (theme === 'mechanics') {
    chartTitle.textContent = '📈 Энергия (Дж)';
    chartLegend.innerHTML = `
      <span class="legend-dot"><span class="legend-swatch" style="background:#22c55e"></span>Ek</span>
      <span class="legend-dot"><span class="legend-swatch" style="background:#f59e0b"></span>Ep</span>
      <span class="legend-dot"><span class="legend-swatch" style="background:#38bdf8"></span>Eполн</span>
    `;
  } else if (theme === 'optics') {
    chartTitle.textContent = '📈 Поток лучей';
    chartLegend.innerHTML = `
      <span class="legend-dot"><span class="legend-swatch" style="background:#38bdf8"></span>Лучей</span>
      <span class="legend-dot"><span class="legend-swatch" style="background:#f472b6"></span>Экран</span>
    `;
  } else if (theme === 'electricity') {
    chartTitle.textContent = '📈 Мощность и ток';
    chartLegend.innerHTML = `
      <span class="legend-dot"><span class="legend-swatch" style="background:#fde047"></span>P (Вт)</span>
      <span class="legend-dot"><span class="legend-swatch" style="background:#38bdf8"></span>I×10 (А)</span>
    `;
  }
}

function recordChartSample() {
  if (!currentTheme) return;

  if (currentTheme === 'mechanics') {
    const sel = world.selected;
    let ek = 0, ep = 0;
    if (sel && typeof sel.getEnergy === 'function') {
      const en = sel.getEnergy(260, world.gravity);
      ek = en.ek;
      ep = en.ep;
    } else {
      for (const el of world.elements) {
        if (typeof el.getEnergy === 'function') {
          const en = el.getEnergy(260, world.gravity);
          ek += en.ek;
          ep += en.ep;
        }
      }
    }
    chartHistory.push({ a: ek, b: ep, c: ek + ep });
  } else if (currentTheme === 'optics') {
    let emitted = 0, hits = 0;
    for (const el of world.elements) {
      if (el instanceof LightSource) emitted += el.emitRays().length;
      if (el instanceof OpticalScreen) hits += el.hits.length;
    }
    chartHistory.push({ a: emitted, b: hits, c: 0 });
  } else if (currentTheme === 'electricity') {
    let totalP = 0, maxI = 0;
    for (const el of world.elements) {
      if (el instanceof Lamp || el instanceof Resistor) totalP += el.power || 0;
      if (el instanceof Battery) maxI = Math.max(maxI, Math.abs(el.current || 0));
    }
    chartHistory.push({ a: totalP, b: maxI * 10, c: 0 });
  }

  if (chartHistory.length > 130) chartHistory.shift();
}

function renderChart() {
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  chartCtx.clearRect(0, 0, w, h);

  chartCtx.strokeStyle = 'rgba(255,255,255,0.06)';
  chartCtx.lineWidth = 1;
  chartCtx.beginPath();
  for (let y = 22; y < h; y += 28) {
    chartCtx.moveTo(0, y);
    chartCtx.lineTo(w, y);
  }
  chartCtx.stroke();

  if (chartHistory.length < 2) return;

  let maxVal = 5;
  for (const pt of chartHistory) {
    maxVal = Math.max(maxVal, pt.a, pt.b, pt.c);
  }
  maxVal *= 1.15;

  const colors =
    currentTheme === 'mechanics'
      ? ['#22c55e', '#f59e0b', '#38bdf8']
      : currentTheme === 'optics'
      ? ['#38bdf8', '#f472b6', null]
      : ['#fde047', '#38bdf8', null];

  ['a', 'b', 'c'].forEach((key, idx) => {
    const col = colors[idx];
    if (!col) return;
    chartCtx.strokeStyle = col;
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();
    for (let i = 0; i < chartHistory.length; i++) {
      const x = (i / 129) * w;
      const val = chartHistory[i][key];
      const y = h - 8 - (val / maxVal) * (h - 18);
      if (i === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    }
    chartCtx.stroke();
  });
}

// ---------- Главный цикл симуляции (60 FPS) ----------
let lastTime = performance.now();
let frameCounter = 0;

function loop(now) {
  const dt = Math.min(0.04, (now - lastTime) / 1000);
  lastTime = now;

  if (currentTheme) {
    const draggedInSim = (mode === 'drag-el' || mode === 'drag-bob') && hasMovedDuringDrag ? activeEl : null;
    world.update(dt, draggedInSim);
    draw();

    frameCounter++;
    if (frameCounter % 3 === 0) {
      updateInspectorTelemetry();
      if (world.running || currentTheme !== 'mechanics') {
        recordChartSample();
        renderChart();
      }
    }
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
