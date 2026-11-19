// ============================================================
//  МЕХАНИКА — твёрдые тела, упругие шары, наклонные плоскости,
//  пружинные осцилляторы, маятники и солвер столкновений
// ============================================================

const PX_PER_METER = 70; // 70 пкс = 1 метр

class Block extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'block';
    this.category = 'mechanics';
    this.label = 'Брусок';
    this.color = '#3b82f6';
    this.width = 72;
    this.height = 46;

    this.properties = {
      mass: 2.0,
      friction: 0.2,
      restitution: 0.3,
      vx: 0,
      vy: 0,
      pinned: false,
    };

    this.vx = 0;
    this.vy = 0;
    this.trail = [];
  }

  restoreState() {
    super.restoreState();
    this.vx = this.properties.vx || 0;
    this.vy = this.properties.vy || 0;
    this.trail = [];
  }

  getPropertySchema() {
    return [
      { key: 'mass', label: 'Масса m', min: 0.5, max: 20, step: 0.5, unit: 'кг' },
      { key: 'friction', label: 'Коэфф. трения μ', min: 0, max: 1, step: 0.05, unit: '' },
      { key: 'restitution', label: 'Упругость e', min: 0, max: 1, step: 0.05, unit: '' },
      { key: 'vx', label: 'Нач. скорость Vx', min: -500, max: 500, step: 10, unit: 'пкс/с' },
      { key: 'vy', label: 'Нач. скорость Vy', min: -500, max: 500, step: 10, unit: 'пкс/с' },
      { key: 'pinned', label: 'Зафиксировать', type: 'boolean' },
    ];
  }

  getEnergy(groundY = 260, g = 9.81) {
    const m = this.properties.mass;
    const vMeters = Math.hypot(this.vx, this.vy) / PX_PER_METER;
    const ek = 0.5 * m * vMeters * vMeters;
    const h = Math.max(0, (groundY - this.y) / PX_PER_METER);
    const ep = m * g * h;
    return { ek, ep, total: ek + ep };
  }

  getTelemetry(world) {
    const g = world ? world.gravity : 9.81;
    const speed = Math.hypot(this.vx, this.vy) / PX_PER_METER;
    const en = this.getEnergy(260, g);
    return [
      { name: 'Скорость |v|', value: `${speed.toFixed(2)} м/с` },
      { name: 'Масса m', value: `${this.properties.mass.toFixed(1)} кг` },
      { name: 'Кин. энергия Ek', value: `${en.ek.toFixed(1)} Дж` },
      { name: 'Пот. энергия Ep', value: `${en.ep.toFixed(1)} Дж` },
    ];
  }

  render(ctx, world) {
    if (this.trail.length > 1) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const pt = this.trail[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const hw = this.width / 2;
    const hh = this.height / 2;

    const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = this.selected ? 2.2 : 1.2;

    roundRect(ctx, -hw, -hh, this.width, this.height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.properties.mass} кг`, 0, 0);

    if (this.properties.pinned) {
      ctx.beginPath();
      ctx.arc(0, -hh + 8, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
    }

    ctx.restore();

    if (world && world.showVectors && !this.properties.pinned) {
      const gScale = (world.gravity ?? 9.81) / 9.81;
      if (gScale > 0.01) {
        drawArrow(
          ctx,
          this.x,
          this.y,
          this.x,
          this.y + Math.min(80, this.properties.mass * 20 * gScale),
          '#f59e0b',
          'mg'
        );
      }
      if (Math.hypot(this.vx, this.vy) > 8) {
        drawArrow(ctx, this.x, this.y, this.x + this.vx * 0.22, this.y + this.vy * 0.22, '#22c55e', 'v');
      }
    }
  }
}

class Ball extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'ball';
    this.category = 'mechanics';
    this.label = 'Упругий шар';
    this.color = '#ec4899';
    this.radius = 23;
    this.width = 46;
    this.height = 46;

    this.properties = {
      mass: 1.5,
      radius: 23,
      restitution: 0.82,
      friction: 0.12,
      vx: 0,
      vy: 0,
    };

    this.vx = 0;
    this.vy = 0;
    this.angVel = 0;
    this.trail = [];
  }

  restoreState() {
    super.restoreState();
    this.vx = this.properties.vx || 0;
    this.vy = this.properties.vy || 0;
    this.angVel = 0;
    this.trail = [];
  }

  containsPoint(wx, wy) {
    const r = this.properties.radius || 23;
    return Math.hypot(wx - this.x, wy - this.y) <= r + 4;
  }

  getPropertySchema() {
    return [
      { key: 'mass', label: 'Масса m', min: 0.5, max: 15, step: 0.5, unit: 'кг' },
      { key: 'radius', label: 'Радиус R', min: 14, max: 48, step: 2, unit: 'пкс' },
      { key: 'restitution', label: 'Упругость e', min: 0, max: 1, step: 0.05, unit: '' },
      { key: 'friction', label: 'Трение μ', min: 0, max: 1, step: 0.05, unit: '' },
      { key: 'vx', label: 'Нач. скорость Vx', min: -600, max: 600, step: 20, unit: 'пкс/с' },
      { key: 'vy', label: 'Нач. скорость Vy', min: -600, max: 600, step: 20, unit: 'пкс/с' },
    ];
  }

  getEnergy(groundY = 260, g = 9.81) {
    const m = this.properties.mass;
    const vMeters = Math.hypot(this.vx, this.vy) / PX_PER_METER;
    const ek = 0.5 * m * vMeters * vMeters;
    const h = Math.max(0, (groundY - this.y) / PX_PER_METER);
    const ep = m * g * h;
    return { ek, ep, total: ek + ep };
  }

  getTelemetry(world) {
    const g = world ? world.gravity : 9.81;
    const speed = Math.hypot(this.vx, this.vy) / PX_PER_METER;
    const en = this.getEnergy(260, g);
    return [
      { name: 'Скорость |v|', value: `${speed.toFixed(2)} м/с` },
      { name: 'Импульс p', value: `${(speed * this.properties.mass).toFixed(2)} кг·м/с` },
      { name: 'Кин. энергия Ek', value: `${en.ek.toFixed(1)} Дж` },
      { name: 'Пот. энергия Ep', value: `${en.ep.toFixed(1)} Дж` },
    ];
  }

  render(ctx, world) {
    const r = this.properties.radius || 23;
    this.width = r * 2;
    this.height = r * 2;

    if (this.trail.length > 1) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const pt = this.trail[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.34)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r);
    grad.addColorStop(0, '#f472b6');
    grad.addColorStop(1, '#be185d');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = this.selected ? 2.2 : 1.2;
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(255,255,255,0.28)';
    ctx.stroke();

    // Полоска вращения
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.82, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.68)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    if (world && world.showVectors) {
      const gScale = (world.gravity ?? 9.81) / 9.81;
      if (gScale > 0.01) {
        drawArrow(
          ctx,
          this.x,
          this.y,
          this.x,
          this.y + Math.min(75, this.properties.mass * 20 * gScale),
          '#f59e0b',
          'mg'
        );
      }
      if (Math.hypot(this.vx, this.vy) > 8) {
        drawArrow(ctx, this.x, this.y, this.x + this.vx * 0.22, this.y + this.vy * 0.22, '#22c55e', 'v');
      }
    }
  }
}

class Ramp extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'ramp';
    this.category = 'mechanics';
    this.label = 'Плоскость';
    this.color = '#475569';
    this.width = 360;
    this.height = 22;

    this.properties = {
      length: 360,
      friction: 0.18,
      restitution: 0.65,
    };
  }

  getPropertySchema() {
    return [
      { key: 'length', label: 'Длина L', min: 80, max: 800, step: 20, unit: 'пкс' },
      { key: 'friction', label: 'Трение μ', min: 0, max: 1, step: 0.05, unit: '' },
      { key: 'restitution', label: 'Упругость e', min: 0, max: 1, step: 0.05, unit: '' },
    ];
  }

  getTelemetry() {
    const deg = ((this.rotation * 180) / Math.PI) % 360;
    return [
      { name: 'Угол наклона α', value: `${deg.toFixed(1)}°` },
      { name: 'Коэфф. трения μ', value: `${this.properties.friction}` },
      { name: 'Длина L', value: `${(this.properties.length / PX_PER_METER).toFixed(2)} м` },
    ];
  }

  render(ctx, world) {
    this.width = this.properties.length || 360;
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = this.fill || '#334155';
    ctx.strokeStyle = this.selected ? '#ffffff' : this.edge || '#64748b';
    ctx.lineWidth = this.selected ? 2 : 1.4;
    roundRect(ctx, -hw, -hh, this.width, this.height, 6);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    for (let x = -hw + 12; x < hw - 8; x += 18) {
      ctx.moveTo(x, -hh + 3);
      ctx.lineTo(x - 8, hh - 3);
    }
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (world && world.showVectors && Math.abs(this.rotation) > 0.01) {
      const deg = Math.round((this.rotation * 180) / Math.PI);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 11px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`α = ${deg}°`, 0, -hh - 8);
    }

    ctx.restore();
  }
}

// ---------- Ледяная плоскость: Ramp с почти нулевым трением ----------
class IcePlane extends Ramp {
  constructor(x, y) {
    super(x, y);
    this.type = 'ice-plane';
    this.label = 'Ледяная плоскость';
    this.color = '#67e8f9';
    this.fill = '#164e63';
    this.edge = '#67e8f9';
    this.properties = { length: 320, friction: 0.02, restitution: 0.4 };
  }
}

// ---------- Батут: Ramp, который добавляет телу скорость при ударе ----------
class Trampoline extends Ramp {
  constructor(x, y) {
    super(x, y);
    this.type = 'trampoline';
    this.label = 'Батут';
    this.color = '#4ade80';
    this.fill = '#14532d';
    this.edge = '#4ade80';
    this.properties = { length: 180, friction: 0.3, restitution: 0.7, boost: 2 };
  }

  getPropertySchema() {
    return [
      { key: 'length', label: 'Длина L', min: 80, max: 500, step: 20, unit: 'пкс' },
      { key: 'boost', label: 'Добавка скорости', min: 0, max: 10, step: 0.5, unit: 'м/с' },
      { key: 'restitution', label: 'Упругость e', min: 0, max: 1, step: 0.05, unit: '' },
      { key: 'friction', label: 'Трение μ', min: 0, max: 1, step: 0.05, unit: '' },
    ];
  }

  getTelemetry() {
    return [
      { name: 'Добавка скорости', value: `${this.properties.boost} м/с` },
      { name: 'Упругость e', value: `${this.properties.restitution}` },
      { name: 'Длина L', value: `${(this.properties.length / PX_PER_METER).toFixed(2)} м` },
    ];
  }

  render(ctx, world) {
    super.render(ctx, world);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#bbf7d0';
    ctx.font = '700 12px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const n = Math.max(1, Math.floor(this.width / 44));
    for (let i = 0; i < n; i++) {
      ctx.fillText('↑', -this.width / 2 + (i + 0.5) * (this.width / n), 0);
    }
    ctx.restore();
  }
}

// ---------- Силовое поле: область с постоянным ускорением ----------
class ForceZone extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'force-zone';
    this.category = 'mechanics';
    this.label = 'Силовое поле';
    this.color = '#a855f7';
    this.width = 220;
    this.height = 150;
    this.properties = { strength: 8, width: 220, height: 150 };
  }

  getPropertySchema() {
    return [
      { key: 'strength', label: 'Ускорение a (вдоль стрелок)', min: -30, max: 30, step: 0.5, unit: 'м/с²' },
      { key: 'width', label: 'Ширина', min: 80, max: 520, step: 20, unit: 'пкс' },
      { key: 'height', label: 'Высота', min: 60, max: 400, step: 20, unit: 'пкс' },
    ];
  }

  contains(wx, wy) {
    const l = this.toLocal(wx, wy);
    return Math.abs(l.x) <= this.properties.width / 2 && Math.abs(l.y) <= this.properties.height / 2;
  }

  // ускорение в пкс/с² (в мировых осях)
  accel() {
    const a = (this.properties.strength || 0) * PX_PER_METER;
    return { ax: Math.cos(this.rotation) * a, ay: Math.sin(this.rotation) * a };
  }

  getTelemetry() {
    const a = this.properties.strength;
    return [
      { name: 'Ускорение a', value: `${a.toFixed(1)} м/с²` },
      { name: 'Сила на 1 кг', value: `${a.toFixed(1)} Н` },
      { name: 'Направление', value: `${Math.round((this.rotation * 180) / Math.PI)}°` },
    ];
  }

  render(ctx, world) {
    this.width = this.properties.width;
    this.height = this.properties.height;
    const hw = this.width / 2;
    const hh = this.height / 2;
    const dir = (this.properties.strength || 0) >= 0 ? 1 : -1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = 'rgba(168, 85, 247, 0.10)';
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(192, 132, 252, 0.55)';
    ctx.lineWidth = this.selected ? 2 : 1.3;
    ctx.setLineDash([7, 5]);
    roundRect(ctx, -hw, -hh, this.width, this.height, 10);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(216, 180, 254, 0.6)';
    ctx.lineWidth = 2;
    const cols = Math.max(2, Math.floor(this.width / 60));
    const rows = Math.max(1, Math.floor(this.height / 50));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const cx = -hw + (i + 0.5) * (this.width / cols);
        const cy = -hh + (j + 0.5) * (this.height / rows);
        ctx.beginPath();
        ctx.moveTo(cx - 9 * dir, cy - 7);
        ctx.lineTo(cx + 5 * dir, cy);
        ctx.lineTo(cx - 9 * dir, cy + 7);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#d8b4fe';
    ctx.font = '700 11px Inter, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`a = ${(this.properties.strength || 0).toFixed(1)} м/с²`, -hw + 8, -hh + 6);
    ctx.restore();
  }
}

class Spring extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'spring';
    this.category = 'mechanics';
    this.label = 'Пружина Гука';
    this.color = '#22c55e';
    this.width = 56;
    this.height = 180;
    this.rotatable = false;

    this.properties = {
      stiffness: 40,     // Н/м
      damping: 0.25,     // затухание
      mass: 2.0,         // масса подвешенного груза, кг
      restLength: 140,   // длина покоя, пкс
      displacement: 60,  // начальное смещение, пкс
      // ---- Кручение (работает только в режиме 3D) ----
      twist0: 0,         // начальная закрутка груза, градусы
      coupling: 0.25,    // связь «растяжение ↔ кручение» (безразмерная, 0…0.6)
      torsion: 10,       // жёсткость кручения κ, Н·м/рад
      autoTune: true,    // автоматически настраивать резонанс I = κ·m/k
      inertia: 0.5,      // момент инерции груза I, кг·м² (если автонастройка выключена)
      twistDamping: 0.01, // затухание кручения
    };

    this.disp = this.properties.displacement;
    this.vel = 0;
    this.twist = 0;      // угол закрутки груза, рад
    this.twistVel = 0;   // угловая скорость, рад/с
    this.coupled = false; // учитывается ли кручение (режим 3D)
  }

  restoreState() {
    super.restoreState();
    this.disp = this.properties.displacement;
    this.vel = 0;
    this.twist = ((this.properties.twist0 || 0) * Math.PI) / 180;
    this.twistVel = 0;
  }

  // Момент инерции груза: при автонастройке частоты растяжения и кручения совпадают
  inertiaEff() {
    const p = this.properties;
    if (p.autoTune) return (p.torsion * p.mass) / p.stiffness;
    return Math.max(0.01, p.inertia);
  }

  getPropertySchema3D() {
    return [
      { key: 'twist0', label: 'Начальная закрутка θ₀', min: -720, max: 720, step: 15, unit: '°' },
      { key: 'coupling', label: 'Связь растяжение ↔ кручение', min: 0, max: 0.6, step: 0.05, unit: '' },
      { key: 'torsion', label: 'Жёсткость кручения κ', min: 2, max: 40, step: 1, unit: 'Н·м/рад' },
      { key: 'autoTune', label: 'Автонастройка резонанса', type: 'boolean' },
      { key: 'inertia', label: 'Момент инерции I (без автонастройки)', min: 0.1, max: 3, step: 0.05, unit: 'кг·м²' },
      { key: 'twistDamping', label: 'Затухание кручения', min: 0, max: 0.5, step: 0.01, unit: '' },
    ];
  }

  getBobWorldPos() {
    const rest = this.properties.restLength || 140;
    return {
      x: this.x,
      y: this.y + rest + this.disp,
    };
  }

  getSelectionLocalBox() {
    const rest = this.properties.restLength || 140;
    const totalH = Math.max(60, rest + this.disp + 24);
    return {
      x: -28,
      y: -8,
      w: 56,
      h: totalH + 8,
    };
  }

  containsPoint(wx, wy) {
    const bob = this.getBobWorldPos();
    if (Math.hypot(wx - bob.x, wy - bob.y) <= 28) return true;
    return (
      wx >= this.x - 28 &&
      wx <= this.x + 28 &&
      wy >= this.y - 14 &&
      wy <= bob.y + 24
    );
  }

  getPropertySchema() {
    return [
      { key: 'stiffness', label: 'Жёсткость k', min: 5, max: 120, step: 5, unit: 'Н/м' },
      { key: 'mass', label: 'Масса груза m', min: 0.5, max: 10, step: 0.5, unit: 'кг' },
      { key: 'damping', label: 'Затухание c', min: 0, max: 3, step: 0.05, unit: '' },
      { key: 'restLength', label: 'Длина покоя L₀', min: 80, max: 240, step: 10, unit: 'пкс' },
      { key: 'displacement', label: 'Нач. смещение Δx', min: -70, max: 110, step: 5, unit: 'пкс' },
    ];
  }

  getEnergy() {
    const k = this.properties.stiffness;
    const m = this.properties.mass;
    const dxMeters = this.disp / PX_PER_METER;
    const vMeters = this.vel / PX_PER_METER;
    let ek = 0.5 * m * vMeters * vMeters;
    let ep = 0.5 * k * dxMeters * dxMeters;
    if (this.coupled) {
      const kappa = this.properties.torsion;
      const eps = this.properties.coupling * Math.sqrt(k * kappa);
      ek += 0.5 * this.inertiaEff() * this.twistVel * this.twistVel;
      ep += 0.5 * kappa * this.twist * this.twist + 0.5 * eps * dxMeters * this.twist;
    }
    return { ek, ep, total: ek + ep };
  }

  getTelemetry(world) {
    const k = this.properties.stiffness;
    const m = this.properties.mass;
    const period = 2 * Math.PI * Math.sqrt(m / k);
    const force = -k * (this.disp / PX_PER_METER);
    const en = this.getEnergy();
    const items = [
      { name: 'Смещение Δx', value: `${(this.disp / PX_PER_METER).toFixed(2)} м` },
      { name: 'Сила Гука F', value: `${force.toFixed(1)} Н` },
      { name: 'Период T', value: `${period.toFixed(2)} с` },
      { name: 'Полная E', value: `${en.total.toFixed(2)} Дж` },
    ];
    if (world && world.mode3d) {
      const kappa = this.properties.torsion;
      const Tt = 2 * Math.PI * Math.sqrt(this.inertiaEff() / kappa);
      const Ek = 0.5 * this.inertiaEff() * this.twistVel * this.twistVel + 0.5 * kappa * this.twist * this.twist;
      items.push(
        { name: 'Закрутка θ', value: `${((this.twist * 180) / Math.PI).toFixed(0)}°` },
        { name: 'Энергия кручения', value: `${Ek.toFixed(2)} Дж` },
        { name: 'Период кручения', value: `${Tt.toFixed(2)} с` },
        { name: 'Расстройка', value: `${(Math.abs(Tt - period) / period * 100).toFixed(0)} %` }
      );
    }
    return items;
  }

  update(dt, world) {
    const k = this.properties.stiffness;
    const m = this.properties.mass;
    const c = this.properties.damping;
    this.coupled = !!(world && world.mode3d);

    if (!this.coupled) {
      // Физичное уравнение: m * x'' = -k * x - c * x'
      const acc = (-k * this.disp - c * this.vel) / m;
      this.vel += acc * dt;
      this.disp += this.vel * dt;
      return;
    }

    // 3D: маятник Вильберфорса — растяжение и кручение связаны:
    //   m z'' = -k z - c z' - (ε/2) θ
    //   I θ'' = -κ θ - γ θ' - (ε/2) z
    // Энергия перекачивается между вертикальными колебаниями и закруткой.
    const kappa = this.properties.torsion;
    const I = this.inertiaEff();
    const gamma = this.properties.twistDamping || 0;
    const eps = (this.properties.coupling || 0) * Math.sqrt(k * kappa);
    const n = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / n;
    let z = this.disp / PX_PER_METER;
    let zv = this.vel / PX_PER_METER;
    let th = this.twist;
    let tv = this.twistVel;
    for (let i = 0; i < n; i++) {
      const za = (-k * z - c * zv - 0.5 * eps * th) / m;
      const ta = (-kappa * th - gamma * tv - 0.5 * eps * z) / I;
      zv += za * h;
      tv += ta * h;
      z += zv * h;
      th += tv * h;
    }
    this.disp = z * PX_PER_METER;
    this.vel = zv * PX_PER_METER;
    this.twist = th;
    this.twistVel = tv;
  }

  render(ctx, world) {
    const bob = this.getBobWorldPos();
    const topY = this.y;
    const botY = bob.y - 20;

    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x - 24, topY);
    ctx.lineTo(this.x + 24, topY);
    ctx.stroke();

    const coils = 10;
    const span = Math.max(28, botY - topY - 16);
    const stepY = span / coils;

    const strain = Math.max(-1, Math.min(1, this.disp / 75));
    ctx.strokeStyle = strain > 0.15 ? '#38bdf8' : strain < -0.15 ? '#f43f5e' : '#22c55e';
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, topY);
    ctx.lineTo(this.x, topY + 8);
    for (let i = 0; i < coils; i++) {
      const y1 = topY + 8 + i * stepY;
      ctx.lineTo(this.x + (i % 2 === 0 ? 15 : -15), y1 + stepY * 0.5);
    }
    ctx.lineTo(this.x, botY);
    ctx.stroke();

    if (world && world.showVectors) {
      const eqY = this.y + this.properties.restLength;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x - 36, eqY);
      ctx.lineTo(this.x + 36, eqY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = this.selected ? 2.2 : 1.2;
    roundRect(ctx, bob.x - 22, bob.y - 20, 44, 40, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.properties.mass} кг`, bob.x, bob.y);
    ctx.restore();

    if (world && world.showVectors) {
      const f = -this.properties.stiffness * (this.disp / PX_PER_METER);
      if (Math.abs(f) > 0.5) {
        drawArrow(
          ctx,
          bob.x + 28,
          bob.y,
          bob.x + 28,
          bob.y + Math.max(-70, Math.min(70, f * 2.2)),
          '#38bdf8',
          'Fупр'
        );
      }
    }
  }
}

