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
      { key: 'resistance', label: 'Сопротивление R', min: 1, max: 500, step: 1, unit: 'Ом' },
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

// ---------- Конденсатор ----------
class Capacitor extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'capacitor';
    this.label = 'Конденсатор';
    this.color = '#34d399';
    this.width = 76;
    this.height = 50;
    this.properties = { capacitance: 0.3, initV: 0 };
    this.ports = [
      { x: -38, y: 0, name: '+' },
      { x: 38, y: 0, name: '−' },
    ];
    this.vc = 0; // накопленное напряжение (В), + на порте «+»
  }

  restoreState() {
    super.restoreState();
    this.vc = this.properties.initV || 0;
  }

  getPropertySchema() {
    return [
      { key: 'capacitance', label: 'Ёмкость C (учебный масштаб)', min: 0.05, max: 2, step: 0.05, unit: 'Ф' },
      { key: 'initV', label: 'Начальное напряжение', min: 0, max: 36, step: 1, unit: 'В' },
    ];
  }

  getTelemetry() {
    const C = this.properties.capacitance;
    return [
      { name: 'Напряжение Uc', value: `${this.vc.toFixed(2)} В` },
      { name: 'Заряд q = C·U', value: `${(C * this.vc).toFixed(2)} Кл` },
      { name: 'Энергия CU²/2', value: `${(0.5 * C * this.vc * this.vc).toFixed(2)} Дж` },
      { name: 'Ток зарядки I', value: `${Math.abs(this.current).toFixed(3)} А` },
    ];
  }

  render(ctx, world) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(-7, 0);
    ctx.moveTo(7, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();

    const fill = Math.min(1, Math.abs(this.vc) / 24);
    ctx.fillStyle = `rgba(52, 211, 153, ${0.1 + fill * 0.55})`;
    ctx.strokeStyle = this.selected ? '#ffffff' : '#34d399';
    ctx.lineWidth = 3;
    roundRect(ctx, -9, -20, 18, 40, 3);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-7, -20);
    ctx.lineTo(-7, 20);
    ctx.moveTo(7, -20);
    ctx.lineTo(7, 20);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 10px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', -17, -12);
    ctx.fillText('−', 17, -12);
    if (world && world.showVectors) {
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '600 10px Inter, system-ui';
      ctx.fillText(`${this.vc.toFixed(1)} В • ${this.properties.capacitance} Ф`, 0, -30);
    }
    ctx.restore();
  }
}

