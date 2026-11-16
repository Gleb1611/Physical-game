// ============================================================
//  World — хранит элементы, координирует физические движки,
//  поиск портов, выделение и рендер
// ============================================================

class World {
  constructor() {
    this.elements = [];
    this.theme = 'mechanics';
    this.running = true;
    this.timeScale = 1.0;
    this.gravity = 9.81; // м/с²
    this.showVectors = true;
    this.snapToGrid = false;
    this.wirePreview = null;
  }

  add(el) {
    el.saveState();
    this.elements.push(el);
    return el;
  }

  remove(el) {
    const i = this.elements.indexOf(el);
    if (i >= 0) this.elements.splice(i, 1);

    // Если удалён электрический компонент — удаляем привязанные к нему провода
    if (!(el instanceof Wire)) {
      this.elements = this.elements.filter((item) => {
        if (!(item instanceof Wire)) return true;
        const connectedToRemoved =
          (item.portA && item.portA.elId === el.id) ||
          (item.portB && item.portB.elId === el.id);
        return !connectedToRemoved;
      });
    }
  }

  clear() {
    this.elements = [];
    this.wirePreview = null;
  }

  saveAllStates() {
    for (const el of this.elements) {
      el.saveState();
    }
  }

  restoreAllStates() {
    for (const el of this.elements) {
      el.restoreState();
    }
  }

  // Возвращает верхний элемент под точкой или null
  hitTest(wx, wy) {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (el instanceof Wire || el instanceof ForceZone) continue;
      if (el.containsPoint(wx, wy)) return el;
    }
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (el instanceof ForceZone && el.containsPoint(wx, wy)) return el;
    }
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (el instanceof Wire && el.containsPoint(wx, wy)) return el;
    }
    return null;
  }

  // Поиск ближайшего порта для подключения провода
  findPortAt(wx, wy, maxDist = 18) {
    let best = null;
    let bestD = maxDist;
    for (const el of this.elements) {
      if (!el.ports || el.ports.length === 0) continue;
      const wPorts = el.getWorldPorts();
      for (const p of wPorts) {
        const d = Math.hypot(wx - p.x, wy - p.y);
        if (d <= bestD) {
          bestD = d;
          best = p;
        }
      }
    }
    return best;
  }

  update(dt, draggedEl = null) {
    const scaledDt = Math.min(0.033, dt) * this.timeScale;

    if (this.theme === 'mechanics') {
      if (this.running) {
        MechanicsSolver.step(this, scaledDt, draggedEl);
      }
    } else if (this.theme === 'electricity') {
      CircuitSolver.solve(this, this.running ? scaledDt : 0);
    }
  }

  render(ctx, cameraScale = 1) {
    if (this.theme === 'optics') {
      OpticsEngine.traceAndRender(ctx, this);
    }

    for (const el of this.elements) {
      if (el instanceof ForceZone) el.render(ctx, this);
    }
    for (const el of this.elements) {
      if (el instanceof Wire) el.render(ctx, this);
    }
    for (const el of this.elements) {
      if (!(el instanceof Wire) && !(el instanceof ForceZone)) el.render(ctx, this);
    }

    for (const el of this.elements) {
      el.renderOverlay(ctx, this);
    }

    if (this.wirePreview) {
      const wp = this.wirePreview;
      ctx.save();
      ctx.strokeStyle = wp.snapPort ? '#22c55e' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(wp.x1, wp.y1);
      ctx.lineTo(wp.x2, wp.y2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (wp.snapPort) {
        ctx.beginPath();
        ctx.arc(wp.snapPort.x, wp.snapPort.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  get selected() {
    return this.elements.find((e) => e.selected) || null;
  }

  select(el) {
    for (const e of this.elements) e.selected = false;
    if (el) el.selected = true;
  }
}