class Pendulum extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'pendulum';
    this.category = 'mechanics';
    this.label = 'Маятник';
    this.color = '#f59e0b';
    this.width = 60;
    this.height = 200;
    this.rotatable = false;

    this.properties = {
      length: 175,
      mass: 2.0,
      angle: 38,
      damping: 0.03,
      // ---- Кручение нити (работает только в режиме 3D) ----
      twist0: 0,          // начальная закрутка груза, градусы
      torsion: 0.5,       // жёсткость кручения нити κ, Н·м/рад
      twistDamping: 0.01, // затухание кручения
      shorten: 4,         // укорочение нити при закрутке, пкс на рад²
    };

    this.theta = (this.properties.angle * Math.PI) / 180;
    this.omega = 0;
    this.trail = [];
    this.twist = 0;
    this.twistVel = 0;
    this.coupled = false;
  }

  restoreState() {
    super.restoreState();
    this.theta = (this.properties.angle * Math.PI) / 180;
    this.omega = 0;
    this.trail = [];
    this.twist = ((this.properties.twist0 || 0) * Math.PI) / 180;
    this.twistVel = 0;
  }

  // Момент инерции груза относительно оси нити (кг·м²)
  twistInertia() {
    return 0.02 * (this.properties.mass || 2);
  }

  // Эффективная длина нити: закрученная нить укорачивается (как скрученный шнур)
  effLength() {
    const L = this.properties.length || 175;
    if (!this.coupled) return L;
    return Math.max(0.5 * L, L - (this.properties.shorten || 0) * this.twist * this.twist);
  }

  getPropertySchema3D() {
    return [
      { key: 'twist0', label: 'Начальная закрутка θ₀', min: -720, max: 720, step: 15, unit: '°' },
      { key: 'torsion', label: 'Жёсткость кручения κ', min: 0.1, max: 3, step: 0.1, unit: 'Н·м/рад' },
      { key: 'shorten', label: 'Укорочение нити', min: 0, max: 12, step: 0.5, unit: 'пкс/рад²' },
      { key: 'twistDamping', label: 'Затухание кручения', min: 0, max: 0.2, step: 0.005, unit: '' },
    ];
  }

  getBobPos() {
    const L = this.effLength();
    return {
      x: this.x + L * Math.sin(this.theta),
      y: this.y + L * Math.cos(this.theta),
    };
  }

  getSelectionLocalBox() {
    const L = this.effLength();
    const bx = L * Math.sin(this.theta);
    const by = L * Math.cos(this.theta);
    const minX = Math.min(-20, bx - 22);
    const maxX = Math.max(20, bx + 22);
    const minY = Math.min(-10, by - 22);
    const maxY = Math.max(20, by + 22);
    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };
  }

  containsPoint(wx, wy) {
    const bob = this.getBobPos();
    if (Math.hypot(wx - bob.x, wy - bob.y) <= 26) return true;
    if (Math.hypot(wx - this.x, wy - this.y) <= 18) return true;
    const dx = bob.x - this.x;
    const dy = bob.y - this.y;
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((wx - this.x) * dx + (wy - this.y) * dy) / len2));
    const px = this.x + t * dx;
    const py = this.y + t * dy;
    return Math.hypot(wx - px, wy - py) <= 10;
  }

  getPropertySchema() {
    return [
      { key: 'angle', label: 'Нач. угол θ₀', min: -85, max: 85, step: 1, unit: '°' },
      { key: 'length', label: 'Длина нити L', min: 80, max: 300, step: 5, unit: 'пкс' },
      { key: 'mass', label: 'Масса груза m', min: 0.5, max: 10, step: 0.5, unit: 'кг' },
      { key: 'damping', label: 'Затухание γ', min: 0, max: 0.5, step: 0.01, unit: '' },
    ];
  }

  getEnergy(groundY = 260, g = 9.81) {
    const L = this.effLength() / PX_PER_METER;
    const m = this.properties.mass;
    const v = Math.abs(this.omega) * L;
    const h = L * (1 - Math.cos(this.theta));
    let ek = 0.5 * m * v * v;
    let ep = m * g * h;
    if (this.coupled) {
      ek += 0.5 * this.twistInertia() * this.twistVel * this.twistVel;
      ep += 0.5 * this.properties.torsion * this.twist * this.twist;
    }
    return { ek, ep, total: ek + ep };
  }

  getTelemetry(world) {
    const g = world ? world.gravity : 9.81;
    const L = (this.properties.length || 175) / PX_PER_METER;
    const period = g > 0.01 ? 2 * Math.PI * Math.sqrt(L / g) : Infinity;
    const deg = (this.theta * 180) / Math.PI;
    const en = this.getEnergy(260, g);
    const items = [
      { name: 'Текущий угол θ', value: `${deg.toFixed(1)}°` },
      { name: 'Период T', value: isFinite(period) ? `${period.toFixed(2)} с` : '∞' },
      { name: 'Кин. энергия Ek', value: `${en.ek.toFixed(2)} Дж` },
      { name: 'Пот. энергия Ep', value: `${en.ep.toFixed(2)} Дж` },
    ];
    if (world && world.mode3d) {
      const Le = this.effLength() / PX_PER_METER;
      const Tn = g > 0.01 ? 2 * Math.PI * Math.sqrt(Le / g) : Infinity;
      const Tt = 2 * Math.PI * Math.sqrt(this.twistInertia() / this.properties.torsion);
      items.push(
        { name: 'Закрутка φ', value: `${((this.twist * 180) / Math.PI).toFixed(0)}°` },
        { name: 'Длина нити сейчас', value: `${Le.toFixed(2)} м` },
        { name: 'Период качания сейчас', value: isFinite(Tn) ? `${Tn.toFixed(2)} с` : '∞' },
        { name: 'Период кручения', value: `${Tt.toFixed(2)} с` }
      );
    }
    return items;
  }

  update(dt, world) {
    this.coupled = !!(world && world.mode3d);

    // 3D: крутильные колебания груза на нити (κ θ'' момента): I φ'' = -κ φ - γ φ'
    if (this.coupled) {
      const I = this.twistInertia();
      const kappa = this.properties.torsion;
      const gamma = this.properties.twistDamping || 0;
      const n = Math.max(1, Math.ceil(dt / 0.004));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        this.twistVel += ((-kappa * this.twist - gamma * this.twistVel) / I) * h;
        this.twist += this.twistVel * h;
      }
    }

    const L = this.effLength() / PX_PER_METER;
    const g = world ? (world.gravity ?? 9.81) : 9.81;
    const damp = this.properties.damping || 0;
    const alpha = -(g / L) * Math.sin(this.theta) - damp * this.omega;
    this.omega += alpha * dt;
    this.theta += this.omega * dt;

    const bob = this.getBobPos();
    this.trail.push({ x: bob.x, y: bob.y });
    if (this.trail.length > 55) this.trail.shift();
  }

  render(ctx, world) {
    const bob = this.getBobPos();

    if (this.trail.length > 1) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const pt = this.trail[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.34)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    if (world && world.showVectors) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + (this.properties.length || 175));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(bob.x, bob.y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
    ctx.fill();

    const r = 19;
    const grad = ctx.createRadialGradient(bob.x - 5, bob.y - 5, 3, bob.x, bob.y, r);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = this.selected ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.arc(bob.x, bob.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    if (world && world.showVectors) {
      const vx = this.omega * this.properties.length * Math.cos(this.theta) * 0.25;
      const vy = -this.omega * this.properties.length * Math.sin(this.theta) * 0.25;
      if (Math.hypot(vx, vy) > 4) {
        drawArrow(ctx, bob.x, bob.y, bob.x + vx, bob.y + vy, '#22c55e', 'v');
      }
      if ((world.gravity ?? 9.81) > 0.01) {
        drawArrow(ctx, bob.x, bob.y, bob.x, bob.y + 42, '#f59e0b', 'mg');
      }
    }
  }
}