// ---------- Диод ----------
class Diode extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'diode';
    this.label = 'Диод';
    this.color = '#fb923c';
    this.width = 76;
    this.height = 44;
    this.properties = { forwardV: 0.7, maxCurrent: 5, blown: false };
    this.ports = [
      { x: -38, y: 0, name: 'A' },
      { x: 38, y: 0, name: 'K' },
    ];
    this.conducting = false;
  }

  restoreState() {
    super.restoreState();
    this.properties.blown = false;
    this.conducting = false;
  }

  getPropertySchema() {
    return [
      { key: 'forwardV', label: 'Порог открытия Uпр', min: 0.2, max: 3.5, step: 0.1, unit: 'В' },
      { key: 'maxCurrent', label: 'Макс. ток Imax', min: 0.01, max: 10, step: 0.01, unit: 'А' },
      { key: 'blown', label: 'Пробит (сброс)', type: 'boolean' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Состояние', value: this.properties.blown ? '💥 Пробит' : this.conducting ? '🟢 Открыт' : '⚪ Закрыт' },
      { name: 'Ток I', value: `${Math.abs(this.current).toFixed(3)} А` },
      { name: 'Падение U', value: `${Math.abs(this.voltageDrop).toFixed(2)} В` },
      { name: 'Мощность P', value: `${this.power.toFixed(3)} Вт` },
    ];
  }

  glow() {
    return 0;
  }

  render(ctx, world) {
    const glow = this.properties.blown ? 0 : this.glow();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();

    if (glow > 0.02) {
      const gr = ctx.createRadialGradient(0, 0, 3, 0, 0, 46);
      gr.addColorStop(0, `rgba(248, 113, 113, ${Math.min(0.9, glow)})`);
      gr.addColorStop(1, 'rgba(248, 113, 113, 0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.fill();
    }

    const lit = this.conducting && !this.properties.blown;
    ctx.fillStyle = this.properties.blown ? '#374151' : lit ? '#fb923c' : '#1e293b';
    ctx.strokeStyle = this.selected ? '#ffffff' : this.properties.blown ? '#ef4444' : '#fb923c';
    ctx.lineWidth = this.selected ? 2.4 : 2;
    ctx.beginPath();
    ctx.moveTo(-12, -15);
    ctx.lineTo(12, 0);
    ctx.lineTo(-12, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(12, -15);
    ctx.lineTo(12, 15);
    ctx.stroke();

    this.renderExtras(ctx);

    if (this.properties.blown) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = '700 10px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('💥 Пробит', 0, -26);
    } else if (world && world.showVectors && Math.abs(this.current) > 0.0005) {
      ctx.fillStyle = '#fdba74';
      ctx.font = '600 10px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${(Math.abs(this.current) * 1000).toFixed(1)} мА`, 0, -26);
    }
    ctx.restore();
  }

  renderExtras() {}
}

// ---------- Светодиод ----------
class LED extends Diode {
  constructor(x, y) {
    super(x, y);
    this.type = 'led';
    this.label = 'Светодиод';
    this.color = '#f87171';
    this.properties = { forwardV: 2.0, maxCurrent: 0.035, blown: false };
  }

  getPropertySchema() {
    return [
      { key: 'forwardV', label: 'Порог свечения Uпр', min: 1.5, max: 3.5, step: 0.1, unit: 'В' },
      { key: 'maxCurrent', label: 'Макс. ток Imax', min: 0.01, max: 0.1, step: 0.005, unit: 'А' },
      { key: 'blown', label: 'Сгорел (сброс)', type: 'boolean' },
    ];
  }

  glow() {
    return Math.min(1.2, Math.abs(this.current) / (this.properties.maxCurrent * 0.8));
  }

  getTelemetry() {
    const t = super.getTelemetry();
    t[0] = {
      name: 'Состояние',
      value: this.properties.blown ? '💥 Сгорел' : this.conducting ? `💡 ${(this.glow() * 100).toFixed(0)}% ярк.` : '⚪ Не светит',
    };
    return t;
  }

  renderExtras(ctx) {
    // стрелки излучения
    ctx.strokeStyle = this.properties.blown ? '#475569' : '#fca5a5';
    ctx.lineWidth = 1.6;
    for (const dy of [-6, 4]) {
      ctx.beginPath();
      ctx.moveTo(4, -16 + dy);
      ctx.lineTo(14, -26 + dy);
      ctx.moveTo(14, -26 + dy);
      ctx.lineTo(9, -26 + dy);
      ctx.moveTo(14, -26 + dy);
      ctx.lineTo(14, -21 + dy);
      ctx.stroke();
    }
  }
}

// ---------- Потенциометр (реостат / делитель) ----------
class Potentiometer extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'potentiometer';
    this.label = 'Потенциометр';
    this.color = '#facc15';
    this.width = 90;
    this.height = 64;
    this.properties = { resistance: 50, position: 0.5 };
    this.ports = [
      { x: -42, y: 8, name: 'a' },
      { x: 42, y: 8, name: 'b' },
      { x: 0, y: -26, name: 'w' },
    ];
    this.vAW = 0;
    this.vWB = 0;
  }

  getPropertySchema() {
    return [
      { key: 'resistance', label: 'Полное сопротивление R', min: 10, max: 200, step: 5, unit: 'Ом' },
      { key: 'position', label: 'Положение движка (0 = у клеммы a)', min: 0, max: 1, step: 0.05, unit: '' },
    ];
  }

  getTelemetry() {
    const R = this.properties.resistance;
    const p = this.properties.position;
    return [
      { name: 'R(a–движок)', value: `${(R * p).toFixed(1)} Ом` },
      { name: 'R(движок–b)', value: `${(R * (1 - p)).toFixed(1)} Ом` },
      { name: 'U(a–движок)', value: `${this.vAW.toFixed(2)} В` },
      { name: 'U(движок–b)', value: `${this.vWB.toFixed(2)} В` },
    ];
  }

  render(ctx, world) {
    const p = this.properties.position;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-42, 8);
    ctx.lineTo(-30, 8);
    ctx.moveTo(30, 8);
    ctx.lineTo(42, 8);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#facc15';
    ctx.lineWidth = this.selected ? 2.2 : 1.8;
    roundRect(ctx, -30, -2, 60, 20, 4);
    ctx.fill();
    ctx.stroke();

    const sx = -30 + 60 * p;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -16);
    ctx.lineTo(sx, -16);
    ctx.lineTo(sx, -3);
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(sx, -2);
    ctx.lineTo(sx - 5, -9);
    ctx.lineTo(sx + 5, -9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 10px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.properties.resistance} Ω`, 0, 9);
    ctx.restore();
  }
}

// ---------- Плавкий предохранитель ----------
class Fuse extends ElectricElement {
  constructor(x, y) {
    super(x, y);
    this.type = 'fuse';
    this.label = 'Предохранитель';
    this.color = '#f59e0b';
    this.width = 80;
    this.height = 36;
    this.properties = { ratedCurrent: 2, blown: false };
    this.ports = [
      { x: -40, y: 0, name: 'a' },
      { x: 40, y: 0, name: 'b' },
    ];
    this.heat = 0; // 0..1, при 1 проволока перегорает
  }

  restoreState() {
    super.restoreState();
    this.properties.blown = false;
    this.heat = 0;
  }

  getPropertySchema() {
    return [
      { key: 'ratedCurrent', label: 'Номинальный ток Iном', min: 0.2, max: 10, step: 0.1, unit: 'А' },
      { key: 'blown', label: 'Перегорел (сброс)', type: 'boolean' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Состояние', value: this.properties.blown ? '💥 Перегорел' : '🟢 Цел' },
      { name: 'Ток I', value: `${Math.abs(this.current).toFixed(2)} А` },
      { name: 'Нагрев проволоки', value: `${Math.round(this.heat * 100)} %` },
      { name: 'Номинал', value: `${this.properties.ratedCurrent} А` },
    ];
  }

  render(ctx, world) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-26, 0);
    ctx.moveTo(26, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();

    ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.strokeStyle = this.selected ? '#ffffff' : '#fbbf24';
    ctx.lineWidth = this.selected ? 2.2 : 1.8;
    roundRect(ctx, -26, -11, 52, 22, 11);
    ctx.fill();
    ctx.stroke();

    const h = this.heat;
    ctx.strokeStyle = this.properties.blown ? '#475569' : `rgb(${Math.round(148 + 107 * h)}, ${Math.round(163 - 70 * h)}, ${Math.round(184 - 150 * h)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.properties.blown) {
      ctx.moveTo(-22, 0);
      ctx.lineTo(-5, 0);
      ctx.moveTo(5, 0);
      ctx.lineTo(22, 0);
    } else {
      ctx.moveTo(-22, 0);
      ctx.lineTo(22, 0);
    }
    ctx.stroke();

    ctx.font = '700 10px Inter, system-ui';
    ctx.textAlign = 'center';
    if (this.properties.blown) {
      ctx.fillStyle = '#fca5a5';
      ctx.fillText('💥 Перегорел', 0, -20);
    } else if (world && world.showVectors) {
      ctx.fillStyle = '#fde68a';
      ctx.fillText(`${Math.abs(this.current).toFixed(2)} / ${this.properties.ratedCurrent} А`, 0, -20);
    }
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

    const DIODE_R = 0.05;
    const diodes = components.filter((c) => c instanceof Diode);
    const maxIter = diodes.length > 0 ? 14 : 1;
    // dt = 0 (пауза): конденсатор «замораживается» как источник с текущим напряжением
    const dtEff = dt > 0 ? dt : 1e-4;
    const capR = (C) => Math.max(1e-4, dtEff / Math.max(1e-3, C));

    let V = null;
    for (let iter = 0; iter < maxIter; iter++) {
      const G = Array.from({ length: N }, () => new Float64Array(N));
      const rhs = new Float64Array(N);
      for (let i = 0; i < N; i++) G[i][i] = 1e-9;

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
        } else if (comp instanceof Capacitor) {
          // Обратный метод Эйлера: ёмкость = проводимость C/dt + источник тока
          const g = stampResistor(n0, n1, capR(comp.properties.capacitance));
          rhs[n0] += g * comp.vc;
          rhs[n1] -= g * comp.vc;
        } else if (comp instanceof Diode) {
          if (comp.conducting && !comp.properties.blown) {
            const g = stampResistor(n0, n1, DIODE_R);
            const vf = comp.properties.forwardV;
            rhs[n0] += g * vf;
            rhs[n1] -= g * vf;
          } else {
            stampResistor(n0, n1, 1e9);
          }
        } else if (comp instanceof Fuse) {
          stampResistor(n0, n1, comp.properties.blown ? 1e9 : 0.05);
        } else if (comp instanceof Potentiometer) {
          const n2 = portMap.get(`${comp.id}:2`);
          const R = comp.properties.resistance || 50;
          const p = Math.max(0, Math.min(1, comp.properties.position));
          stampResistor(n0, n2, Math.max(0.01, R * p));
          stampResistor(n2, n1, Math.max(0.01, R * (1 - p)));
        }
      }

      // Заземление опорного узла первой батареи
      if (batteries.length > 0) {
        const gnd = batteries[0].n0;
        G[gnd][gnd] += 1e9;
      }

      V = this.solveLinearSystem(G, rhs, N);

      // Диоды: проверяем, не пора ли сменить состояние (открыт / закрыт)
      let changed = false;
      for (const d of diodes) {
        const a = portMap.get(`${d.id}:0`);
        const k = portMap.get(`${d.id}:1`);
        const vd = (V[a] || 0) - (V[k] || 0);
        const on = !d.properties.blown && vd > d.properties.forwardV;
        if (on !== d.conducting) {
          d.conducting = on;
          changed = true;
        }
      }
      if (!changed) break;
    }

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
      } else if (comp instanceof Capacitor) {
        const vcap = v0 - v1;
        comp.current = (vcap - comp.vc) / capR(comp.properties.capacitance);
        comp.power = 0;
        if (dt > 0) comp.vc = vcap;
      } else if (comp instanceof Diode) {
        if (comp.conducting && !comp.properties.blown) {
          comp.current = Math.max(0, (v0 - v1 - comp.properties.forwardV) / DIODE_R);
          comp.power = Math.abs((v0 - v1) * comp.current);
          if (comp.current > comp.properties.maxCurrent) {
            comp.properties.blown = true;
            comp.conducting = false;
          }
        } else {
          comp.current = 0;
          comp.power = 0;
        }
      } else if (comp instanceof Fuse) {
        if (comp.properties.blown) {
          comp.current = 0;
          comp.power = 0;
        } else {
          comp.current = dV / 0.05;
          comp.power = Math.abs(dV * comp.current);
          if (dt > 0) {
            const ratio = Math.abs(comp.current) / Math.max(0.05, comp.properties.ratedCurrent);
            // Обратнозависимая характеристика: чем больше перегрузка, тем быстрее нагрев
            comp.heat += (ratio * ratio - 1) * dt * 0.6;
            comp.heat = Math.max(0, Math.min(1, comp.heat));
            if (comp.heat >= 1) comp.properties.blown = true;
          }
        }
      } else if (comp instanceof Potentiometer) {
        const n2 = portMap.get(`${comp.id}:2`);
        const vw = V[n2] || 0;
        const R = comp.properties.resistance || 50;
        const p = Math.max(0, Math.min(1, comp.properties.position));
        const Ra = Math.max(0.01, R * p);
        const Rb = Math.max(0.01, R * (1 - p));
        const ia = (vw - v0) / Ra;
        const ib = (v1 - vw) / Rb;
        comp.current = ia;
        comp.power = ia * ia * Ra + ib * ib * Rb;
        comp.vAW = Math.abs(vw - v0);
        comp.vWB = Math.abs(v1 - vw);
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
