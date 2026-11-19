// ============================================================
//  ФИЗИКУМ 2.5 — Главный контроллер, Dock Studio UI, камера,
//  инспектор объекта/среды, телеметрия и осциллограф
// ============================================================

const viewportEl = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const rayCanvas = document.getElementById('ray-canvas');
const rayCtx = rayCanvas.getContext('2d');
const canvas3d = document.getElementById('canvas3d');
const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');

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

// Уровни
const levelsBtn = document.getElementById('levels-btn');
const levelsCtaCount = document.getElementById('levels-cta-count');
const levelsScreen = document.getElementById('levels-screen');
const levelsGroupsEl = document.getElementById('levels-groups');
const levelsProgressEl = document.getElementById('levels-progress');
const levelsHomeBtn = document.getElementById('levels-home-btn');
const levelsBackBtn = document.getElementById('levels-back-btn');
const levelPanel = document.getElementById('level-panel');
const levelKicker = document.getElementById('level-kicker');
const levelTitleEl = document.getElementById('level-title');
const levelBriefEl = document.getElementById('level-brief');
const goalListEl = document.getElementById('goal-list');
const levelHintBtn = document.getElementById('level-hint-btn');
const levelHintEl = document.getElementById('level-hint');
const levelRestartBtn = document.getElementById('level-restart-btn');
const presetsBlock = document.getElementById('presets-block');
const levelComplete = document.getElementById('level-complete');
const levelCompleteText = document.getElementById('level-complete-text');
const levelNextBtn = document.getElementById('level-next-btn');
const levelListBtn = document.getElementById('level-list-btn');
const levelStayBtn = document.getElementById('level-stay-btn');

const world = new World();
let viewMode = '2d'; // '2d' | '3d'
let view3d = null;   // создаётся ниже, когда будут готовы все классы

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
    if (view3d) view3d.reset(world.theme);
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
  if (viewMode === '3d' && view3d) {
    zoomResetBtn.textContent = view3d.zoomPercent() + '%';
  } else {
    zoomResetBtn.textContent = Math.round(camera.scale * 100) + '%';
  }
}

zoomInBtn.addEventListener('click', () => {
  if (viewMode === '3d') {
    view3d.zoom(1.2);
    updateZoomLabel();
  } else camera.zoomAt(canvas.width / 2, canvas.height / 2, 1.2);
});

zoomOutBtn.addEventListener('click', () => {
  if (viewMode === '3d') {
    view3d.zoom(1 / 1.2);
    updateZoomLabel();
  } else camera.zoomAt(canvas.width / 2, canvas.height / 2, 1 / 1.2);
});

zoomResetBtn.addEventListener('click', () => {
  if (viewMode === '3d') {
    view3d.needsFrame = true;
    showToast('Масштаб 100%');
    return;
  }
  camera.scale = 1;
  updateZoomLabel();
  showToast('Масштаб 100%');
});

centerCamBtn.addEventListener('click', () => {
  if (viewMode === '3d') {
    view3d.reset(world.theme);
    updateZoomLabel();
  } else camera.reset();
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
    rayCanvas.width = canvas.width;
    rayCanvas.height = canvas.height;
    canvas3d.width = canvas.width;
    canvas3d.height = canvas.height;
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
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

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, origin.y);
  ctx.lineTo(canvas.width, origin.y);
  ctx.moveTo(origin.x, 0);
  ctx.lineTo(origin.x, canvas.height);
  ctx.stroke();
}

// ---------- Рендер сцены ----------
function applyCameraTransform(c) {
  c.translate(canvas.width / 2, canvas.height / 2);
  c.scale(camera.scale, camera.scale);
  c.translate(-camera.x, -camera.y);
}

function draw() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  ctx.save();
  applyCameraTransform(ctx);
  world.render(ctx, camera.scale);
  ctx.restore();

  // Лучи света рисуются на отдельном слое: интерфейс чёрно-белый,
  // а цвет луча несёт физический смысл (длина волны), поэтому его сохраняем.
  rayCtx.clearRect(0, 0, rayCanvas.width, rayCanvas.height);
  if (currentTheme === 'optics') {
    rayCtx.save();
    applyCameraTransform(rayCtx);
    OpticsEngine.traceAndRender(rayCtx, world);
    rayCtx.restore();
  }
}