// ============================================================
//  Солвер механики
// ============================================================

const MechanicsSolver = {
  step(world, dt, draggedEl = null) {
    const substeps = 6;
    const subDt = dt / substeps;
    const gravityPx = (world.gravity ?? 9.81) * PX_PER_METER;

    const bodies = world.elements.filter((e) => e instanceof Block || e instanceof Ball);
    const ramps = world.elements.filter((e) => e instanceof Ramp);
    const pendulums = world.elements.filter((e) => e instanceof Pendulum);
    const springs = world.elements.filter((e) => e instanceof Spring);
    const zones = world.elements.filter((e) => e instanceof ForceZone);

    for (const s of springs) {
      if (s !== draggedEl) s.update(dt, world);
    }
    for (const p of pendulums) {
      if (p !== draggedEl) p.update(dt, world);
    }

    for (let step = 0; step < substeps; step++) {
      for (const b of bodies) {
        if (b === draggedEl) continue;
        if (b instanceof Block && b.properties.pinned) {
          b.vx = 0;
          b.vy = 0;
          continue;
        }
        b.vy += gravityPx * subDt;
        for (const z of zones) {
          if (z.contains(b.x, b.y)) {
            const a = z.accel();
            b.vx += a.ax * subDt;
            b.vy += a.ay * subDt;
          }
        }
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;
        if (b instanceof Ball) {
          b.rotation += b.angVel * subDt;
        }
      }

      const statics = [
        ...ramps,
        ...bodies.filter((b) => b instanceof Block && b.properties.pinned),
      ];

      for (const b of bodies) {
        if (b === draggedEl) continue;
        if (b instanceof Block && b.properties.pinned) continue;
        for (const st of statics) {
          if (b === st) continue;
          this.resolveBodyVsOBB(b, st, subDt, gravityPx);
        }
      }

      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          this.resolveBodyVsBody(bodies[i], bodies[j]);
        }
      }

      for (const p of pendulums) {
        const bob = p.getBobPos();
        const L = p.effLength();
        const bobVx = p.omega * L * Math.cos(p.theta);
        const bobVy = -p.omega * L * Math.sin(p.theta);

        for (const b of bodies) {
          if (b === draggedEl) continue;
          if (b instanceof Block && b.properties.pinned) continue;
          const rB = b instanceof Ball ? (b.properties.radius || 23) : Math.min(b.width, b.height) / 2;
          const dx = b.x - bob.x;
          const dy = b.y - bob.y;
          const dist = Math.hypot(dx, dy);
          const minDist = 19 + rB;
          if (dist > 0.001 && dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            b.x += nx * overlap;
            b.y += ny * overlap;

            const rvx = b.vx - bobVx;
            const rvy = b.vy - bobVy;
            const vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const e = b.properties.restitution ?? 0.7;
              const mP = p.properties.mass || 2;
              const mB = b.properties.mass || 1.5;
              const jImp = (-(1 + e) * vn) / (1 / mB + 1 / mP);
              b.vx += (jImp / mB) * nx;
              b.vy += (jImp / mB) * ny;
              const tx = Math.cos(p.theta);
              const ty = -Math.sin(p.theta);
              const dVn = -(jImp / mP) * (nx * tx + ny * ty);
              p.omega += dVn / L;
            }
          }
        }
      }
    }

    for (const b of bodies) {
      if (Math.hypot(b.vx, b.vy) > 5) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 50) b.trail.shift();
      }
    }
  },

  resolveBodyVsOBB(body, obb, dt, gravityPx) {
    const loc = obb.toLocal(body.x, body.y);
    const hw = obb.width / 2;
    const hh = obb.height / 2;

    const r = body instanceof Ball ? (body.properties.radius || 23) : body.height / 2;

    const cx = Math.max(-hw, Math.min(hw, loc.x));
    const cy = Math.max(-hh, Math.min(hh, loc.y));
    const dx = loc.x - cx;
    const dy = loc.y - cy;
    const dist2 = dx * dx + dy * dy;

    if (dist2 > r * r) return;

    const dist = Math.sqrt(dist2) || 0.001;
    let lnx = dx / dist;
    let lny = dy / dist;
    if (dist < 0.01) {
      lnx = 0;
      lny = loc.y >= 0 ? 1 : -1;
    }

    // Выравниваем угол бруска ТОЛЬКО при реальном контакте с верхней гранью плоскости
    if (body instanceof Block && Math.abs(lny) > 0.7 && Math.abs(obb.rotation) < 1.1) {
      body.rotation = obb.rotation;
    }

    const overlap = r - dist;
    const c = Math.cos(obb.rotation);
    const s = Math.sin(obb.rotation);
    const nx = lnx * c - lny * s;
    const ny = lnx * s + lny * c;

    body.x += nx * overlap;
    body.y += ny * overlap;

    const vn = body.vx * nx + body.vy * ny;
    if (vn < 0) {
      const e = Math.min(body.properties.restitution ?? 0.5, obb.properties.restitution ?? 0.6);
      const bounce = Math.abs(vn) < 28 ? 0 : e;
      const jn = -(1 + bounce) * vn;
      body.vx += jn * nx;
      body.vy += jn * ny;

      const boost = obb.properties.boost;
      if (boost) {
        const kick = boost * PX_PER_METER;
        body.vx += nx * kick;
        body.vy += ny * kick;
      }

      const tx = -ny;
      const ty = nx;
      const vt = body.vx * tx + body.vy * ty;
      const mu = 0.5 * ((body.properties.friction ?? 0.2) + (obb.properties.friction ?? 0.2));
      const normalImpulse = Math.max(jn, gravityPx * dt * Math.max(0, -ny));
      const maxFriction = mu * normalImpulse;
      const jt = Math.max(-maxFriction, Math.min(maxFriction, -vt * (body instanceof Ball ? 0.25 : 0.85)));
      body.vx += jt * tx;
      body.vy += jt * ty;

      if (body instanceof Ball) {
        body.angVel = (body.vx * tx + body.vy * ty) / r;
      }
    }
  },

  resolveBodyVsBody(a, b) {
    const aPinned = a instanceof Block && a.properties.pinned;
    const bPinned = b instanceof Block && b.properties.pinned;
    if (aPinned && bPinned) return;

    const rA = a instanceof Ball ? (a.properties.radius || 23) : Math.min(a.width, a.height) / 2;
    const rB = b instanceof Ball ? (b.properties.radius || 23) : Math.min(b.width, b.height) / 2;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = rA + rB;

    if (dist <= 0.0001 || dist >= minDist) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;

    const invA = aPinned ? 0 : 1 / (a.properties.mass || 1);
    const invB = bPinned ? 0 : 1 / (b.properties.mass || 1);
    const invSum = invA + invB;
    if (invSum === 0) return;

    a.x -= nx * overlap * (invA / invSum);
    a.y -= ny * overlap * (invA / invSum);
    b.x += nx * overlap * (invB / invSum);
    b.y += ny * overlap * (invB / invSum);

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn > 0) return;

    const e = Math.min(a.properties.restitution ?? 0.7, b.properties.restitution ?? 0.7);
    const j = (-(1 + e) * vn) / invSum;

    a.vx -= j * invA * nx;
    a.vy -= j * invA * ny;
    b.vx += j * invB * nx;
    b.vy += j * invB * ny;
  },
};
