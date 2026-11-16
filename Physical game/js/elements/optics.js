// ============================================================
//  ОПТИКА — источники света, собирающие и рассеивающие линзы,
//  плоские и сферические зеркала, стеклянные призмы с дисперсией,
//  экран-детектор и 2D-трассировщик лучей в реальном времени
// ============================================================

const SPECTRUM_COLORS = [
  { name: 'Красный (650 нм)', color: '#ff4b5c', offset: -0.045 },
  { name: 'Оранжевый (600 нм)', color: '#ff9233', offset: -0.028 },
  { name: 'Жёлтый (580 нм)', color: '#ffe047', offset: -0.012 },
  { name: 'Зелёный (532 нм)', color: '#38ef7d', offset: 0.005 },
  { name: 'Голубой (488 нм)', color: '#38bdf8', offset: 0.025 },
  { name: 'Синий (450 нм)', color: '#6366f1', offset: 0.045 },
  { name: 'Фиолетовый (405 нм)', color: '#c084fc', offset: 0.068 },
];

const SOURCE_COLOR_MAP = {
  white: '#ffffff',
  red: '#ff4b5c',
  green: '#38ef7d',
  cyan: '#38bdf8',
  gold: '#ffe047',
};

class LightSource extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'light-source';
    this.category = 'optics';
    this.label = 'Источник света';
    this.color = '#fbbf24';
    this.width = 56;
    this.height = 44;

    this.properties = {
      kind: 'beam',       // 'laser' | 'beam' | 'point'
      spectrum: 'white',  // 'white' | 'red' | 'green' | 'cyan' | 'gold'
      rayCount: 7,
      spread: 42,
      intensity: 1.0,
    };
  }

  getPropertySchema() {
    return [
      {
        key: 'kind',
        label: 'Тип излучателя',
        type: 'select',
        options: [
          { value: 'beam', label: 'Параллельный пучок' },
          { value: 'laser', label: 'Одиночный лазер' },
          { value: 'point', label: 'Расходящийся веер' },
        ],
      },
      {
        key: 'spectrum',
        label: 'Спектр / Цвет',
        type: 'select',
        options: [
          { value: 'white', label: 'Белый (дисперсия)' },
          { value: 'red', label: 'Красный (650 нм)' },
          { value: 'green', label: 'Зелёный (532 нм)' },
          { value: 'cyan', label: 'Голубой (488 нм)' },
          { value: 'gold', label: 'Жёлтый (589 нм)' },
        ],
      },
      { key: 'rayCount', label: 'Число лучей N', min: 1, max: 15, step: 2, unit: '' },
      { key: 'spread', label: 'Ширина / раствор', min: 10, max: 120, step: 4, unit: '' },
    ];
  }

  getTelemetry() {
    const deg = Math.round((this.rotation * 180) / Math.PI);
    const n = this.properties.kind === 'laser' ? 1 : this.properties.rayCount;
    return [
      { name: 'Режим', value: this.properties.kind === 'beam' ? 'Пучок' : this.properties.kind === 'laser' ? 'Лазер' : 'Веер' },
      { name: 'Лучей', value: `${n}` },
      { name: 'Направление', value: `${deg}°` },
      { name: 'Спектр', value: this.properties.spectrum === 'white' ? 'Белый' : this.properties.spectrum },
    ];
  }

  emitRays() {
    const rays = [];
    const kind = this.properties.kind || 'beam';
    const spectrum = this.properties.spectrum || 'white';
    const hex = SOURCE_COLOR_MAP[spectrum] || '#ffffff';
    const count = kind === 'laser' ? 1 : Math.max(1, Math.round(this.properties.rayCount || 7));
    const spread = this.properties.spread || 42;

    const dirX = Math.cos(this.rotation);
    const dirY = Math.sin(this.rotation);

    if (kind === 'laser' || count === 1) {
      const start = this.toWorld(this.width / 2, 0);
      rays.push({
        x: start.x,
        y: start.y,
        dx: dirX,
        dy: dirY,
        color: hex,
        isWhite: spectrum === 'white',
        dispOffset: 0,
        intensity: 1,
      });
    } else if (kind === 'beam') {
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        const ly = t * spread * 1.4;
        const start = this.toWorld(this.width / 2, ly);
        rays.push({
          x: start.x,
          y: start.y,
          dx: dirX,
          dy: dirY,
          color: hex,
          isWhite: spectrum === 'white',
          dispOffset: 0,
          intensity: 1,
        });
      }
    } else if (kind === 'point') {
      const maxAng = (spread * 0.8 * Math.PI) / 180;
      const start = this.toWorld(this.width / 2, 0);
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        const ang = this.rotation + t * maxAng;
        rays.push({
          x: start.x,
          y: start.y,
          dx: Math.cos(ang),
          dy: Math.sin(ang),
          color: hex,
          isWhite: spectrum === 'white',
          dispOffset: 0,
          intensity: 1,
        });
      }
    }
    return rays;
  }

  render(ctx, world) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const hw = this.width / 2;
    const hh = this.height / 2;
    const hex = SOURCE_COLOR_MAP[this.properties.spectrum] || '#ffffff';

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#64748b';
    ctx.lineWidth = this.selected ? 2.2 : 1.5;
    roundRect(ctx, -hw, -hh, this.width, this.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hex;
    ctx.shadowColor = hex;
    ctx.shadowBlur = 12;
    roundRect(ctx, hw - 6, -hh + 6, 6, this.height - 12, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.arc(-6, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Lens extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'lens';
    this.category = 'optics';
    this.label = 'Линза';
    this.color = '#38bdf8';
    this.width = 28;
    this.height = 150;

    this.properties = {
      kind: 'converging',
      focal: 140,
      aperture: 150,
    };
  }

  getPropertySchema() {
    return [
      {
        key: 'kind',
        label: 'Тип линзы',
        type: 'select',
        options: [
          { value: 'converging', label: 'Собирающая (+F)' },
          { value: 'diverging', label: 'Рассеивающая (−F)' },
        ],
      },
      { key: 'focal', label: 'Фокус F', min: 50, max: 320, step: 10, unit: 'пкс' },
      { key: 'aperture', label: 'Диаметр D', min: 80, max: 260, step: 10, unit: 'пкс' },
    ];
  }

  getTelemetry() {
    const fMeters = (this.properties.focal || 140) / 100;
    const sign = this.properties.kind === 'diverging' ? -1 : 1;
    const dpt = sign / fMeters;
    return [
      { name: 'Тип', value: sign > 0 ? 'Собирающая' : 'Рассеивающая' },
      { name: 'Фокус F', value: `${(sign * fMeters * 100).toFixed(0)} см` },
      { name: 'Опт. сила D', value: `${dpt > 0 ? '+' : ''}${dpt.toFixed(2)} дптр` },
    ];
  }

  render(ctx, world) {
    this.height = this.properties.aperture || 150;
    const hh = this.height / 2;
    const F = this.properties.focal || 140;
    const isConv = this.properties.kind !== 'diverging';

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (world && world.showVectors) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-F * 2.2, 0);
      ctx.lineTo(F * 2.2, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      const marks = [
        { x: -F, label: 'F' },
        { x: F, label: 'F' },
        { x: -2 * F, label: '2F' },
        { x: 2 * F, label: '2F' },
      ];
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 10px Inter, system-ui';
      ctx.textAlign = 'center';
      for (const m of marks) {
        ctx.beginPath();
        ctx.arc(m.x, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(m.label, m.x, 14);
      }
    }

    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = this.selected ? 2.4 : 1.8;

    ctx.beginPath();
    if (isConv) {
      ctx.moveTo(0, -hh);
      ctx.quadraticCurveTo(18, 0, 0, hh);
      ctx.quadraticCurveTo(-18, 0, 0, -hh);
    } else {
      ctx.moveTo(-12, -hh);
      ctx.lineTo(12, -hh);
      ctx.quadraticCurveTo(4, 0, 12, hh);
      ctx.lineTo(-12, hh);
      ctx.quadraticCurveTo(-4, 0, -12, -hh);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    const s = isConv ? 1 : -1;
    ctx.moveTo(-6, -hh + s * 7);
    ctx.lineTo(0, -hh);
    ctx.lineTo(6, -hh + s * 7);
    ctx.moveTo(-6, hh - s * 7);
    ctx.lineTo(0, hh);
    ctx.lineTo(6, hh - s * 7);
    ctx.stroke();

    ctx.restore();
  }
}

class Mirror extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'mirror';
    this.category = 'optics';
    this.label = 'Зеркало';
    this.color = '#a78bfa';
    this.width = 20;
    this.height = 140;

    this.properties = {
      kind: 'flat',   // 'flat' | 'concave' | 'convex'
      aperture: 140,
      focal: 130,
    };
  }

  getPropertySchema() {
    return [
      {
        key: 'kind',
        label: 'Профиль зеркала',
        type: 'select',
        options: [
          { value: 'flat', label: 'Плоское зеркало' },
          { value: 'concave', label: 'Вогнутое (собирающее)' },
          { value: 'convex', label: 'Выпуклое (рассеивающее)' },
        ],
      },
      { key: 'aperture', label: 'Длина зеркала L', min: 60, max: 260, step: 10, unit: 'пкс' },
      { key: 'focal', label: 'Фокус сферич. F', min: 60, max: 300, step: 10, unit: 'пкс' },
    ];
  }

  getTelemetry() {
    const kindNames = { flat: 'Плоское', concave: 'Вогнутое', convex: 'Выпуклое' };
    return [
      { name: 'Тип', value: kindNames[this.properties.kind] || 'Плоское' },
      { name: 'Апертура', value: `${this.properties.aperture} пкс` },
      { name: 'Угол', value: `${Math.round((this.rotation * 180) / Math.PI)}°` },
    ];
  }

  render(ctx, world) {
    this.height = this.properties.aperture || 140;
    const hh = this.height / 2;
    const kind = this.properties.kind || 'flat';
    const F = this.properties.focal || 130;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (world && world.showVectors && kind !== 'flat') {
      const fx = kind === 'concave' ? -F : F;
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '600 10px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.beginPath();
      ctx.arc(fx, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('F', fx, 14);
    }

    const curve = kind === 'concave' ? 18 : kind === 'convex' ? -18 : 0;

    ctx.strokeStyle = 'rgba(167, 139, 250, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let y = -hh + 8; y <= hh - 8; y += 12) {
      const t = y / hh;
      const xCurve = curve * (1 - t * t) * 0.5;
      ctx.moveTo(xCurve, y);
      ctx.lineTo(xCurve + 9, y + 6);
    }
    ctx.stroke();

    ctx.strokeStyle = this.selected ? '#ffffff' : '#c4b5fd';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-curve * 0.5, -hh);
    ctx.quadraticCurveTo(curve * 0.5, 0, -curve * 0.5, hh);
    ctx.stroke();

    ctx.restore();
  }
}