// ---------- Переключение разделов и пресетов ----------
let currentTheme = null;
let activePresetId = null;
let chartHistory = [];
let draggedPaletteItem = null;
let infoCardOpen = true;

function openTheme(theme) {
  leaveLevelMode();
  levelsScreen.classList.add('hidden');
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
  leaveLevelMode();
  sandboxScreen.classList.add('hidden');
  themeScreen.classList.remove('hidden');
  currentTheme = null;
  refreshLevelsUi();
});

// Блок «что это / как работает / зачем нужен» (общий для палитры и инспектора)
function buildInfoHtml(type) {
  const info = ELEMENT_INFO[type];
  if (!info) return '';
  return `
    <div class="info-block"><span class="info-label">Что это</span>${info.what}</div>
    <div class="info-block"><span class="info-label">Как работает</span>${info.how}</div>
    <div class="info-block"><span class="info-label">Зачем нужен</span>${info.why}</div>
    ${info.extra3d ? `<div class="info-block"><span class="info-label">В режиме 3D</span>${info.extra3d}</div>` : ''}
    ${info.formula ? `<span class="info-formula">${info.formula}</span>` : ''}
  `;
}

function buildPalette(theme, allowedTypes = null) {
  paletteItemsEl.innerHTML = '';
  let items = REGISTRY[theme] || [];
  if (allowedTypes) {
    items = items.filter((item) => allowedTypes.includes(item.type));
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'palette-empty';
      empty.textContent = 'В этом уровне новых приборов нет: меняй параметры уже стоящих элементов.';
      paletteItemsEl.appendChild(empty);
    }
  }

  items.forEach((item) => {
    const entry = document.createElement('div');
    entry.className = 'palette-entry';

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
    entry.appendChild(btn);

    if (ELEMENT_INFO[item.type]) {
      const infoBtn = document.createElement('button');
      infoBtn.className = 'palette-info-btn';
      infoBtn.textContent = 'ⓘ';
      infoBtn.title = 'Как работает и зачем нужен';
      let panel = null;
      infoBtn.addEventListener('click', () => {
        if (panel) {
          panel.remove();
          panel = null;
          infoBtn.classList.remove('active');
        } else {
          panel = document.createElement('div');
          panel.className = 'palette-info';
          panel.innerHTML = buildInfoHtml(item.type);
          entry.appendChild(panel);
          infoBtn.classList.add('active');
        }
      });
      entry.appendChild(infoBtn);
    }

    paletteItemsEl.appendChild(entry);
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
  const center = viewMode === '3d' ? view3d.centerWorld() : camera.screenToWorld(canvas.width / 2, canvas.height / 2);
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
  if (levelState) {
    resetLevelState(levelState);
    levelState.announced = false;
    levelComplete.classList.add('hidden');
    updateGoalList();
  }
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
  if (levelState) {
    startLevel(levelState.level);
    showToast('Уровень начат заново');
    return;
  }
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
  inspActions.classList.toggle('hidden', !!sel.locked);
  contextHint.textContent = `Выбран: ${sel.label} (Del — удалить, Ctrl+D — дублировать)`;

  if (ELEMENT_INFO[sel.type]) {
    const card = document.createElement('details');
    card.className = 'info-card';
    card.open = infoCardOpen;
    card.innerHTML = `<summary>ℹ️ Как работает и зачем нужен</summary>${buildInfoHtml(sel.type)}`;
    card.addEventListener('toggle', () => {
      infoCardOpen = card.open;
    });
    inspBody.appendChild(card);
  }

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

  if (sel.propsLocked) {
    const note = document.createElement('div');
    note.className = 'prop-note';
    note.textContent = 'Параметры этого элемента закреплены условием уровня.';
    inspBody.appendChild(note);
  }

  let schema = sel.propsLocked ? [] : sel.getPropertySchema();
  if (!sel.propsLocked && viewMode === '3d' && typeof sel.getPropertySchema3D === 'function') {
    schema = schema.concat([{ type: 'heading', label: '3D · кручение (закрутку можно задать и мышью: кольцо вокруг груза)' }], sel.getPropertySchema3D());
  }
  for (const field of schema) {
    const curVal = sel.properties[field.key];
    const row = document.createElement('div');
    row.className = 'prop-row';

    if (field.type === 'heading') {
      row.className = 'prop-heading';
      row.textContent = field.label;
    } else if (field.type === 'boolean') {
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
  if ((el instanceof Pendulum || el instanceof Spring) && key === 'twist0') {
    el.twist = (value * Math.PI) / 180;
    el.twistVel = 0;
  } else if (el instanceof Pendulum && key === 'angle') {
    el.theta = (value * Math.PI) / 180;
    el.omega = 0;
  } else if (el instanceof Spring && key === 'displacement') {
    el.disp = value;
    el.vel = 0;
  } else if ((el instanceof Block || el instanceof Ball) && (key === 'vx' || key === 'vy')) {
    el[key] = value;
  } else if (el instanceof Capacitor && key === 'initV') {
    el.vc = value;
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
      if (el instanceof ElectricElement && !(el instanceof Battery) && !(el instanceof Wire)) totalP += el.power || 0;
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
  if (sel.locked) {
    showToast('Этот элемент закреплён уровнем');
    return;
  }
  const copy = sel.clone();
  world.add(copy);
  world.select(copy);
  syncInspector();
  showToast(`Скопирован: ${copy.label}`);
});

inspDelBtn.addEventListener('click', () => {
  const sel = world.selected;
  if (!sel) return;
  if (sel.locked) {
    showToast('Этот элемент закреплён уровнем');
    return;
  }
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
    if (hit instanceof Wire && !hit.locked) {
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
    } else if (world.hitTest(w.x, w.y) && !world.hitTest(w.x, w.y).locked) {
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
  } else if (mode === 'drag-el' && activeEl && hasMovedDuringDrag && !activeEl.locked) {
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
    if (sel && sel.locked) {
      showToast('Этот элемент закреплён уровнем');
    } else if (sel) {
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
function legendItem(cls, text) {
  return `<span class="legend-dot"><span class="legend-swatch ${cls}"></span>${text}</span>`;
}

function setupChartLegend(theme) {
  chartHistory = [];
  if (theme === 'mechanics') {
    chartTitle.textContent = '📈 Энергия (Дж)';
    chartLegend.innerHTML = legendItem('', 'Ek') + legendItem('ls-dash', 'Ep') + legendItem('ls-dot', 'Eполн');
  } else if (theme === 'optics') {
    chartTitle.textContent = '📈 Поток лучей';
    chartLegend.innerHTML = legendItem('', 'Лучей') + legendItem('ls-dash', 'Экран');
  } else if (theme === 'electricity') {
    chartTitle.textContent = '📈 Мощность и ток';
    chartLegend.innerHTML = legendItem('', 'P (Вт)') + legendItem('ls-dash', 'I×10 (А)');
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
      if (el instanceof ElectricElement && !(el instanceof Battery) && !(el instanceof Wire)) totalP += el.power || 0;
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

  // Чёрно-белый стиль: линии различаются начертанием
  const styles = [
    { col: '#ffffff', dash: [] },
    { col: '#ffffff', dash: [6, 4] },
    { col: '#ffffff', dash: [2, 3] },
  ];
  const used = currentTheme === 'mechanics' ? 3 : 2;

  ['a', 'b', 'c'].forEach((key, idx) => {
    if (idx >= used) return;
    chartCtx.strokeStyle = styles[idx].col;
    chartCtx.setLineDash(styles[idx].dash);
    chartCtx.lineWidth = idx === 2 ? 2.4 : 1.8;
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
  chartCtx.setLineDash([]);
}

// ============================================================
//  3D-режим: тот же мир, другой взгляд
// ============================================================
view3d = new View3D(canvas3d);

let mode3 = 'idle'; // 'idle' | 'orbit' | 'pan' | 'drag' | 'rotate' | 'bob' | 'wire'
let active3 = null;
let dragOff3 = { x: 0, y: 0 };
let down3 = { x: 0, y: 0 };
let last3 = { x: 0, y: 0 };
let moved3 = false;
let wireStart3 = null;
let wireSnap3 = null;
let twistLast = 0;

function eventToCanvas3(e) {
  const r = canvas3d.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function setViewMode(m) {
  viewMode = m;
  world.mode3d = m === '3d'; // в 3D у пружин и маятников появляется кручение
  canvas.style.display = m === '3d' ? 'none' : 'block';
  rayCanvas.style.display = m === '3d' ? 'none' : 'block';
  canvas3d.style.display = m === '3d' ? 'block' : 'none';
  viewToggleBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === m));

  // сбрасываем незавершённые жесты
  mode = 'idle';
  mode3 = 'idle';
  activeEl = null;
  active3 = null;
  world.wirePreview = null;
  view3d.wirePreview = null;
  canvas.classList.remove('panning');

  if (m === '3d') {
    resizeCanvas();
    if (view3d.layout !== View3D.layoutFor(world.theme)) view3d.reset(world.theme);
    showToast('3D: тяните пустое место — вращение, ПКМ или Shift — сдвиг, колесо — масштаб');
  } else {
    showToast('Режим 2D');
  }
  updateZoomLabel();
  syncInspector(); // набор параметров зависит от режима (в 3D есть блок «кручение»)
}

viewToggleBtns.forEach((b) => b.addEventListener('click', () => setViewMode(b.dataset.view)));

// Многие элементы пересчитывают размеры (длина плоскости, высота зеркала и т.п.) внутри render().
// В 3D-режиме 2D-отрисовка не нужна, но этот пересчёт обязателен для физики,
// поэтому прогоняем её в крошечный невидимый холст.
const sinkCanvas = document.createElement('canvas');
sinkCanvas.width = 8;
sinkCanvas.height = 8;
const sinkCtx = sinkCanvas.getContext('2d');

function draw3D() {
  world.render(sinkCtx, 1);
  const segs = currentTheme === 'optics' ? OpticsEngine.trace(world) : null;
  view3d.render(world, segs);
}

canvas3d.addEventListener('contextmenu', (e) => e.preventDefault());

canvas3d.addEventListener('mousedown', (e) => {
  const p = eventToCanvas3(e);
  down3 = { x: e.clientX, y: e.clientY };
  last3 = { x: e.clientX, y: e.clientY };
  moved3 = false;
  wireSnap3 = null;

  if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
    mode3 = 'pan';
    canvas3d.classList.add('orbiting');
    return;
  }
  if (e.button !== 0) return;

  const pick = view3d.pickAt(p.x, p.y);

  if (pick && pick.kind === 'handle') {
    mode3 = 'rotate';
    active3 = pick.el;
    return;
  }

  if (pick && pick.kind === 'twist') {
    mode3 = 'twist';
    active3 = pick.el;
    const a0 = view3d.twistAngleAt(pick.el, p.x, p.y);
    twistLast = a0 === null ? 0 : a0;
    return;
  }

  if (pick && pick.kind === 'port' && currentTheme === 'electricity') {
    mode3 = 'wire';
    wireStart3 = { element: pick.el, index: pick.index };
    const pt = pick.el.getWorldPorts()[pick.index];
    view3d.wirePreview = { a: [pt.x, pt.y], b: [pt.x, pt.y], snap: false };
    return;
  }

  if (pick && pick.kind === 'element') {
    const el = pick.el;
    world.select(el);
    syncInspector();
    active3 = el;
    if ((el instanceof Pendulum || el instanceof Spring) && pick.part === 'bob') {
      mode3 = 'bob';
      return;
    }
    mode3 = 'drag';
    const pw = view3d.screenToWorld(p.x, p.y, 0);
    dragOff3 = pw ? { x: pw.x - el.x, y: pw.y - el.y } : { x: 0, y: 0 };
    return;
  }

  world.select(null);
  syncInspector();
  mode3 = 'orbit';
  canvas3d.classList.add('orbiting');
});

window.addEventListener('mousemove', (e) => {
  if (viewMode !== '3d') return;
  const p = eventToCanvas3(e);

  if (mode3 === 'idle') {
    if (e.target !== canvas3d) return;
    const pick = view3d.pickAt(p.x, p.y);
    let cls = '';
    if (pick && (pick.kind === 'handle' || pick.kind === 'twist')) cls = 'hover-rotate';
    else if (pick && pick.kind === 'port') cls = 'hover-port';
    else if (pick && pick.kind === 'element' && !pick.el.locked) cls = 'hover-item';
    canvas3d.className = cls;
    return;
  }

  const dx = e.clientX - last3.x;
  const dy = e.clientY - last3.y;
  last3 = { x: e.clientX, y: e.clientY };
  if (Math.hypot(e.clientX - down3.x, e.clientY - down3.y) > 4) moved3 = true;

  if (mode3 === 'orbit') {
    view3d.orbit(dx, dy);
  } else if (mode3 === 'pan') {
    view3d.pan(dx, dy);
  } else if (mode3 === 'drag') {
    const el = active3;
    if (!el || !moved3 || el.locked || el instanceof Wire) return;
    const pw = view3d.screenToWorld(p.x, p.y, 0);
    if (!pw) return;
    let nx = pw.x - dragOff3.x;
    let ny = pw.y - dragOff3.y;
    if (world.snapToGrid) {
      nx = Math.round(nx / 25) * 25;
      ny = Math.round(ny / 25) * 25;
    }
    if (el instanceof Block || el instanceof Ball) {
      el.vx = 0;
      el.vy = 0;
      el.trail = [];
    }
    el.x = nx;
    el.y = ny;
    if (!world.running) el.saveState();
  } else if (mode3 === 'rotate' && active3) {
    const pw = view3d.screenToWorld(p.x, p.y, 0);
    if (!pw) return;
    let ang = Math.atan2(pw.y - active3.y, pw.x - active3.x) + Math.PI / 2;
    if (e.shiftKey) {
      const step = Math.PI / 12;
      ang = Math.round(ang / step) * step;
    }
    active3.rotation = ang;
    if (!world.running) active3.saveState();
    syncInspector();
  } else if (mode3 === 'twist' && active3) {
    const a = view3d.twistAngleAt(active3, p.x, p.y);
    if (a === null) return;
    let d = a - twistLast;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    twistLast = a;
    const LIM = 4 * Math.PI; // не более двух оборотов в каждую сторону
    active3.twist = Math.max(-LIM, Math.min(LIM, (active3.twist || 0) + d));
    active3.twistVel = 0;
    active3.properties.twist0 = Math.round((active3.twist * 180) / Math.PI);
    active3.saveState();
    syncInspector();
  } else if (mode3 === 'bob' && active3) {
    const pw = view3d.screenToWorld(p.x, p.y, 0);
    if (!pw) return;
    if (active3 instanceof Pendulum) {
      const ddx = pw.x - active3.x;
      const ddy = Math.max(20, pw.y - active3.y);
      active3.theta = Math.atan2(ddx, ddy);
      active3.omega = 0;
      active3.properties.angle = Math.round((active3.theta * 180) / Math.PI);
      active3.saveState();
      syncInspector();
    } else if (active3 instanceof Spring) {
      const rest = active3.properties.restLength || 140;
      active3.disp = Math.max(-80, Math.min(140, pw.y - active3.y - rest));
      active3.vel = 0;
      active3.properties.displacement = Math.round(active3.disp);
      active3.saveState();
      syncInspector();
    }
  } else if (mode3 === 'wire' && view3d.wirePreview && wireStart3) {
    const snap = view3d.nearestPort(p.x, p.y, 22);
    const valid = snap && (snap.el !== wireStart3.element || snap.index !== wireStart3.index) ? snap : null;
    const pw = view3d.screenToWorld(p.x, p.y, PORT_Z_3D);
    view3d.wirePreview.b = valid ? [valid.wx, valid.wy] : pw ? [pw.x, pw.y] : view3d.wirePreview.b;
    view3d.wirePreview.snap = !!valid;
    wireSnap3 = valid;
  }
});

window.addEventListener('mouseup', () => {
  if (viewMode !== '3d') return;

  if (mode3 === 'drag' && active3 instanceof Switch && !moved3) {
    active3.properties.closed = !active3.properties.closed;
    active3.saveState();
    syncInspector();
    showToast(active3.properties.closed ? 'Ключ замкнут (Вкл)' : 'Ключ разомкнут (Выкл)');
  }

  if (mode3 === 'wire' && wireStart3) {
    if (wireSnap3) {
      connectPorts(world, wireStart3.element, wireStart3.index, wireSnap3.el, wireSnap3.index);
      showToast('Клеммы соединены проводом');
    }
  }

  view3d.wirePreview = null;
  wireStart3 = null;
  wireSnap3 = null;
  mode3 = 'idle';
  active3 = null;
  moved3 = false;
  canvas3d.classList.remove('orbiting');
});

canvas3d.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    view3d.zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    updateZoomLabel();
  },
  { passive: false }
);

canvas3d.addEventListener('dragover', (e) => e.preventDefault());
canvas3d.addEventListener('drop', (e) => {
  e.preventDefault();
  if (!draggedPaletteItem) return;
  const pt = eventToCanvas3(e);
  const w = view3d.screenToWorld(pt.x, pt.y, 0);
  if (w) spawnElement(draggedPaletteItem.cls, w.x, w.y);
  draggedPaletteItem = null;
});

const PORT_Z_3D = 16;

// ============================================================
//  Режим уровней
// ============================================================
const THEME_NAMES = { mechanics: 'Механика', optics: 'Оптика', electricity: 'Электричество' };
let levelState = null;

LevelProgress.load();

function refreshLevelsUi() {
  const total = LEVELS.length;
  const done = LevelProgress.doneCount();
  levelsCtaCount.textContent = `${done} / ${total}`;
  levelsProgressEl.textContent = `Пройдено ${done} из ${total}`;

  levelsGroupsEl.innerHTML = '';
  let number = 0;
  for (const theme of ['mechanics', 'optics', 'electricity']) {
    const list = LEVELS.filter((l) => l.theme === theme);
    if (list.length === 0) continue;
    const doneInGroup = list.filter((l) => LevelProgress.isDone(l.id)).length;

    const group = document.createElement('section');
    group.className = 'levels-group';
    group.innerHTML = `<div class="levels-group-title"><span>${THEME_NAMES[theme]}</span><span>${doneInGroup} / ${list.length}</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'level-grid';

    for (const level of list) {
      number++;
      const card = document.createElement('button');
      card.className = 'level-card' + (LevelProgress.isDone(level.id) ? ' done' : '');
      card.innerHTML = `
        <span class="level-num">УРОВЕНЬ ${String(number).padStart(2, '0')}</span>
        <h3>${level.title}</h3>
        <p>${level.short}</p>
        <span class="level-check">✓</span>
      `;
      card.addEventListener('click', () => startLevel(level));
      grid.appendChild(card);
    }
    group.appendChild(grid);
    levelsGroupsEl.appendChild(group);
  }
}

function openLevelsScreen() {
  leaveLevelMode();
  sandboxScreen.classList.add('hidden');
  themeScreen.classList.add('hidden');
  currentTheme = null;
  refreshLevelsUi();
  levelsScreen.classList.remove('hidden');
}

function leaveLevelMode() {
  levelState = null;
  sandboxScreen.classList.remove('level-mode');
  levelPanel.classList.add('hidden');
  presetsBlock.classList.remove('hidden');
  levelComplete.classList.add('hidden');
  clearBtn.textContent = '🗑 Очистить';
}

function startLevel(level) {
  levelsScreen.classList.add('hidden');
  themeScreen.classList.add('hidden');
  sandboxScreen.classList.remove('hidden');
  sandboxScreen.classList.add('level-mode');
  presetsBlock.classList.add('hidden');
  levelPanel.classList.remove('hidden');
  clearBtn.textContent = '↻ Заново';

  currentTheme = level.theme;
  world.theme = level.theme;
  world.gravity = 9.81;
  world.timeScale = 1;
  document.querySelectorAll('.speed-pill').forEach((p) => p.classList.toggle('active', p.dataset.speed === '1'));

  resizeCanvas();
  camera.reset();
  buildPalette(level.theme, level.allowed || []);
  setupChartLegend(level.theme);

  world.clear();
  chartHistory = [];
  const refs = level.setup(world);
  world.saveAllStates();
  world.select(null);

  levelState = createLevelState(level, refs);
  levelState.announced = false;

  const index = LEVELS.indexOf(level) + 1;
  levelKicker.textContent = `${THEME_NAMES[level.theme]} · уровень ${index} из ${LEVELS.length}`;
  levelTitleEl.textContent = level.title;
  levelBriefEl.textContent = level.brief;
  levelHintEl.textContent = level.hint;
  levelHintEl.classList.add('hidden');
  levelComplete.classList.add('hidden');
  goalListEl.innerHTML = '';
  level.goals.forEach((g) => {
    const li = document.createElement('li');
    li.className = 'goal-item';
    li.innerHTML = `<span class="goal-box"></span><span>${g.text}</span>`;
    goalListEl.appendChild(li);
  });

  setRunning(level.running !== false);
  syncInspector();
  contextHint.textContent = level.theme === 'mechanics' ? 'Соберите установку и нажмите «Старт»' : contextHint.textContent;
}

function updateGoalList() {
  if (!levelState) return;
  [...goalListEl.children].forEach((li, i) => {
    const ok = !!levelState.ok[i];
    li.classList.toggle('ok', ok);
    li.querySelector('.goal-box').textContent = ok ? '✓' : '';
  });
}

function checkLevel(dt) {
  const changed = evaluateLevel(levelState, world, dt);
  if (changed) updateGoalList();

  if (levelState.done && !levelState.announced) {
    levelState.announced = true;
    LevelProgress.markDone(levelState.level.id);
    const idx = LEVELS.indexOf(levelState.level);
    const hasNext = idx >= 0 && idx < LEVELS.length - 1;
    levelNextBtn.classList.toggle('hidden', !hasNext);
    levelCompleteText.textContent = `«${levelState.level.title}» выполнен. Пройдено ${LevelProgress.doneCount()} из ${LEVELS.length}.`;
    levelComplete.classList.remove('hidden');
  }
}

levelsBtn.addEventListener('click', openLevelsScreen);
levelsHomeBtn.addEventListener('click', () => {
  levelsScreen.classList.add('hidden');
  themeScreen.classList.remove('hidden');
  refreshLevelsUi();
});
levelsBackBtn.addEventListener('click', openLevelsScreen);
levelHintBtn.addEventListener('click', () => levelHintEl.classList.toggle('hidden'));
levelRestartBtn.addEventListener('click', () => {
  if (levelState) startLevel(levelState.level);
});
levelStayBtn.addEventListener('click', () => levelComplete.classList.add('hidden'));
levelListBtn.addEventListener('click', openLevelsScreen);
levelNextBtn.addEventListener('click', () => {
  if (!levelState) return;
  const next = LEVELS[LEVELS.indexOf(levelState.level) + 1];
  if (next) startLevel(next);
  else openLevelsScreen();
});

refreshLevelsUi();

// ---------- Главный цикл симуляции (60 FPS) ----------
let lastTime = performance.now();
let frameCounter = 0;

function loop(now) {
  const dt = Math.min(0.04, (now - lastTime) / 1000);
  lastTime = now;

  if (currentTheme) {
    let draggedInSim = (mode === 'drag-el' || mode === 'drag-bob') && hasMovedDuringDrag ? activeEl : null;
    if (viewMode === '3d' && (mode3 === 'bob' || mode3 === 'twist' || mode3 === 'drag') && moved3) draggedInSim = active3;
    world.update(dt, draggedInSim);
    if (viewMode === '3d') draw3D();
    else draw();
    if (levelState) checkLevel(dt);

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
