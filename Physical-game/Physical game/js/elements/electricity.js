// ============================================================
//  ЭЛЕКТРИЧЕСТВО — источники ЭДС, резисторы, лампы, ключи,
//  амперметры, вольтметры, интерактивные провода и матричный
//  узловой солвер цепей постоянного тока (законы Ома и Кирхгофа)
// ============================================================

class ElectricElement extends Element {
  constructor(x, y) {
    super(x, y);
    this.category = 'electricity';
    this.voltageDrop = 0; // В
    this.current = 0;     // А
    this.power = 0;       // Вт
    this.chargePhase = 0;
  }
}

class Battery extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'battery';
    this.label = 'Батарея ЭДС';
    this.color = '#ef4444';
    this.width = 86;
    this.height = 44;
    this.properties = {
      emf: 12,
      internalR: 0.2,
    };
    this.ports = [
      { x: -43, y: 0, name: '−' },
      { x: 43, y: 0, name: '+' },
    ];
    this.shortCircuit = false;
  }

  getPropertySchema() {
    return [
      { key: 'emf', label: 'ЭДС источника E', min: 1.5, max: 36, step: 0.5, unit: 'В' },
      { key: 'internalR', label: 'Внутр. сопр. r', min: 0.05, max: 5, step: 0.05, unit: 'Ом' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'ЭДС E', value: `${this.properties.emf.toFixed(1)} В` },
      { name: 'Напряж. клемм', value: `${Math.abs(this.voltageDrop).toFixed(2)} В` },
      { name: 'Ток цепи I', value: `${Math.abs(this.current).toFixed(2)} А` },
      { name: 'Режим', value: this.shortCircuit ? '⚠️ КЗ!' : 'Норма' },
    ];
  }

  render(ctx, world) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = this.selected ? '#ffffff' : this.shortCircuit ? '#ef4444' : '#64748b';
    ctx.lineWidth = this.selected ? 2.2 : 1.5;
    roundRect(ctx, -hw, -hh, this.width, this.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.shortCircuit ? '#ef4444' : '#dc2626';
    roundRect(ctx, 8, -hh + 2, hw - 10, this.height - 4, 6);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 14px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('−', -hw + 14, 0);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('+', hw - 13, 0);

    ctx.font = '700 12px Inter, system-ui';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`${this.properties.emf}В`, -6, 0);

    if (this.shortCircuit) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = '700 10px Inter, system-ui';
      ctx.fillText('⚠️ КЗ!', 0, -hh - 9);
    }

    ctx.restore();
  }
}