class Prism extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'prism';
    this.category = 'optics';
    this.label = 'Призма';
    this.color = '#818cf8';
    this.width = 130;
    this.height = 115;

    this.properties = {
      size: 130,
      ior: 1.52,
      dispersion: 1.2,
    };
  }

  getPropertySchema() {
    return [
      { key: 'size', label: 'Размер грани a', min: 70, max: 220, step: 10, unit: 'пкс' },
      { key: 'ior', label: 'Показатель преломл. n', min: 1.2, max: 2.4, step: 0.02, unit: '' },
      { key: 'dispersion', label: 'Дисперсия Δn', min: 0, max: 2.5, step: 0.1, unit: '' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Показатель n', value: `${this.properties.ior.toFixed(2)}` },
      { name: 'Критич. угол', value: `${((Math.asin(1 / this.properties.ior) * 180) / Math.PI).toFixed(1)}°` },
      { name: 'Дисперсия', value: `${(this.properties.dispersion * 100).toFixed(0)}%` },
    ];
  }

  getWorldVertices() {
    const s = this.properties.size || 130;
    const h = (s * Math.sqrt(3)) / 2;
    const localVerts = [
      { x: 0, y: -(2 / 3) * h },
      { x: s / 2, y: (1 / 3) * h },
      { x: -s / 2, y: (1 / 3) * h },
    ];
    return localVerts.map((v) => this.toWorld(v.x, v.y));
  }

  containsPoint(wx, wy) {
    const loc = this.toLocal(wx, wy);
    const s = this.properties.size || 130;
    return Math.hypot(loc.x, loc.y) <= s * 0.58;
  }

  render(ctx, world) {
    const s = this.properties.size || 130;
    this.width = s;
    this.height = s * 0.9;
    const verts = this.getWorldVertices();

    ctx.save();
    const grad = ctx.createLinearGradient(verts[0].x, verts[0].y, verts[1].x, verts[1].y);
    grad.addColorStop(0, 'rgba(129, 140, 248, 0.25)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.12)');

    ctx.fillStyle = grad;
    ctx.strokeStyle = this.selected ? '#ffffff' : '#818cf8';
    ctx.lineWidth = this.selected ? 2.4 : 1.8;

    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    ctx.lineTo(verts[1].x, verts[1].y);
    ctx.lineTo(verts[2].x, verts[2].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class OpticalScreen extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'optical-screen';
    this.category = 'optics';
    this.label = 'Экран';
    this.color = '#334155';
    this.width = 16;
    this.height = 180;

    this.properties = {
      height: 180,
    };
    this.hits = [];
  }

  getPropertySchema() {
    return [
      { key: 'height', label: 'Высота экрана H', min: 80, max: 320, step: 10, unit: 'пкс' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Попаданий лучей', value: `${this.hits.length}` },
      { name: 'Освещённость', value: `${(this.hits.length * 100).toFixed(0)} лк` },
    ];
  }

  render(ctx, world) {
    this.height = this.properties.height || 180;
    const hh = this.height / 2;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#94a3b8';
    ctx.lineWidth = this.selected ? 2.2 : 1.6;
    roundRect(ctx, -7, -hh, 14, this.height, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (const h of this.hits) {
      ctx.save();
      ctx.fillStyle = h.color;
      ctx.shadowColor = h.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ============================================================
//  Дополнительные оптические элементы
// ============================================================

// Какие спектральные цвета пропускает светофильтр
const FILTER_BANDS = {
  red:   ['#ff4b5c', '#ff9233'],
  gold:  ['#ffe047'],
  green: ['#38ef7d'],
  cyan:  ['#38bdf8', '#6366f1', '#c084fc'],
};

// ---------- Делитель пучка (полупрозрачное зеркало) ----------
class BeamSplitter extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'beam-splitter';
    this.category = 'optics';
    this.label = 'Делитель пучка';
    this.color = '#fcd34d';
    this.width = 14;
    this.height = 130;
    this.properties = { aperture: 130, ratio: 0.5 };
  }

  getPropertySchema() {
    return [
      { key: 'ratio', label: 'Доля отражённого света R', min: 0.1, max: 0.9, step: 0.05, unit: '' },
      { key: 'aperture', label: 'Длина L', min: 60, max: 260, step: 10, unit: 'пкс' },
    ];
  }

  getTelemetry() {
    const r = this.properties.ratio;
    return [
      { name: 'Отражается R', value: `${(r * 100).toFixed(0)} %` },
      { name: 'Проходит T', value: `${((1 - r) * 100).toFixed(0)} %` },
      { name: 'Угол', value: `${Math.round((this.rotation * 180) / Math.PI)}°` },
    ];
  }

  render(ctx, world) {
    this.height = this.properties.aperture || 130;
    const hh = this.height / 2;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = 'rgba(252, 211, 77, 0.14)';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#fcd34d';
    ctx.lineWidth = this.selected ? 2.4 : 1.8;
    roundRect(ctx, -5, -hh, 10, this.height, 3);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(0, -hh + 4);
    ctx.lineTo(0, hh - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ---------- Плоскопараллельная стеклянная пластина ----------
class GlassSlab extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'glass-slab';
    this.category = 'optics';
    this.label = 'Стеклянная пластина';
    this.color = '#7dd3fc';
    this.width = 60;
    this.height = 170;
    this.properties = { thickness: 60, length: 170, ior: 1.5, dispersion: 0.5 };
  }

  getPropertySchema() {
    return [
      { key: 'thickness', label: 'Толщина d', min: 20, max: 160, step: 5, unit: 'пкс' },
      { key: 'length', label: 'Длина пластины', min: 60, max: 300, step: 10, unit: 'пкс' },
      { key: 'ior', label: 'Показатель преломл. n', min: 1.1, max: 2.4, step: 0.02, unit: '' },
      { key: 'dispersion', label: 'Дисперсия Δn', min: 0, max: 2.5, step: 0.1, unit: '' },
    ];
  }

  getWorldVertices() {
    const hw = (this.properties.thickness || 60) / 2;
    const hh = (this.properties.length || 170) / 2;
    return [
      this.toWorld(-hw, -hh),
      this.toWorld(hw, -hh),
      this.toWorld(hw, hh),
      this.toWorld(-hw, hh),
    ];
  }

  getTelemetry() {
    const n = this.properties.ior;
    const crit = (Math.asin(Math.min(1, 1 / n)) * 180) / Math.PI;
    return [
      { name: 'Показатель n', value: n.toFixed(2) },
      { name: 'Скорость света v', value: `${(300 / n).toFixed(0)} Мм/с` },
      { name: 'Критич. угол', value: `${crit.toFixed(1)}°` },
    ];
  }

  render(ctx, world) {
    this.width = this.properties.thickness || 60;
    this.height = this.properties.length || 170;
    const v = this.getWorldVertices();
    ctx.save();
    ctx.fillStyle = 'rgba(125, 211, 252, 0.16)';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#7dd3fc';
    ctx.lineWidth = this.selected ? 2.4 : 1.8;
    ctx.beginPath();
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- Светофильтр ----------
class ColorFilter extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'color-filter';
    this.category = 'optics';
    this.label = 'Светофильтр';
    this.color = '#f87171';
    this.width = 12;
    this.height = 110;
    this.properties = { color: 'red', aperture: 110 };
  }

  getPropertySchema() {
    return [
      {
        key: 'color',
        label: 'Пропускаемый цвет',
        type: 'select',
        options: [
          { value: 'red', label: 'Красный / оранжевый' },
          { value: 'gold', label: 'Жёлтый' },
          { value: 'green', label: 'Зелёный' },
          { value: 'cyan', label: 'Голубой / синий / фиолетовый' },
        ],
      },
      { key: 'aperture', label: 'Высота фильтра', min: 40, max: 260, step: 10, unit: 'пкс' },
    ];
  }

  passes(rayColor) {
    const band = FILTER_BANDS[this.properties.color] || [];
    return band.includes(rayColor) || rayColor === SOURCE_COLOR_MAP[this.properties.color];
  }

  getTelemetry() {
    const names = { red: 'Красный', gold: 'Жёлтый', green: 'Зелёный', cyan: 'Холодный (гол.–фиол.)' };
    return [
      { name: 'Пропускает', value: names[this.properties.color] || '—' },
      { name: 'Остальное', value: 'Поглощается' },
    ];
  }

  render(ctx, world) {
    this.height = this.properties.aperture || 110;
    const hh = this.height / 2;
    const tint = SOURCE_COLOR_MAP[this.properties.color] || '#ffffff';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = tint;
    roundRect(ctx, -6, -hh, 12, this.height, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = this.selected ? '#ffffff' : tint;
    ctx.lineWidth = this.selected ? 2.4 : 1.8;
    roundRect(ctx, -6, -hh, 12, this.height, 3);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- Щель (диафрагма) ----------
class Slit extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'slit';
    this.category = 'optics';
    this.label = 'Щель';
    this.color = '#94a3b8';
    this.width = 12;
    this.height = 180;
    this.properties = { height: 180, gap: 30, offset: 0 };
  }

  getPropertySchema() {
    return [
      { key: 'gap', label: 'Ширина щели', min: 4, max: 120, step: 2, unit: 'пкс' },
      { key: 'offset', label: 'Смещение щели', min: -80, max: 80, step: 2, unit: 'пкс' },
      { key: 'height', label: 'Высота ширмы', min: 80, max: 320, step: 10, unit: 'пкс' },
    ];
  }

  // две непрозрачные части ширмы: [от, до] по локальной оси Y
  getJaws() {
    const H = this.properties.height || 180;
    const gap = this.properties.gap || 30;
    const off = Math.max(-H / 2 + gap / 2, Math.min(H / 2 - gap / 2, this.properties.offset || 0));
    return [
      [-H / 2, off - gap / 2],
      [off + gap / 2, H / 2],
    ];
  }

  getTelemetry() {
    return [
      { name: 'Ширина щели', value: `${this.properties.gap} пкс` },
      { name: 'Смещение', value: `${this.properties.offset} пкс` },
    ];
  }

  render(ctx, world) {
    this.height = this.properties.height || 180;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#94a3b8';
    ctx.lineWidth = this.selected ? 2.2 : 1.6;
    for (const [a, b] of this.getJaws()) {
      if (b - a < 1) continue;
      roundRect(ctx, -6, a, 12, b - a, 3);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ============================================================
//  Движок 2D-трассировки лучей (Ray Tracer)
// ============================================================

const OpticsEngine = {
  traceAndRender(ctx, world) {
    const sources = world.elements.filter((e) => e instanceof LightSource);
    const screens = world.elements.filter((e) => e instanceof OpticalScreen);
    for (const sc of screens) sc.hits = [];

    if (sources.length === 0) return;

    const queue = [];
    for (const src of sources) {
      for (const r of src.emitRays()) {
        queue.push({ ...r, depth: 0 });
      }
    }

    const segments = [];
    const MAX_DEPTH = 22;
    const MAX_DIST = 2600;
    let processed = 0;

    while (queue.length > 0) {
      const ray = queue.shift();
      if (ray.depth > MAX_DEPTH || ray.intensity < 0.04) continue;
      if (++processed > 3000) break;

      const hit = this.findClosestIntersection(ray, world.elements);
      if (!hit) {
        segments.push({
          x1: ray.x,
          y1: ray.y,
          x2: ray.x + ray.dx * MAX_DIST,
          y2: ray.y + ray.dy * MAX_DIST,
          color: ray.color,
          intensity: ray.intensity,
        });
        continue;
      }

      segments.push({
        x1: ray.x,
        y1: ray.y,
        x2: hit.x,
        y2: hit.y,
        color: ray.color,
        intensity: ray.intensity,
      });

      const el = hit.element;
      const eps = 0.75;

      if (el instanceof OpticalScreen) {
        el.hits.push({ x: hit.x, y: hit.y, color: ray.color });
        continue;
      }

      // Непрозрачная ширма щели поглощает луч
      if (el instanceof Slit) continue;

      // Светофильтр: белый свет окрашивает, свой цвет пропускает, остальное поглощает
      if (el instanceof ColorFilter) {
        const tint = SOURCE_COLOR_MAP[el.properties.color] || '#ffffff';
        if (ray.isWhite || el.passes(ray.color)) {
          queue.push({
            x: hit.x + ray.dx * eps,
            y: hit.y + ray.dy * eps,
            dx: ray.dx,
            dy: ray.dy,
            color: ray.isWhite ? tint : ray.color,
            isWhite: false,
            dispOffset: ray.dispOffset,
            intensity: ray.intensity * 0.85,
            depth: ray.depth + 1,
          });
        }
        continue;
      }

      // Делитель пучка: часть луча отражается, часть проходит
      if (el instanceof BeamSplitter) {
        const c = Math.cos(-el.rotation);
        const s = Math.sin(-el.rotation);
        const ldx = ray.dx * c - ray.dy * s;
        const ldy = ray.dx * s + ray.dy * c;
        const nldx = -ldx;
        const nldy = ldy;
        const wc = Math.cos(el.rotation);
        const ws = Math.sin(el.rotation);
        const rdx = nldx * wc - nldy * ws;
        const rdy = nldx * ws + nldy * wc;
        const R = el.properties.ratio ?? 0.5;

        queue.push({
          x: hit.x + rdx * eps,
          y: hit.y + rdy * eps,
          dx: rdx,
          dy: rdy,
          color: ray.color,
          isWhite: ray.isWhite,
          dispOffset: ray.dispOffset,
          intensity: ray.intensity * R,
          depth: ray.depth + 1,
        });
        queue.push({
          x: hit.x + ray.dx * eps,
          y: hit.y + ray.dy * eps,
          dx: ray.dx,
          dy: ray.dy,
          color: ray.color,
          isWhite: ray.isWhite,
          dispOffset: ray.dispOffset,
          intensity: ray.intensity * (1 - R),
          depth: ray.depth + 1,
        });
        continue;
      }

      if (el instanceof Mirror) {
        // Отражение в локальных координатах зеркала
        const locHit = el.toLocal(hit.x, hit.y);
        const c = Math.cos(-el.rotation);
        const s = Math.sin(-el.rotation);
        const ldx = ray.dx * c - ray.dy * s;
        const ldy = ray.dx * s + ray.dy * c;

        let nldx, nldy;
        if (el.properties.kind === 'flat') {
          nldx = -ldx;
          nldy = ldy;
        } else {
          // Сферическое зеркало (параксиальная формула отражения)
          const signF = el.properties.kind === 'concave' ? 1 : -1;
          const f = signF * (el.properties.focal || 130);
          const outSign = ldx >= 0 ? -1 : 1;
          const tanIn = ldy / Math.max(0.05, Math.abs(ldx));
          const tanOut = tanIn - locHit.y / f;
          const len = Math.hypot(outSign, tanOut) || 1;
          nldx = outSign / len;
          nldy = tanOut / len;
        }

        const wc = Math.cos(el.rotation);
        const ws = Math.sin(el.rotation);
        const wdx = nldx * wc - nldy * ws;
        const wdy = nldx * ws + nldy * wc;

        queue.push({
          x: hit.x + wdx * eps,
          y: hit.y + wdy * eps,
          dx: wdx,
          dy: wdy,
          color: ray.color,
          isWhite: ray.isWhite,
          dispOffset: ray.dispOffset,
          intensity: ray.intensity * 0.95,
          depth: ray.depth + 1,
        });
      } else if (el instanceof Lens) {
        const locHit = el.toLocal(hit.x, hit.y);
        const c = Math.cos(-el.rotation);
        const s = Math.sin(-el.rotation);
        const ldx = ray.dx * c - ray.dy * s;
        const ldy = ray.dx * s + ray.dy * c;

        const signF = el.properties.kind === 'diverging' ? -1 : 1;
        const f = signF * (el.properties.focal || 140);
        const dirSign = ldx >= 0 ? 1 : -1;
        const tanIn = ldy / Math.max(0.05, Math.abs(ldx));
        const tanOut = tanIn - locHit.y / f;

        const outLen = Math.hypot(dirSign, tanOut) || 1;
        const nldx = dirSign / outLen;
        const nldy = tanOut / outLen;

        const wc = Math.cos(el.rotation);
        const ws = Math.sin(el.rotation);
        const wdx = nldx * wc - nldy * ws;
        const wdy = nldx * ws + nldy * wc;

        queue.push({
          x: hit.x + wdx * eps,
          y: hit.y + wdy * eps,
          dx: wdx,
          dy: wdy,
          color: ray.color,
          isWhite: ray.isWhite,
          dispOffset: ray.dispOffset,
          intensity: ray.intensity * 0.96,
          depth: ray.depth + 1,
        });
      } else if (el instanceof Prism || el instanceof GlassSlab) {
        if (ray.isWhite && (el.properties.dispersion || 0) > 0.01) {
          for (const spec of SPECTRUM_COLORS) {
            const subRay = {
              ...ray,
              color: spec.color,
              isWhite: false,
              dispOffset: spec.offset * (el.properties.dispersion || 1),
              intensity: 0.85,
            };
            this.refractAtSurface(subRay, hit, el, queue, eps);
          }
        } else {
          this.refractAtSurface(ray, hit, el, queue, eps);
        }
      }
    }

    ctx.save();
    ctx.lineCap = 'round';
    for (const seg of segments) {
      ctx.strokeStyle = seg.color;
      ctx.shadowColor = seg.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.4;
      ctx.globalAlpha = Math.max(0.15, Math.min(1, seg.intensity));
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.restore();
  },

  refractAtSurface(ray, hit, prism, queue, eps) {
    const nGlass = Math.max(1.05, (prism.properties.ior || 1.52) + (ray.dispOffset || 0));
    let nx = hit.nx;
    let ny = hit.ny;
    let cosI = -(ray.dx * nx + ray.dy * ny);

    let n1 = 1.0;
    let n2 = nGlass;
    if (cosI < 0) {
      cosI = -cosI;
      nx = -nx;
      ny = -ny;
      n1 = nGlass;
      n2 = 1.0;
    }

    const eta = n1 / n2;
    const k = 1 - eta * eta * (1 - cosI * cosI);

    let outDx, outDy;
    if (k < 0) {
      outDx = ray.dx + 2 * cosI * nx;
      outDy = ray.dy + 2 * cosI * ny;
    } else {
      const scale = eta * cosI - Math.sqrt(k);
      outDx = eta * ray.dx + scale * nx;
      outDy = eta * ray.dy + scale * ny;
    }

    const len = Math.hypot(outDx, outDy) || 1;
    outDx /= len;
    outDy /= len;

    queue.push({
      x: hit.x + outDx * eps,
      y: hit.y + outDy * eps,
      dx: outDx,
      dy: outDy,
      color: ray.color,
      isWhite: false,
      dispOffset: ray.dispOffset,
      intensity: ray.intensity * 0.96,
      depth: ray.depth + 1,
    });
  },

  findClosestIntersection(ray, elements) {
    let closest = null;
    let minT = Infinity;

    for (const el of elements) {
      if (el instanceof Slit) {
        for (const [a, b] of el.getJaws()) {
          if (b - a < 1) continue;
          const res = this.intersectRaySegment(ray, el.toWorld(0, a), el.toWorld(0, b));
          if (res && res.t < minT) {
            minT = res.t;
            closest = { ...res, element: el };
          }
        }
      } else if (
        el instanceof Mirror || el instanceof Lens || el instanceof OpticalScreen ||
        el instanceof BeamSplitter || el instanceof ColorFilter
      ) {
        const hh = (el.height || 140) / 2;
        const p1 = el.toWorld(0, -hh);
        const p2 = el.toWorld(0, hh);
        const res = this.intersectRaySegment(ray, p1, p2);
        if (res && res.t < minT) {
          minT = res.t;
          closest = { ...res, element: el };
        }
      } else if (el instanceof Prism || el instanceof GlassSlab) {
        const verts = el.getWorldVertices();
        for (let i = 0; i < verts.length; i++) {
          const p1 = verts[i];
          const p2 = verts[(i + 1) % verts.length];
          const res = this.intersectRaySegment(ray, p1, p2, el);
          if (res && res.t < minT) {
            minT = res.t;
            closest = { ...res, element: el };
          }
        }
      }
    }
    return closest;
  },

  intersectRaySegment(ray, p1, p2, polygonCenterEl = null) {
    const v1x = ray.x - p1.x;
    const v1y = ray.y - p1.y;
    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;
    const v3x = -ray.dy;
    const v3y = ray.dx;

    const dot = v2x * v3x + v2y * v3y;
    if (Math.abs(dot) < 1e-6) return null;

    const t1 = (v2x * v1y - v2y * v1x) / dot;
    const t2 = (v1x * v3x + v1y * v3y) / dot;

    if (t1 > 0.5 && t2 >= 0 && t2 <= 1) {
      const segLen = Math.hypot(v2x, v2y) || 1;
      let nx = -v2y / segLen;
      let ny = v2x / segLen;

      if (polygonCenterEl) {
        // Гарантируем внешнюю нормаль от центра призмы
        const mx = 0.5 * (p1.x + p2.x) - polygonCenterEl.x;
        const my = 0.5 * (p1.y + p2.y) - polygonCenterEl.y;
        if (nx * mx + ny * my < 0) {
          nx = -nx;
          ny = -ny;
        }
      } else {
        if (ray.dx * nx + ray.dy * ny > 0) {
          nx = -nx;
          ny = -ny;
        }
      }

      return {
        t: t1,
        x: ray.x + ray.dx * t1,
        y: ray.y + ray.dy * t1,
        nx,
        ny,
      };
    }
    return null;
  },
};
