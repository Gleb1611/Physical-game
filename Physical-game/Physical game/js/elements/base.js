// ============================================================
//  Element — базовый класс всех физических объектов мира
// ============================================================

class Element {
  constructor(x, y) {
    this.id = Element._nextId++;
    this.x = x;
    this.y = y;
    this.rotation = 0; // радианы
    this.width = 60;
    this.height = 60;
    this.selected = false;
    this.rotatable = true;

    this.type = 'generic';
    this.category = 'generic';
    this.label = 'Объект';
    this.color = '#4f7cff';

    this.properties = {};
    this.ports = [];
    this._savedState = null;
  }

  // ---- Преобразования координат ----
  toWorld(lx, ly) {
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    return {
      x: this.x + lx * c - ly * s,
      y: this.y + lx * s + ly * c,
    };
  }

  toLocal(wx, wy) {
    const dx = wx - this.x;
    const dy = wy - this.y;
    const c = Math.cos(-this.rotation);
    const s = Math.sin(-this.rotation);
    return {
      x: dx * c - dy * s,
      y: dx * s + dy * c,
    };
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      w: this.width,
      h: this.height,
    };
  }

  // Локальная рамка выделения (может переопределяться у маятника/пружины)
  getSelectionLocalBox() {
    return {
      x: -this.width / 2,
      y: -this.height / 2,
      w: this.width,
      h: this.height,
    };
  }

  containsPoint(wx, wy) {
    const loc = this.toLocal(wx, wy);
    const hw = this.width / 2 + 4;
    const hh = this.height / 2 + 4;
    return loc.x >= -hw && loc.x <= hw && loc.y >= -hh && loc.y <= hh;
  }

  // Координаты ручки вращения в мировых координатах
  getRotationHandlePos() {
    const box = this.getSelectionLocalBox();
    return this.toWorld(0, box.y - 26);
  }

  hitRotationHandle(wx, wy, cameraScale = 1) {
    if (!this.selected || !this.rotatable) return false;
    const h = this.getRotationHandlePos();
    const r = Math.max(10, 12 / cameraScale);
    const dx = wx - h.x;
    const dy = wy - h.y;
    return dx * dx + dy * dy <= r * r;
  }

  // Порты в мировых координатах
  getWorldPorts() {
    return this.ports.map((p, idx) => {
      const w = this.toWorld(p.x, p.y);
      return {
        element: this,
        index: idx,
        name: p.name,
        x: w.x,
        y: w.y,
      };
    });
  }

  // Сохранение / восстановление начального состояния для Сброса
  saveState() {
    this._savedState = {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      width: this.width,
      height: this.height,
      properties: JSON.parse(JSON.stringify(this.properties)),
    };
  }

  restoreState() {
    if (!this._savedState) return;
    this.x = this._savedState.x;
    this.y = this._savedState.y;
    this.rotation = this._savedState.rotation;
    this.width = this._savedState.width;
    this.height = this._savedState.height;
    this.properties = JSON.parse(JSON.stringify(this._savedState.properties));
  }

  clone() {
    const copy = new this.constructor(this.x + 32, this.y + 32);
    copy.rotation = this.rotation;
    copy.width = this.width;
    copy.height = this.height;
    copy.properties = JSON.parse(JSON.stringify(this.properties));
    copy.saveState();
    return copy;
  }

  // Схема свойств для правой панели Инспектора
  getPropertySchema() {
    return [];
  }

  // Живая телеметрия объекта
  getTelemetry() {
    return [
      { name: 'Координаты', value: `${Math.round(this.x)}, ${Math.round(this.y)}` },
      { name: 'Угол θ', value: `${Math.round((this.rotation * 180) / Math.PI)}°` },
    ];
  }

  // Базовый рендер
  render(ctx, world) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = this.selected ? 2 : 1;

    roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, 0, 0);

    ctx.restore();
  }

  // Отрисовка рамки выделения, ручки вращения и портов
  renderOverlay(ctx, world) {
    if (this.ports && this.ports.length > 0) {
      const wPorts = this.getWorldPorts();
      for (const p of wPorts) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
        ctx.restore();
      }
    }

    if (!this.selected) return;

    const box = this.getSelectionLocalBox();
    const pad = 6;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    roundRect(ctx, box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2, 8);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.rotatable) {
      const handleY = box.y - 26;
      ctx.beginPath();
      ctx.moveTo(0, box.y - pad);
      ctx.lineTo(0, handleY);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, handleY, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2563eb';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  update(dt, world) {}
}

Element._nextId = 1;

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawArrow(ctx, x1, y1, x2, y2, color = '#22c55e', label = '') {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 3) return;

  const angle = Math.atan2(dy, dx);
  const headLen = Math.min(10, len * 0.35);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x2 + 7 * Math.cos(angle), y2 + 7 * Math.sin(angle));
  }
  ctx.restore();
}