class Resistor extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'resistor';
    this.label = 'Резистор';
    this.color = '#06b6d4';
    this.width = 84;
    this.height = 30;
    this.properties = {
      resistance: 10,
    };
    this.ports = [
      { x: -42, y: 0, name: 'a' },
      { x: 42, y: 0, name: 'b' },
    ];
  }

  getPropertySchema() {
    return [
      { key: 'resistance', label: 'Сопротивление R', min: 1, max: 200, step: 1, unit: 'Ом' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Сопротивление R', value: `${this.properties.resistance} Ом` },
      { name: 'Ток I', value: `${Math.abs(this.current).toFixed(2)} А` },
      { name: 'Падение U', value: `${Math.abs(this.voltageDrop).toFixed(2)} В` },
      { name: 'Мощность P', value: `${this.power.toFixed(2)} Вт` },
    ];
  }

  render(ctx, world) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const hw = this.width / 2;

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-hw, 0);
    ctx.lineTo(hw, 0);
    ctx.stroke();

    const heat = Math.min(1, this.power / 40);
    ctx.fillStyle = heat > 0.2 ? `rgb(${Math.round(30 + 190 * heat)}, ${Math.round(58 - 20 * heat)}, 75)` : '#0f172a';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#22d3ee';
    ctx.lineWidth = this.selected ? 2.2 : 1.8;
    roundRect(ctx, -28, -12, 56, 24, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 11px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.properties.resistance} Ω`, 0, 0);

    if (world && world.showVectors && Math.abs(this.current) > 0.01) {
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '600 10px Inter, system-ui';
      ctx.fillText(`${Math.abs(this.current).toFixed(2)}А • ${Math.abs(this.voltageDrop).toFixed(1)}В`, 0, -20);
    }

    ctx.restore();
  }
}

class Lamp extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'lamp';
    this.label = 'Лампа';
    this.color = '#fde047';
    this.width = 76;
    this.height = 52;
    this.properties = {
      resistance: 12,
      maxPower: 25,
      blown: false,
    };
    this.ports = [
      { x: -38, y: 0, name: 'a' },
      { x: 38, y: 0, name: 'b' },
    ];
  }

  restoreState() {
    super.restoreState();
    this.properties.blown = false;
  }

  getPropertySchema() {
    return [
      { key: 'resistance', label: 'Сопротивление R', min: 2, max: 100, step: 1, unit: 'Ом' },
      { key: 'maxPower', label: 'Ном. мощность Pном', min: 5, max: 100, step: 5, unit: 'Вт' },
      { key: 'blown', label: 'Перегорела (сброс)', type: 'boolean' },
    ];
  }

  getTelemetry() {
    const brightness = this.properties.blown ? 0 : Math.min(200, (this.power / (this.properties.maxPower || 25)) * 100);
    return [
      { name: 'Мощность P', value: `${this.power.toFixed(2)} Вт` },
      { name: 'Ток I', value: `${Math.abs(this.current).toFixed(2)} А` },
      { name: 'Напряжение U', value: `${Math.abs(this.voltageDrop).toFixed(2)} В` },
      { name: 'Состояние', value: this.properties.blown ? '💥 Сгорела' : `${brightness.toFixed(0)}% ярк.` },
    ];
  }

  render(ctx, world) {
    const r = 21;
    const normP = this.properties.blown ? 0 : Math.min(1.6, this.power / (this.properties.maxPower || 25));

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(-r, 0);
    ctx.moveTo(r, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();

    if (normP > 0.02) {
      const glowR = r * (1.8 + normP * 1.9);
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, glowR);
      grad.addColorStop(0, `rgba(254, 240, 138, ${Math.min(0.85, normP * 0.7)})`);
      grad.addColorStop(0.5, `rgba(250, 204, 21, ${Math.min(0.4, normP * 0.35)})`);
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = this.properties.blown
      ? '#1f2937'
      : normP > 0.03
      ? `rgb(253, ${Math.round(224 + 25 * Math.min(1, normP))}, ${Math.round(71 + 110 * Math.min(1, normP))})`
      : '#1e293b';
    ctx.strokeStyle = this.selected ? '#ffffff' : normP > 0.03 ? '#fde047' : '#64748b';
    ctx.lineWidth = this.selected ? 2.2 : 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = this.properties.blown ? '#ef4444' : normP > 0.2 ? '#713f12' : '#94a3b8';
    ctx.lineWidth = 1.8;
    const d = r * 0.65;
    ctx.beginPath();
    ctx.moveTo(-d, -d);
    ctx.lineTo(d, d);
    ctx.moveTo(-d, d);
    ctx.lineTo(d, -d);
    ctx.stroke();

    if (this.properties.blown) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = '700 10px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('💥 Перегорела', 0, -r - 9);
    } else if (world && world.showVectors && this.power > 0.05) {
      ctx.fillStyle = '#fde047';
      ctx.font = '600 10px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.power.toFixed(1)} Вт`, 0, -r - 9);
    }

    ctx.restore();
  }
}

class Switch extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'switch';
    this.label = 'Ключ';
    this.color = '#94a3b8';
    this.width = 78;
    this.height = 36;
    this.properties = {
      closed: false,
    };
    this.ports = [
      { x: -39, y: 0, name: 'a' },
      { x: 39, y: 0, name: 'b' },
    ];
  }

  getPropertySchema() {
    return [
      { key: 'closed', label: 'Замкнут (Вкл/Выкл)', type: 'boolean' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Состояние', value: this.properties.closed ? '🟢 Замкнут' : '⚪ Разомкнут' },
      { name: 'Ток через ключ', value: `${Math.abs(this.current).toFixed(2)} А` },
    ];
  }

  render(ctx, world) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const closed = !!this.properties.closed;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.78)';
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = this.selected ? 2 : 1;
    roundRect(ctx, -32, -16, 64, 32, 7);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = closed ? '#22c55e' : '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-39, 0);
    ctx.lineTo(-16, 0);
    ctx.moveTo(16, 0);
    ctx.lineTo(39, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-16, 0);
    if (closed) {
      ctx.lineTo(16, 0);
    } else {
      ctx.lineTo(13, -13);
    }
    ctx.stroke();

    ctx.fillStyle = closed ? '#22c55e' : '#e2e8f0';
    ctx.beginPath();
    ctx.arc(-16, 0, 3.5, 0, Math.PI * 2);
    ctx.arc(16, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Ammeter extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'ammeter';
    this.label = 'Амперметр';
    this.color = '#38bdf8';
    this.width = 76;
    this.height = 48;
    this.properties = {};
    this.ports = [
      { x: -38, y: 0, name: '+' },
      { x: 38, y: 0, name: '−' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Сила тока I', value: `${Math.abs(this.current).toFixed(3)} А` },
      { name: 'Сопротивление', value: '0.01 Ом' },
    ];
  }

  render(ctx, world) {
    const r = 21;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(-r, 0);
    ctx.moveTo(r, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = this.selected ? 2.2 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 13px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', 0, -5);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 9.5px Inter, system-ui';
    ctx.fillText(`${Math.abs(this.current).toFixed(2)}А`, 0, 9);

    ctx.restore();
  }
}

class Voltmeter extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'voltmeter';
    this.label = 'Вольтметр';
    this.color = '#a78bfa';
    this.width = 76;
    this.height = 48;
    this.properties = {};
    this.ports = [
      { x: -38, y: 0, name: '+' },
      { x: 38, y: 0, name: '−' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Напряжение U', value: `${Math.abs(this.voltageDrop).toFixed(2)} В` },
      { name: 'Сопротивление', value: '10 МОм' },
    ];
  }

  render(ctx, world) {
    const r = 21;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(-r, 0);
    ctx.moveTo(r, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#a78bfa';
    ctx.lineWidth = this.selected ? 2.2 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c4b5fd';
    ctx.font = '800 13px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', 0, -5);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 9.5px Inter, system-ui';
    ctx.fillText(`${Math.abs(this.voltageDrop).toFixed(1)}В`, 0, 9);

    ctx.restore();
  }
}

class Wire extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'wire';
    this.label = 'Провод';
    this.color = '#64748b';
    this.rotatable = false;

    this.x1 = x - 50;
    this.y1 = y;
    this.x2 = x + 50;
    this.y2 = y;
    this.portA = null; // { elId, portIndex }
    this.portB = null;
  }

  syncEndpoints(world) {
    if (this.portA) {
      const elA = world.elements.find((e) => e.id === this.portA.elId);
      if (elA && elA.ports[this.portA.portIndex]) {
        const p = elA.getWorldPorts()[this.portA.portIndex];
        this.x1 = p.x;
        this.y1 = p.y;
      } else {
        this.portA = null;
      }
    }
    if (this.portB) {
      const elB = world.elements.find((e) => e.id === this.portB.elId);
      if (elB && elB.ports[this.portB.portIndex]) {
        const p = elB.getWorldPorts()[this.portB.portIndex];
        this.x2 = p.x;
        this.y2 = p.y;
      } else {
        this.portB = null;
      }
    }
    this.x = (this.x1 + this.x2) / 2;
    this.y = (this.y1 + this.y2) / 2;
  }

  hitEndpoint(wx, wy, radius = 12) {
    if (Math.hypot(wx - this.x1, wy - this.y1) <= radius) return 'A';
    if (Math.hypot(wx - this.x2, wy - this.y2) <= radius) return 'B';
    return null;
  }

  containsPoint(wx, wy) {
    if (this.hitEndpoint(wx, wy, 12)) return true;
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return Math.hypot(wx - this.x1, wy - this.y1) <= 10;
    const t = Math.max(0, Math.min(1, ((wx - this.x1) * dx + (wy - this.y1) * dy) / len2));
    const px = this.x1 + t * dx;
    const py = this.y1 + t * dy;
    return Math.hypot(wx - px, wy - py) <= 8;
  }

  getTelemetry() {
    return [
      { name: 'Ток в проводе I', value: `${Math.abs(this.current).toFixed(2)} А` },
      { name: 'Клемма А', value: this.portA ? 'Подключена' : 'Свободна' },
      { name: 'Клемма Б', value: this.portB ? 'Подключена' : 'Свободна' },
    ];
  }

  render(ctx, world) {
    if (world) this.syncEndpoints(world);

    ctx.save();
    const active = Math.abs(this.current) > 0.01;
    ctx.strokeStyle = this.selected ? '#ffffff' : active ? '#38bdf8' : '#64748b';
    ctx.lineWidth = this.selected ? 4.2 : 3.2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();

    if (active) {
      const len = Math.hypot(this.x2 - this.x1, this.y2 - this.y1);
      const count = Math.max(2, Math.floor(len / 28));
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 6;
      for (let i = 0; i < count; i++) {
        let t = (i / count + this.chargePhase) % 1;
        if (t < 0) t += 1;
        const px = this.x1 + (this.x2 - this.x1) * t;
        const py = this.y1 + (this.y2 - this.y1) * t;
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    for (const pt of [
      { x: this.x1, y: this.y1, linked: !!this.portA },
      { x: this.x2, y: this.y2, linked: !!this.portB },
    ]) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, this.selected ? 6.5 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = pt.linked ? '#22c55e' : '#f59e0b';
      ctx.fill();
      if (this.selected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  renderOverlay() {}
}

// ============================================================
//  Узловой солвер электрических цепей (Modified Nodal Analysis)
// ============================================================

const CircuitSolver = {
  solve(world, dt = 0.016) {
    const components = world.elements.filter(
      (e) => e instanceof ElectricElement && !(e instanceof Wire)
    );
    const wires = world.elements.filter((e) => e instanceof Wire);

    for (const w of wires) w.syncEndpoints(world);

    if (components.length === 0) return;

    const portMap = new Map();
    const portList = [];
    for (const comp of components) {
      const wPorts = comp.getWorldPorts();
      comp.ports.forEach((_, idx) => {
        const key = `${comp.id}:${idx}`;
        const nodeIdx = portList.length;
        portMap.set(key, nodeIdx);
        portList.push({ comp, idx, x: wPorts[idx].x, y: wPorts[idx].y });
      });
    }

    const N = portList.length;
    if (N === 0) return;

    const G = Array.from({ length: N }, () => new Float64Array(N));
    const rhs = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      G[i][i] = 1e-9;
    }

    const stampResistor = (nA, nB, R) => {
      const g = 1 / Math.max(1e-4, R);
      G[nA][nA] += g;
      G[nB][nB] += g;
      G[nA][nB] -= g;
      G[nB][nA] -= g;
      return g;
    };

    for (const w of wires) {
      if (w.portA && w.portB) {
        const u = portMap.get(`${w.portA.elId}:${w.portA.portIndex}`);
        const v = portMap.get(`${w.portB.elId}:${w.portB.portIndex}`);
        if (u !== undefined && v !== undefined && u !== v) {
          stampResistor(u, v, 0.002);
        }
      }
    }

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (portList[i].comp === portList[j].comp) continue;
        if (Math.hypot(portList[i].x - portList[j].x, portList[i].y - portList[j].y) < 12) {
          stampResistor(i, j, 0.002);
        }
      }
    }

    const batteries = [];
    for (const comp of components) {
      const n0 = portMap.get(`${comp.id}:0`);
      const n1 = portMap.get(`${comp.id}:1`);
      if (n0 === undefined || n1 === undefined) continue;

      if (comp instanceof Battery) {
        const rInt = Math.max(0.05, comp.properties.internalR || 0.2);
        const emf = comp.properties.emf || 12;
        const g = stampResistor(n0, n1, rInt);
        rhs[n1] += emf * g;
        rhs[n0] -= emf * g;
        batteries.push({ comp, n0, n1, rInt, emf });
      } else if (comp instanceof Resistor) {
        stampResistor(n0, n1, comp.properties.resistance || 10);
      } else if (comp instanceof Lamp) {
        const R = comp.properties.blown ? 1e9 : comp.properties.resistance || 12;
        stampResistor(n0, n1, R);
      } else if (comp instanceof Switch) {
        const R = comp.properties.closed ? 0.005 : 1e9;
        stampResistor(n0, n1, R);
      } else if (comp instanceof Ammeter) {
        stampResistor(n0, n1, 0.01);
      } else if (comp instanceof Voltmeter) {
        stampResistor(n0, n1, 1e7);
      }
    }

    // Симметричное заземление опорного узла первой батареи в каждой подцепи
    if (batteries.length > 0) {
      const gnd = batteries[0].n0;
      G[gnd][gnd] += 1e9;
    }

    const V = this.solveLinearSystem(G, rhs, N);

    for (const comp of components) {
      const n0 = portMap.get(`${comp.id}:0`);
      const n1 = portMap.get(`${comp.id}:1`);
      const v0 = V[n0] || 0;
      const v1 = V[n1] || 0;
      const dV = v1 - v0;
      comp.voltageDrop = dV;

      if (comp instanceof Battery) {
        const rInt = Math.max(0.05, comp.properties.internalR || 0.2);
        const emf = comp.properties.emf || 12;
        comp.current = (emf - dV) / rInt;
        comp.power = Math.abs(dV * comp.current);
        comp.shortCircuit = Math.abs(comp.current) > emf / (rInt * 1.35);
      } else if (comp instanceof Resistor) {
        const R = comp.properties.resistance || 10;
        comp.current = dV / R;
        comp.power = Math.abs(dV * comp.current);
      } else if (comp instanceof Lamp) {
        if (comp.properties.blown) {
          comp.current = 0;
          comp.power = 0;
        } else {
          const R = comp.properties.resistance || 12;
          comp.current = dV / R;
          comp.power = Math.abs(dV * comp.current);
          if (comp.power > (comp.properties.maxPower || 25) * 2.2) {
            comp.properties.blown = true;
          }
        }
      } else if (comp instanceof Switch) {
        const R = comp.properties.closed ? 0.005 : 1e9;
        comp.current = comp.properties.closed ? dV / R : 0;
        comp.power = 0;
      } else if (comp instanceof Ammeter) {
        comp.current = dV / 0.01;
        comp.power = 0;
      } else if (comp instanceof Voltmeter) {
        comp.current = dV / 1e7;
        comp.power = 0;
      }
    }

    for (const w of wires) {
      if (w.portA && w.portB) {
        const u = portMap.get(`${w.portA.elId}:${w.portA.portIndex}`);
        const v = portMap.get(`${w.portB.elId}:${w.portB.portIndex}`);
        if (u !== undefined && v !== undefined) {
          const dV = (V[u] || 0) - (V[v] || 0);
          w.current = dV / 0.002;
          const speed = Math.max(-2.5, Math.min(2.5, w.current * 0.35));
          w.chargePhase = (w.chargePhase + speed * dt) % 1;
        } else {
          w.current = 0;
        }
      } else {
        w.current = 0;
      }
    }
  },

  solveLinearSystem(A, b, n) {
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(A[i][i]);
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxVal) {
          maxVal = Math.abs(A[k][i]);
          maxRow = k;
        }
      }
      if (maxVal < 1e-14) continue;

      if (maxRow !== i) {
        const tmpRow = A[i];
        A[i] = A[maxRow];
        A[maxRow] = tmpRow;
        const tmpB = b[i];
        b[i] = b[maxRow];
        b[maxRow] = tmpB;
      }

      for (let k = i + 1; k < n; k++) {
        const factor = A[k][i] / A[i][i];
        b[k] -= factor * b[i];
        for (let j = i; j < n; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }

    for (let i = n - 1; i >= 0; i--) {
      if (Math.abs(A[i][i]) < 1e-14) continue;
      let sum = b[i];
      for (let j = i + 1; j < n; j++) {
        sum -= A[i][j] * x[j];
      }
      x[i] = sum / A[i][i];
    }
    return x;
  },
};
