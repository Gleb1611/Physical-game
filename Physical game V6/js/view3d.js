// ============================================================
//  View3D — 3D-режим: тот же мир, другой взгляд.
//
//  Физика и данные остаются двумерными (x, y). 3D-вид «поднимает» каждый
//  элемент в объём и рисует его программным рендером на Canvas 2D
//  (перспектива, орбитальная камера, плоское затенение, сортировка по глубине).
//  Без внешних библиотек: работает офлайн и вписывается в чёрно-белый стиль.
//
//  Раскладка сцены:
//    • механика  — «стена»: мир (x, y) -> 3D (X = x, Y = -y), глубина вдоль Z;
//    • оптика и электричество — «стол»: мир (x, y) -> 3D (X = x, Z = y), высота вдоль Y.
//
//  Локальная третья координата элемента (lz) — глубина (стена) или высота (стол).
// ============================================================

const V3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm(a) {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

const NEAR = 8;
const LIGHT_DIR = V3.norm([-0.35, 0.8, 0.5]);
const RAY_HEIGHT = 70; // высота лучей над столом в оптике
const PORT_Z = 16; // высота клемм над столом в электричестве
const CHUNK = 64; // длинные линии режутся на куски для корректной сортировки

const GRAY = (v) => [v, v, v];

function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

class View3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fov = 0.9;
    this.layout = 'wall';
    this.yaw = 0.55;
    this.pitch = 0.28;
    this.dist = 900;
    this.baseDist = 900;
    this.target = [0, 0, 0];
    this.needsFrame = true;

    this.items = [];
    this.sorted = [];
    this.portScreen = [];
    this.wirePreview = null; // { a:[wx,wy], b:[wx,wy], snap:boolean }

    this.cam = [0, 0, 900];
    this.f = [0, 0, -1];
    this.r = [1, 0, 0];
    this.u = [0, 1, 0];
    this.focal = 500;
    this.W = 0;
    this.H = 0;
    this.world = null;
    this.showVectors = true;
    this.twistA = 0; // поворот вокруг вертикальной оси при построении закручиваемого груза
  }

  // ---------- Камера ----------
  static layoutFor(theme) {
    return theme === 'mechanics' ? 'wall' : 'table';
  }

  reset(theme = null) {
    this.layout = View3D.layoutFor(theme || (this.world && this.world.theme) || 'mechanics');
    if (this.layout === 'wall') {
      this.yaw = 0.55;
      this.pitch = 0.28;
    } else {
      this.yaw = 0.35;
      this.pitch = 0.95;
    }
    this.needsFrame = true;
  }

  centerWorld() {
    return this.layout === 'wall'
      ? { x: this.target[0], y: -this.target[1] }
      : { x: this.target[0], y: this.target[2] };
  }

  // Подгон камеры под содержимое сцены
  frame(world) {
    const els = world.elements.filter((e) => !(e instanceof Wire) && !e.ghost);
    const all = els.length > 0 ? els : world.elements;
    if (all.length === 0) return false;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const grow = (x, y) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };
    for (const e of all) {
      const hw = Math.min(260, (e.width || 60) / 2);
      const hh = Math.min(260, (e.height || 60) / 2);
      grow(e.x - hw, e.y - hh);
      grow(e.x + hw, e.y + hh);
      // подвешенные грузы лежат далеко от центра элемента — учитываем их с запасом на колебания
      if (e instanceof Spring) {
        const rest = e.properties.restLength || 140;
        grow(e.x - 60, e.y + rest + 120);
      } else if (e instanceof Pendulum) {
        const L = e.properties.length || 175;
        grow(e.x - L * 0.75, e.y + L + 30);
        grow(e.x + L * 0.75, e.y + L + 30);
      }
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const ext = Math.max(maxX - minX, (maxY - minY) * 1.25, 260);
    this.target = this.layout === 'wall' ? [cx, -cy, 0] : [cx, 20, cy];
    this.baseDist = (ext * 1.0) / (2 * Math.tan(this.fov / 2)) + 130;
    this.dist = this.baseDist;
    return true;
  }

  zoom(factor) {
    this.dist = Math.min(7000, Math.max(120, this.dist / factor));
  }

  zoomPercent() {
    return Math.round((this.baseDist / this.dist) * 100);
  }

  orbit(dx, dy) {
    this.yaw -= dx * 0.008;
    this.pitch = Math.min(1.5, Math.max(this.layout === 'table' ? 0.2 : -0.25, this.pitch + dy * 0.008));
  }

  pan(dx, dy) {
    const k = this.dist / this.focal;
    this.target = V3.add(this.target, V3.add(V3.mul(this.r, -dx * k), V3.mul(this.u, dy * k)));
  }

  setupCamera(W, H) {
    this.W = W;
    this.H = H;
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const t = this.target;
    this.cam = [t[0] + this.dist * cp * Math.sin(this.yaw), t[1] + this.dist * sp, t[2] + this.dist * cp * Math.cos(this.yaw)];
    this.f = V3.norm(V3.sub(t, this.cam));
    this.r = V3.norm(V3.cross(this.f, [0, 1, 0]));
    this.u = V3.cross(this.r, this.f);
    this.focal = H / 2 / Math.tan(this.fov / 2);
  }

  project(p) {
    const d = V3.sub(p, this.cam);
    const z = V3.dot(d, this.f);
    if (z < NEAR) return null;
    return [this.W / 2 + (V3.dot(d, this.r) / z) * this.focal, this.H / 2 - (V3.dot(d, this.u) / z) * this.focal, z];
  }

  // Мировые 2D-координаты -> 3D точка
  W3(wx, wy, lz = 0) {
    return this.layout === 'wall' ? [wx, -wy, lz] : [wx, lz, wy];
  }

  // Локальная точка элемента -> 3D точка
  P(el, lx, ly, lz = 0) {
    if (this.twistA) {
      // поворот вокруг оси подвеса (локальная ось y): (lx, lz) -> (lx cos a + lz sin a, -lx sin a + lz cos a)
      const c = Math.cos(this.twistA);
      const sn = Math.sin(this.twistA);
      const nx = lx * c + lz * sn;
      lz = -lx * sn + lz * c;
      lx = nx;
    }
    const w = el.toWorld(lx, ly);
    return this.W3(w.x, w.y, lz);
  }

  // Точка на экране -> мировые (x, y) на плоскости раскладки
  screenToWorld(sx, sy, planeCoord = 0) {
    const d = V3.norm(
      V3.add(V3.add(this.f, V3.mul(this.r, (sx - this.W / 2) / this.focal)), V3.mul(this.u, -(sy - this.H / 2) / this.focal))
    );
    const axis = this.layout === 'wall' ? 2 : 1;
    if (Math.abs(d[axis]) < 1e-4) return null;
    const t = (planeCoord - this.cam[axis]) / d[axis];
    if (t <= 0) return null;
    const p = V3.add(this.cam, V3.mul(d, t));
    return this.layout === 'wall' ? { x: p[0], y: -p[1] } : { x: p[0], y: p[2] };
  }

  // ---------- Примитивы отображения ----------
  poly(pts, st, owner, center, meta) {
    // Нормаль (метод Ньютона) — устойчива к вырожденным граням
    let n = [0, 0, 0];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    if (Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]) < 1e-9) return;
    n = V3.norm(n);
    const p0 = pts[0];
    const toCam = V3.sub(this.cam, p0);
    if (center) {
      if (V3.dot(n, V3.sub(p0, center)) < 0) n = V3.mul(n, -1);
      if (V3.dot(n, toCam) <= 0) return; // обратная грань выпуклого тела
    } else if (V3.dot(n, toCam) < 0) {
      n = V3.mul(n, -1);
    }

    const sp = [];
    let depth = 0;
    for (const p of pts) {
      const q = this.project(p);
      if (!q) return;
      sp.push(q);
      depth += q[2];
    }
    depth /= pts.length;

    const shade = 0.34 + 0.66 * Math.max(0, V3.dot(n, LIGHT_DIR));
    const base = st.fill || GRAY(150);
    const fill = `rgb(${Math.round(base[0] * shade)},${Math.round(base[1] * shade)},${Math.round(base[2] * shade)})`;
    this.items.push({
      t: 'poly',
      pts: sp,
      depth,
      fill,
      alpha: st.alpha === undefined ? 1 : st.alpha,
      edge: st.edge || null,
      lw: st.lw || 1,
      owner,
      meta,
    });
  }

  // Линия; длинные режутся на куски (корректная сортировка по глубине)
  line(a, b, st, owner, meta) {
    const len = V3.len(V3.sub(b, a));
    const k = Math.min(24, Math.max(1, Math.ceil(len / CHUNK)));
    for (let i = 0; i < k; i++) {
      this._line(V3.lerp(a, b, i / k), V3.lerp(a, b, (i + 1) / k), st, owner, meta);
    }
  }

  _line(a, b, st, owner, meta) {
    let pa = a;
    let pb = b;
    const za = V3.dot(V3.sub(pa, this.cam), this.f);
    const zb = V3.dot(V3.sub(pb, this.cam), this.f);
    if (za < NEAR && zb < NEAR) return;
    if (za < NEAR) pa = V3.lerp(pa, pb, (NEAR - za) / (zb - za));
    else if (zb < NEAR) pb = V3.lerp(pa, pb, (NEAR - za) / (zb - za));
    const qa = this.project(pa);
    const qb = this.project(pb);
    if (!qa || !qb) return;
    this.items.push({
      t: 'line',
      x1: qa[0], y1: qa[1], x2: qb[0], y2: qb[1],
      depth: (qa[2] + qb[2]) / 2 - (st.bias || 0),
      color: st.color || '#ffffff',
      alpha: st.alpha === undefined ? 1 : st.alpha,
      lw: st.lw || 1.5, // в мировых единицах, если st.world, иначе в пикселях
      world: !!st.world,
      glow: st.glow || 0,
      dash: st.dash || null,
      owner,
      meta,
      nopick: !!st.nopick,
    });
  }

  dot(p, radiusWorld, st, owner, meta) {
    const q = this.project(p);
    if (!q) return null;
    const item = {
      t: 'dot',
      x: q[0], y: q[1],
      r: Math.max(st.minR || 2, (radiusWorld * this.focal) / q[2]),
      depth: q[2] - (st.bias || 0),
      fill: st.fill || null,
      stroke: st.stroke || null,
      lw: st.lw || 1.2,
      alpha: st.alpha === undefined ? 1 : st.alpha,
      glow: st.glow || 0,
      owner,
      meta,
      nopick: !!st.nopick,
    };
    this.items.push(item);
    return item;
  }

  text(p, str, color = '#ffffff', size = 11, align = 'center') {
    const q = this.project(p);
    if (!q) return;
    this.items.push({ t: 'text', x: q[0], y: q[1], depth: q[2] - 40, str, color, size, align, nopick: true });
  }

  // ---------- Тела ----------
  S(el, fill, o = {}) {
    return { fill, alpha: o.alpha, edge: o.edge || null, lw: o.lw };
  }

  edgeStyle(el, o = {}) {
    return {
      color: el && el.selected ? '#ffffff' : o.color || 'rgba(255,255,255,0.55)',
      alpha: o.alpha === undefined ? 1 : o.alpha,
      lw: el && el.selected ? 1.9 : o.lw || 1.1,
      bias: 1.5,
      nopick: true,
    };
  }

  // Параллелепипед в локальных осях элемента: c — центр, h — полуразмеры
  box(el, c, h, st, o = {}) {
    const maxCell = o.maxCell || 60;
    const C = this.P(el, c[0], c[1], c[2]);
    const center = o.twoSided ? null : C;
    for (let a = 0; a < 3; a++) {
      const u = (a + 1) % 3;
      const v = (a + 2) % 3;
      const nu = Math.max(1, Math.ceil((2 * h[u]) / maxCell));
      const nv = Math.max(1, Math.ceil((2 * h[v]) / maxCell));
      for (const s of [-1, 1]) {
        for (let i = 0; i < nu; i++) {
          for (let j = 0; j < nv; j++) {
            const u0 = c[u] - h[u] + (2 * h[u] * i) / nu;
            const u1 = c[u] - h[u] + (2 * h[u] * (i + 1)) / nu;
            const v0 = c[v] - h[v] + (2 * h[v] * j) / nv;
            const v1 = c[v] - h[v] + (2 * h[v] * (j + 1)) / nv;
            const corner = (uu, vv) => {
              const q = [0, 0, 0];
              q[a] = c[a] + s * h[a];
              q[u] = uu;
              q[v] = vv;
              return this.P(el, q[0], q[1], q[2]);
            };
            this.poly([corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)], st, el, center, o.meta);
          }
        }
      }
    }
    if (o.edges !== false) this.boxEdges(el, c, h, o.edgeStyle || this.edgeStyle(el, o));
  }

  boxEdges(el, c, h, est) {
    const pt = (sx, sy, sz) => this.P(el, c[0] + sx * h[0], c[1] + sy * h[1], c[2] + sz * h[2]);
    for (const s1 of [-1, 1]) {
      for (const s2 of [-1, 1]) {
        this.line(pt(-1, s1, s2), pt(1, s1, s2), est, el);
        this.line(pt(s1, -1, s2), pt(s1, 1, s2), est, el);
        this.line(pt(s1, s2, -1), pt(s1, s2, 1), est, el);
      }
    }
  }

  // Тело вращения. axis 'x' или 'z' (локальные оси), profile: [[a, r], ...]
  revolve(el, axis, c, profile, n, st, o = {}) {
    const sy = o.sy || 1;
    const sz = o.sz || 1;
    const rings = profile.map(([a, r]) => {
      const ring = [];
      for (let i = 0; i < n; i++) {
        const ph = (Math.PI * 2 * i) / n;
        const cs = Math.cos(ph);
        const sn = Math.sin(ph);
        const loc =
          axis === 'x'
            ? [c[0] + a, c[1] + r * cs * sy, c[2] + r * sn * sz]
            : axis === 'y'
            ? [c[0] + r * cs, c[1] + a, c[2] + r * sn * sz]
            : [c[0] + r * cs, c[1] + r * sn * sy, c[2] + a];
        ring.push(this.P(el, loc[0], loc[1], loc[2]));
      }
      return ring;
    });
    const C = this.P(el, c[0], c[1], c[2]);
    const center = o.twoSided ? null : C;
    for (let k = 0; k < profile.length - 1; k++) {
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        this.poly([rings[k][i], rings[k][i1], rings[k + 1][i1], rings[k + 1][i]], st, el, center, o.meta);
      }
    }
    const first = profile[0];
    const last = profile[profile.length - 1];
    if (first[1] > 0) this.poly(rings[0], o.capBottom || o.cap || st, el, center, o.meta);
    if (last[1] > 0) this.poly(rings[rings.length - 1].slice(), o.capTop || o.cap || st, el, center, o.meta);
  }

  sphere(el, c, r, st, o = {}) {
    const m = o.m || 8;
    const prof = [];
    for (let k = 0; k <= m; k++) {
      const t = (Math.PI * k) / m;
      prof.push([-r * Math.cos(t), r * Math.sin(t)]);
    }
    this.revolve(el, 'x', c, prof, o.n || 14, st, o);
    // контур сферы
    const q = this.project(this.P(el, c[0], c[1], c[2]));
    if (q) {
      this.items.push({
        t: 'dot', x: q[0], y: q[1], r: (r * this.focal) / q[2], depth: q[2] - r * 0.98,
        fill: null, stroke: el.selected ? '#ffffff' : 'rgba(255,255,255,0.6)', lw: el.selected ? 1.9 : 1.1,
        alpha: 1, owner: el, meta: o.meta, nopick: true,
      });
    }
  }

  // Подставка: основание на столе + стойка до нижней точки элемента
  stand(el, zBottom, hw = 14) {
    this.box(el, [0, 0, 2], [hw, hw, 2], this.S(el, GRAY(70)), { edges: false, maxCell: 200 });
    if (zBottom > 6) {
      this.box(el, [0, 0, 4 + (zBottom - 4) / 2], [2.5, 2.5, (zBottom - 4) / 2], this.S(el, GRAY(110)), { edges: false, maxCell: 200 });
    }
  }

  // Провод-вывод от клеммы к телу
  lead(el, a, b, color = 'rgba(210,210,210,0.9)') {
    this.line(this.P(el, a[0], a[1], a[2]), this.P(el, b[0], b[1], b[2]), { color, lw: 2.4, world: true, nopick: true }, el);
  }

  // ---------- Построение сцены ----------
  buildScene(world, segments) {
    this.items = [];
    this.portScreen = [];
    const theme = world.theme;

    for (const el of world.elements) {
      const name = 'b_' + el.type.replace(/-/g, '_');
      const fn = this[name] || this.b_generic;
      fn.call(this, el, world);
    }

    if (theme === 'optics' && segments) this.buildRays(world, segments);

    // клеммы
    if (theme === 'electricity') {
      for (const el of world.elements) {
        if (el instanceof Wire || !el.ports || el.ports.length === 0) continue;
        el.ports.forEach((p, idx) => {
          const pos = this.P(el, p.x, p.y, PORT_Z);
          const it = this.dot(pos, 5, { fill: '#000000', stroke: '#ffffff', lw: 1.6, bias: 6 }, el, { port: idx });
          const q = this.project(pos);
          if (q) {
            const w = el.toWorld(p.x, p.y);
            this.portScreen.push({ el, index: idx, x: q[0], y: q[1], wx: w.x, wy: w.y });
          }
        });
      }
    }

    // ручка вращения выделенного элемента
    const sel = world.selected;
    if (sel && sel.rotatable && !(sel instanceof Wire)) {
      const h = sel.getRotationHandlePos();
      const lz = this.layout === 'wall' ? 0 : 3;
      const hp = this.W3(h.x, h.y, lz);
      this.line(this.W3(sel.x, sel.y, lz), hp, { color: 'rgba(255,255,255,0.6)', lw: 1.2, nopick: true }, sel);
      this.dot(hp, 7, { fill: '#ffffff', stroke: '#000000', lw: 1.6, bias: 8 }, sel, { handle: true });
    }

    // предпросмотр провода
    if (this.wirePreview) {
      const wp = this.wirePreview;
      this.line(this.W3(wp.a[0], wp.a[1], PORT_Z), this.W3(wp.b[0], wp.b[1], PORT_Z), {
        color: '#ffffff', lw: 2, dash: [6, 5], bias: 8, nopick: true,
      });
      if (wp.snap) this.dot(this.W3(wp.b[0], wp.b[1], PORT_Z), 9, { stroke: '#ffffff', lw: 2, bias: 8, nopick: true });
    }
  }

  buildRays(world, segments) {
    // экраны подсвечивают точки попадания
    for (const seg of segments) {
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const L = Math.hypot(dx, dy);
      const maxL = 1500;
      const k = L > maxL ? maxL / L : 1;
      this.line(
        this.W3(seg.x1, seg.y1, RAY_HEIGHT),
        this.W3(seg.x1 + dx * k, seg.y1 + dy * k, RAY_HEIGHT),
        { color: seg.color, alpha: Math.max(0.2, Math.min(1, seg.intensity)), lw: 2.1, world: true, glow: 8, nopick: true, bias: 2 }
      );
    }
    for (const el of world.elements) {
      if (!(el instanceof OpticalScreen)) continue;
      for (const h of el.hits) {
        this.dot(this.W3(h.x, h.y, RAY_HEIGHT), 4.2, { fill: h.color, glow: 12, bias: 5, nopick: true });
      }
    }
  }

  // ===================== МЕХАНИКА (стена) =====================
  b_generic(el) {
    const zc = this.layout === 'wall' ? 0 : 14;
    this.box(el, [0, 0, zc], [(el.width || 60) / 2, (el.height || 60) / 2, 14], this.S(el, GRAY(120)));
  }

  b_ball(el, world) {
    const r = el.properties.radius || 23;
    this.sphere(el, [0, 0, 0], r, this.S(el, GRAY(228)));
    // метка на поверхности показывает вращение при качении
    const mark = this.P(el, r * 0.72, 0, r * 0.69);
    const q = this.project(mark);
    const cen = this.P(el, 0, 0, 0);
    if (q && V3.dot(V3.sub(mark, cen), V3.sub(this.cam, mark)) > 0) {
      this.dot(mark, r * 0.17, { fill: '#2a2a2a', bias: r, nopick: true }, el);
    }
    if (world.showVectors) this.velocityArrow(el, el.vx, el.vy, r);
  }

  velocityArrow(el, vx, vy, lift) {
    const sp = Math.hypot(vx, vy);
    if (sp < 8) return;
    const k = Math.min(1.6, 120 / sp);
    const a = this.W3(el.x, el.y, lift + 2);
    const b = this.W3(el.x + vx * 0.3 * k, el.y + vy * 0.3 * k, lift + 2);
    this.line(a, b, { color: '#ffffff', lw: 2.2, bias: 30, nopick: true }, el);
    this.dot(b, 3.2, { fill: '#ffffff', bias: 31, nopick: true }, el);
  }

  b_block(el, world) {
    const fill = el.properties.pinned ? GRAY(110) : GRAY(178);
    this.box(el, [0, 0, 0], [el.width / 2, el.height / 2, 24], this.S(el, fill));
    if (world.showVectors) this.velocityArrow(el, el.vx, el.vy, 26);
  }

  rampBox(el, fill, stripes) {
    const len = el.properties.length || 360;
    this.box(el, [0, 0, 0], [len / 2, 11, 34], this.S(el, fill));
    if (stripes) {
      const est = { color: 'rgba(255,255,255,0.4)', lw: 1.2, bias: 2, nopick: true };
      for (let x = -len / 2 + 20; x < len / 2 - 8; x += 40) {
        this.line(this.P(el, x, -11, -34), this.P(el, x, -11, 34), est, el);
      }
    }
  }

  b_ramp(el) {
    this.rampBox(el, GRAY(96), false);
  }

  b_ice_plane(el) {
    this.rampBox(el, [170, 182, 190], false);
  }

  b_trampoline(el) {
    this.rampBox(el, GRAY(135), true);
  }

  b_force_zone(el) {
    const w = el.properties.width;
    const h = el.properties.height;
    const D = 70;
    this.box(el, [0, 0, 0], [w / 2, h / 2, D], this.S(el, GRAY(190), { alpha: 0.06 }), {
      twoSided: true,
      maxCell: 400,
      edgeStyle: { color: 'rgba(255,255,255,0.5)', lw: 1.1, bias: 1, nopick: true, dash: [6, 5] },
      meta: { low: true },
    });
    const dir = (el.properties.strength || 0) >= 0 ? 1 : -1;
    const est = { color: 'rgba(255,255,255,0.55)', lw: 1.6, nopick: true };
    const cols = Math.max(2, Math.floor(w / 80));
    const rows = Math.max(1, Math.floor(h / 70));
    for (const z of [-D * 0.5, 0, D * 0.5]) {
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const cx = -w / 2 + (i + 0.5) * (w / cols);
          const cy = -h / 2 + (j + 0.5) * (h / rows);
          const tip = this.P(el, cx + 10 * dir, cy, z);
          this.line(this.P(el, cx - 12 * dir, cy, z), tip, est, el);
          this.line(tip, this.P(el, cx - 2 * dir, cy - 7, z), est, el);
          this.line(tip, this.P(el, cx - 2 * dir, cy + 7, z), est, el);
        }
      }
    }
    this.text(this.P(el, -w / 2 + 40, -h / 2 - 8, D), `a = ${(el.properties.strength || 0).toFixed(1)} м/с²`, 'rgba(255,255,255,0.85)', 11);
  }

  b_target(el) {
    const on = el.reached;
    this.box(el, [0, 0, 0], [el.width / 2, el.height / 2, 34], this.S(el, GRAY(220), { alpha: on ? 0.22 : 0.07 }), {
      twoSided: true,
      maxCell: 400,
      edgeStyle: { color: '#ffffff', lw: on ? 2.2 : 1.3, bias: 1, nopick: true, dash: [7, 5] },
      meta: { low: true },
    });
    this.text(this.P(el, 0, -el.height / 2 - 10, 34), 'ЦЕЛЬ', '#ffffff', 11);
  }

  b_spring(el, world) {
    const rest = el.properties.restLength || 140;
    const bobY = rest + el.disp;
    const tw = el.twist || 0;
    const RING = 58;

    // потолочное крепление
    this.box(el, [0, -6, 0], [34, 5, 22], this.S(el, GRAY(96)));

    // витки: чем ниже, тем сильнее закручены на угол tw
    const turns = 10;
    const R = 13;
    const steps = turns * 8;
    const coil = { color: el.selected ? '#ffffff' : '#d8d8d8', lw: 2.6, world: true };
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const psi = t * turns * Math.PI * 2 + tw * t;
      const y = -2 + t * (bobY - 14);
      const p = this.P(el, R * Math.cos(psi), y, -R * Math.sin(psi));
      if (prev) this.line(prev, p, coil, el);
      prev = p;
    }

    // груз: диск с крестовиной и грузиками — поворачивается вокруг оси пружины
    this.twistA = tw;
    const part = { part: 'bob' };
    this.revolve(el, 'y', [0, bobY, 0], [[-5, 30], [5, 30]], 20, this.S(el, GRAY(150)), { meta: part });
    this.box(el, [0, bobY, 0], [46, 2.5, 3.5], this.S(el, GRAY(215)), { maxCell: 200, meta: part });
    this.box(el, [0, bobY, 0], [3.5, 2.5, 46], this.S(el, GRAY(215)), { maxCell: 200, meta: part });
    for (const [cx, cz, tone] of [[46, 0, 245], [-46, 0, 190], [0, 46, 190], [0, -46, 190]]) {
      this.box(el, [cx, bobY, cz], [6, 6, 6], this.S(el, GRAY(tone)), { maxCell: 200, meta: part });
    }
    // метка нулевой закрутки на крае диска
    const handleP = this.P(el, RING, bobY, 0);
    this.twistA = 0;

    // кольцо закручивания: показывается у выделенной пружины
    if (el.selected) {
      const ring = { color: 'rgba(255,255,255,0.45)', lw: 1.2, dash: [4, 4], nopick: true };
      let rp = null;
      for (let i = 0; i <= 40; i++) {
        const psi = (Math.PI * 2 * i) / 40;
        const p = this.P(el, RING * Math.cos(psi), bobY, -RING * Math.sin(psi));
        if (rp) this.line(rp, p, ring, el);
        rp = p;
      }
      this.dot(handleP, 7, { fill: '#ffffff', stroke: '#000000', lw: 1.6, bias: 12 }, el, { twist: true });
    }

    if (world.showVectors) {
      this.text(this.P(el, 0, bobY + 44, 0), `${el.properties.mass} кг · θ = ${((tw * 180) / Math.PI).toFixed(0)}°`, 'rgba(255,255,255,0.85)', 10);
    }
  }

  // Система координат кольца закручивания груза: центр, нормаль, базис, радиус
  twistFrame(el) {
    if (el instanceof Spring) {
      const bobY = (el.properties.restLength || 140) + el.disp;
      const save = this.twistA;
      this.twistA = 0;
      const C = this.P(el, 0, bobY, 0);
      this.twistA = save;
      return { C, n: [0, 1, 0], e1: [1, 0, 0], e2: [0, 0, -1], R: 58 };
    }
    if (el instanceof Pendulum) {
      const bob = el.getBobPos();
      const th = el.theta;
      const m = el.properties.mass || 2;
      const r = 14 + Math.min(10, m * 1.6);
      return {
        C: this.W3(bob.x, bob.y, 0),
        n: [Math.sin(th), -Math.cos(th), 0],
        e1: [Math.cos(th), Math.sin(th), 0],
        e2: [0, 0, -1],
        R: r + 24,
      };
    }
    return null;
  }

  // Угол на кольце закручивания под курсором (рад) или null
  twistAngleAt(el, sx, sy) {
    const fr = this.twistFrame(el);
    if (!fr) return null;
    const d = V3.norm(
      V3.add(V3.add(this.f, V3.mul(this.r, (sx - this.W / 2) / this.focal)), V3.mul(this.u, -(sy - this.H / 2) / this.focal))
    );
    const dn = V3.dot(d, fr.n);
    if (Math.abs(dn) < 1e-3) return null;
    const t = V3.dot(V3.sub(fr.C, this.cam), fr.n) / dn;
    if (t <= 0) return null;
    const rel = V3.sub(V3.add(this.cam, V3.mul(d, t)), fr.C);
    return Math.atan2(V3.dot(rel, fr.e2), V3.dot(rel, fr.e1));
  }

  b_pendulum(el, world) {
    const bob = el.getBobPos();
    const th = el.theta;
    const tw = el.twist || 0;
    const L = el.properties.length || 175;
    this.box(el, [0, -6, 0], [34, 5, 20], this.S(el, GRAY(96)));

    const fr = this.twistFrame(el);
    const C = fr.C;
    const piv = this.W3(el.x, el.y, 0);
    const m = el.properties.mass || 2;
    const r = 14 + Math.min(10, m * 1.6);
    const dirAt = (psi) => V3.add(V3.mul(fr.e1, Math.cos(psi)), V3.mul(fr.e2, Math.sin(psi)));

    // нить из двух прядей: чем сильнее закрутка, тем плотнее свита
    const strand = { color: el.selected ? '#ffffff' : '#d8d8d8', lw: 1.5, world: true };
    for (const phase of [0, Math.PI]) {
      let prev = null;
      const N = 28;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const base = V3.lerp(piv, C, t);
        const off = V3.mul(dirAt(phase + tw * 3 * t), 2.6);
        const p = V3.add(base, off);
        if (prev) this.line(prev, p, strand, el);
        prev = p;
      }
    }

    // груз и крестовина, вращающаяся вокруг оси нити
    this.worldSphere(el, C, r, this.S(el, GRAY(212)), { part: 'bob' });
    const armR = r + 14;
    const arm = { color: '#f2f2f2', lw: 2.4, world: true, bias: r + 2 };
    for (const k of [0, 1]) {
      const d = dirAt(tw + (k * Math.PI) / 2);
      this.line(V3.sub(C, V3.mul(d, armR)), V3.add(C, V3.mul(d, armR)), arm, el, { part: 'bob' });
    }
    for (const sgn of [1, -1]) {
      this.dot(V3.add(C, V3.mul(dirAt(tw), armR * sgn)), 4.5, { fill: sgn > 0 ? '#ffffff' : '#a8a8a8', bias: r + 4, nopick: true }, el);
      this.dot(V3.add(C, V3.mul(dirAt(tw + Math.PI / 2), armR * sgn)), 4, { fill: '#a8a8a8', bias: r + 4, nopick: true }, el);
    }

    if (el.selected) {
      const ring = { color: 'rgba(255,255,255,0.45)', lw: 1.2, dash: [4, 4], nopick: true };
      let rp = null;
      for (let i = 0; i <= 40; i++) {
        const p = V3.add(C, V3.mul(dirAt((Math.PI * 2 * i) / 40), fr.R));
        if (rp) this.line(rp, p, ring, el);
        rp = p;
      }
      this.dot(V3.add(C, V3.mul(dirAt(tw), fr.R)), 7, { fill: '#ffffff', stroke: '#000000', lw: 1.6, bias: 12 }, el, { twist: true });
    }

    if (world.showVectors) {
      this.text(this.W3(bob.x, bob.y + r + 22, 0), `L = ${(el.effLength() / PX_PER_METER).toFixed(2)} м · φ = ${((tw * 180) / Math.PI).toFixed(0)}°`, 'rgba(255,255,255,0.8)', 10);
    }
  }

  // Сфера по готовому центру в 3D (для тел, у которых нет собственных локальных осей)
  worldSphere(el, C, r, st, meta) {
    const m = 8;
    const n = 14;
    const rings = [];
    for (let k = 0; k <= m; k++) {
      const t = (Math.PI * k) / m;
      const a = -r * Math.cos(t);
      const rad = r * Math.sin(t);
      const ring = [];
      for (let i = 0; i < n; i++) {
        const ph = (Math.PI * 2 * i) / n;
        ring.push([C[0] + a, C[1] + rad * Math.cos(ph), C[2] + rad * Math.sin(ph)]);
      }
      rings.push(ring);
    }
    for (let k = 0; k < m; k++) {
      for (let i = 0; i < n; i++) {
        const i1 = (i + 1) % n;
        this.poly([rings[k][i], rings[k][i1], rings[k + 1][i1], rings[k + 1][i]], st, el, C, meta);
      }
    }
    const q = this.project(C);
    if (q) {
      this.items.push({
        t: 'dot', x: q[0], y: q[1], r: (r * this.focal) / q[2], depth: q[2] - r * 0.98,
        fill: null, stroke: el.selected ? '#ffffff' : 'rgba(255,255,255,0.6)', lw: el.selected ? 1.9 : 1.1,
        alpha: 1, owner: el, meta, nopick: true,
      });
    }
  }

  // ===================== ОПТИКА (стол) =====================
  b_light_source(el) {
    this.stand(el, RAY_HEIGHT - 20);
    this.box(el, [0, 0, RAY_HEIGHT], [28, 20, 20], this.S(el, GRAY(72)));
    this.box(el, [27, 0, RAY_HEIGHT], [4, 12, 12], this.S(el, GRAY(235)), { edges: false });
    // стрелка направления на корпусе
    this.line(this.P(el, -14, 0, RAY_HEIGHT + 21), this.P(el, 14, 0, RAY_HEIGHT + 21), { color: '#ffffff', lw: 1.6, nopick: true }, el);
  }

  b_lens(el, world) {
    const r = (el.properties.aperture || 150) / 2;
    const sz = Math.min(1, 66 / r);
    const conv = (el.properties.kind || 'converging') === 'converging';
    const profile = conv
      ? [[-6.5, 0], [-5.8, 0.4 * r], [-4, 0.75 * r], [-1.5, r], [1.5, r], [4, 0.75 * r], [5.8, 0.4 * r], [6.5, 0]]
      : [[-1, 0], [-2.5, 0.4 * r], [-4.5, 0.75 * r], [-6, r], [6, r], [4.5, 0.75 * r], [2.5, 0.4 * r], [1, 0]];
    this.stand(el, RAY_HEIGHT - r * sz);
    this.revolve(el, 'x', [0, 0, RAY_HEIGHT], profile, 20, this.S(el, GRAY(215), { alpha: 0.22 }), { twoSided: true, sz });
    // ободок линзы
    const est = this.edgeStyle(el, { color: 'rgba(255,255,255,0.85)', lw: 1.4 });
    let prev = null;
    for (let i = 0; i <= 28; i++) {
      const ph = (Math.PI * 2 * i) / 28;
      const p = this.P(el, 0, r * Math.cos(ph), RAY_HEIGHT + r * sz * Math.sin(ph));
      if (prev) this.line(prev, p, est, el);
      prev = p;
    }
    if (world.showVectors) {
      const F = el.properties.focal || 140;
      for (const s of [-1, 1]) {
        const fp = this.P(el, s * F, 0, RAY_HEIGHT);
        this.dot(fp, 3, { fill: '#ffffff', bias: 3, nopick: true }, el);
        this.text(this.P(el, s * F, 0, RAY_HEIGHT + 14), 'F', '#ffffff', 10);
      }
    }
  }

  b_mirror(el, world) {
    const hh = (el.properties.aperture || 140) / 2;
    const kind = el.properties.kind || 'flat';
    const curve = kind === 'concave' ? 18 : kind === 'convex' ? -18 : 0;
    const hz = 42;
    const N = 12;
    const xOf = (y) => -(curve / 2) * (y / hh) * (y / hh);
    this.stand(el, RAY_HEIGHT - hz);
    const front = this.S(el, GRAY(222), { alpha: 0.92 });
    const back = this.S(el, GRAY(70));
    for (let i = 0; i < N; i++) {
      const y0 = -hh + (2 * hh * i) / N;
      const y1 = -hh + (2 * hh * (i + 1)) / N;
      // зеркальная (передняя) и тыльная стороны
      this.poly(
        [this.P(el, xOf(y0) - 1.5, y0, RAY_HEIGHT - hz), this.P(el, xOf(y1) - 1.5, y1, RAY_HEIGHT - hz), this.P(el, xOf(y1) - 1.5, y1, RAY_HEIGHT + hz), this.P(el, xOf(y0) - 1.5, y0, RAY_HEIGHT + hz)],
        front, el, null
      );
      this.poly(
        [this.P(el, xOf(y0) + 3, y0, RAY_HEIGHT - hz), this.P(el, xOf(y1) + 3, y1, RAY_HEIGHT - hz), this.P(el, xOf(y1) + 3, y1, RAY_HEIGHT + hz), this.P(el, xOf(y0) + 3, y0, RAY_HEIGHT + hz)],
        back, el, null
      );
    }
    const est = this.edgeStyle(el, { color: 'rgba(255,255,255,0.8)', lw: 1.3 });
    for (const z of [RAY_HEIGHT - hz, RAY_HEIGHT + hz]) {
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const y = -hh + (2 * hh * i) / N;
        const p = this.P(el, xOf(y) - 1.5, y, z);
        if (prev) this.line(prev, p, est, el);
        prev = p;
      }
    }
    if (world.showVectors && kind !== 'flat') {
      const F = el.properties.focal || 130;
      const fx = kind === 'concave' ? -F : F;
      this.dot(this.P(el, fx, 0, RAY_HEIGHT), 3, { fill: '#ffffff', bias: 3, nopick: true }, el);
      this.text(this.P(el, fx, 0, RAY_HEIGHT + 14), 'F', '#ffffff', 10);
    }
  }

  b_prism(el) {
    const s = el.properties.size || 130;
    const h = (s * Math.sqrt(3)) / 2;
    const tri = [[0, -(2 / 3) * h], [s / 2, h / 3], [-s / 2, h / 3]];
    const z0 = RAY_HEIGHT - 36;
    const z1 = RAY_HEIGHT + 36;
    this.stand(el, z0);
    const st = this.S(el, GRAY(215), { alpha: 0.2 });
    this.poly(tri.map((p) => this.P(el, p[0], p[1], z0)), st, el, null);
    this.poly(tri.map((p) => this.P(el, p[0], p[1], z1)), st, el, null);
    for (let i = 0; i < 3; i++) {
      const a = tri[i];
      const b = tri[(i + 1) % 3];
      this.poly([this.P(el, a[0], a[1], z0), this.P(el, b[0], b[1], z0), this.P(el, b[0], b[1], z1), this.P(el, a[0], a[1], z1)], st, el, null);
    }
    const est = this.edgeStyle(el, { color: 'rgba(255,255,255,0.85)', lw: 1.4 });
    for (let i = 0; i < 3; i++) {
      const a = tri[i];
      const b = tri[(i + 1) % 3];
      this.line(this.P(el, a[0], a[1], z0), this.P(el, b[0], b[1], z0), est, el);
      this.line(this.P(el, a[0], a[1], z1), this.P(el, b[0], b[1], z1), est, el);
      this.line(this.P(el, a[0], a[1], z0), this.P(el, a[0], a[1], z1), est, el);
    }
  }

  b_optical_screen(el) {
    const H = (el.properties.height || 180) / 2;
    const hz = Math.min(H, 64);
    this.box(el, [0, 0, RAY_HEIGHT], [6, H, hz], this.S(el, GRAY(236)));
    if (RAY_HEIGHT - hz > 6) this.stand(el, RAY_HEIGHT - hz);
  }

  b_beam_splitter(el) {
    const hh = (el.properties.aperture || 130) / 2;
    this.stand(el, RAY_HEIGHT - 42);
    this.box(el, [0, 0, RAY_HEIGHT], [5, hh, 42], this.S(el, GRAY(225), { alpha: 0.26 }), { twoSided: true, maxCell: 200 });
    this.line(this.P(el, 0, -hh, RAY_HEIGHT), this.P(el, 0, hh, RAY_HEIGHT), { color: 'rgba(255,255,255,0.7)', lw: 1.2, dash: [6, 4], nopick: true }, el);
  }

  b_glass_slab(el) {
    const hw = (el.properties.thickness || 60) / 2;
    const hh = (el.properties.length || 170) / 2;
    this.stand(el, RAY_HEIGHT - 40);
    this.box(el, [0, 0, RAY_HEIGHT], [hw, hh, 40], this.S(el, GRAY(215), { alpha: 0.16 }), {
      twoSided: true,
      maxCell: 200,
      edgeStyle: this.edgeStyle(el, { color: 'rgba(255,255,255,0.85)', lw: 1.3 }),
    });
  }

  b_color_filter(el) {
    const hh = (el.properties.aperture || 110) / 2;
    const tint = hexToRgb(SOURCE_COLOR_MAP[el.properties.color] || '#ffffff');
    this.stand(el, RAY_HEIGHT - 44);
    this.box(el, [0, 0, RAY_HEIGHT], [5, hh, 44], this.S(el, tint, { alpha: 0.4 }), {
      twoSided: true,
      maxCell: 200,
      edgeStyle: this.edgeStyle(el, { color: `rgb(${tint[0]},${tint[1]},${tint[2]})`, lw: 1.5 }),
    });
  }

  b_slit(el) {
    for (const [a, b] of el.getJaws()) {
      if (b - a < 1) continue;
      this.box(el, [0, (a + b) / 2, RAY_HEIGHT], [6, (b - a) / 2, 60], this.S(el, GRAY(48)), { maxCell: 200 });
    }
    this.box(el, [0, 0, 4], [12, 12, 2], this.S(el, GRAY(70)), { edges: false, maxCell: 200 });
  }

  // ===================== ЭЛЕКТРИЧЕСТВО (стол) =====================
  b_battery(el, world) {
    const R = 17;
    const zc = 18;
    this.revolve(el, 'x', [-17.5, 0, zc], [[-17.5, R], [17.5, R]], 16, this.S(el, GRAY(62)));
    this.revolve(el, 'x', [17.5, 0, zc], [[-17.5, R], [17.5, R]], 16, this.S(el, GRAY(185)));
    this.revolve(el, 'x', [38, 0, zc], [[-3, 6], [3, 6]], 10, this.S(el, GRAY(215)));
    this.lead(el, [-43, 0, PORT_Z], [-35, 0, zc]);
    this.lead(el, [43, 0, PORT_Z], [41, 0, zc]);
    this.text(this.P(el, -24, 0, zc + R + 6), '−', 'rgba(255,255,255,0.8)', 12);
    this.text(this.P(el, 24, 0, zc + R + 6), '+', '#ffffff', 12);
    if (world.showVectors) this.text(this.P(el, 0, 0, zc + R + 24), `${el.properties.emf} В`, '#ffffff', 12);
  }

  b_resistor(el) {
    const zc = 18;
    const heat = Math.min(1, (el.power || 0) / 20);
    const v = 175 + Math.round(70 * heat);
    this.revolve(el, 'x', [0, 0, zc], [[-28, 9], [28, 9]], 14, this.S(el, GRAY(v)));
    for (const x of [-14, -5, 6]) {
      this.revolve(el, 'x', [x, 0, zc], [[-1.8, 9.6], [1.8, 9.6]], 14, this.S(el, GRAY(40)), { cap: this.S(el, GRAY(40)) });
    }
    this.lead(el, [-42, 0, PORT_Z], [-28, 0, zc]);
    this.lead(el, [42, 0, PORT_Z], [28, 0, zc]);
  }

  b_lamp(el, world) {
    const normP = el.properties.blown ? 0 : Math.min(1.6, (el.power || 0) / (el.properties.maxPower || 25));
    const v = Math.round(70 + Math.min(1, normP) * 185);
    this.revolve(el, 'z', [0, 0, 0], [[0, 12], [11, 12]], 14, this.S(el, GRAY(62)));
    const bulbC = [0, 0, 31];
    this.sphere(el, bulbC, 19, this.S(el, el.properties.blown ? GRAY(52) : GRAY(v), { alpha: 0.92 }), { m: 7, n: 12 });
    this.lead(el, [-38, 0, PORT_Z], [-11, 0, 6]);
    this.lead(el, [38, 0, PORT_Z], [11, 0, 6]);
    if (normP > 0.02) {
      const c = this.P(el, 0, 0, 31);
      this.dot(c, 19 * (1.8 + normP * 1.5), { glow: Math.min(0.85, normP * 0.7), fill: 'glow', bias: -2, nopick: true }, el);
    }
    if (el.properties.blown) this.text(this.P(el, 0, 0, 58), '× перегорела', '#ffffff', 10);
    else if (world.showVectors) this.text(this.P(el, 0, 0, 58), `${(el.power || 0).toFixed(1)} Вт`, '#ffffff', 11);
  }

  b_switch(el) {
    this.box(el, [0, 0, 4], [34, 9, 4], this.S(el, GRAY(78)));
    this.box(el, [-27, 0, 13], [3.5, 5, 6], this.S(el, GRAY(160)));
    this.box(el, [27, 0, 13], [3.5, 5, 6], this.S(el, GRAY(160)));
    const closed = el.properties.closed;
    const tip = closed ? this.P(el, 27, 0, 21) : this.P(el, 17, 0, 44);
    this.line(this.P(el, -27, 0, 21), tip, { color: el.selected ? '#ffffff' : '#ececec', lw: 4.6, world: true }, el);
    this.lead(el, [-39, 0, PORT_Z], [-30, 0, 13]);
    this.lead(el, [39, 0, PORT_Z], [30, 0, 13]);
    this.text(this.P(el, 0, 0, 56), closed ? 'ВКЛ' : 'ВЫКЛ', 'rgba(255,255,255,0.8)', 10);
  }

  meter(el, letter, value, maxValue, world) {
    const zTop = 24;
    this.revolve(el, 'z', [0, 0, 0], [[0, 22], [zTop, 22]], 20, this.S(el, GRAY(66)), {
      capTop: this.S(el, GRAY(238)),
      capBottom: this.S(el, GRAY(40)),
    });
    const frac = Math.min(1, Math.abs(value) / maxValue);
    const ang = ((-150 + 120 * frac) * Math.PI) / 180;
    this.line(this.P(el, 0, 6, zTop + 0.5), this.P(el, 15 * Math.cos(ang), 6 + 15 * Math.sin(ang), zTop + 0.5), { color: '#111111', lw: 2.4, world: true, bias: 3, nopick: true }, el);
    this.text(this.P(el, 0, -9, zTop + 1), letter, '#111111', 13);
    this.lead(el, [-38, 0, PORT_Z], [-22, 0, PORT_Z]);
    this.lead(el, [38, 0, PORT_Z], [22, 0, PORT_Z]);
    if (world.showVectors) {
      this.text(this.P(el, 0, 0, zTop + 22), `${Math.abs(value).toFixed(letter === 'A' ? 2 : 1)} ${letter === 'A' ? 'А' : 'В'}`, '#ffffff', 11);
    }
  }

  b_ammeter(el, world) {
    this.meter(el, 'A', el.current || 0, 2, world);
  }

  b_voltmeter(el, world) {
    this.meter(el, 'V', el.voltageDrop || 0, 24, world);
  }

  b_capacitor(el, world) {
    const f = Math.min(1, Math.abs(el.vc || 0) / 24);
    const v = 110 + Math.round(120 * f);
    for (const x of [-6, 6]) {
      this.box(el, [x, 0, 20], [2, 20, 16], this.S(el, GRAY(v)));
    }
    this.lead(el, [-38, 0, PORT_Z], [-8, 0, PORT_Z]);
    this.lead(el, [38, 0, PORT_Z], [8, 0, PORT_Z]);
    this.text(this.P(el, -14, -14, 40), '+', '#ffffff', 11);
    this.text(this.P(el, 14, -14, 40), '−', 'rgba(255,255,255,0.8)', 11);
    if (world.showVectors) this.text(this.P(el, 0, 0, 52), `${(el.vc || 0).toFixed(1)} В`, '#ffffff', 11);
  }

  b_diode(el, world) {
    const dead = el.properties.blown;
    this.revolve(el, 'x', [0, 0, PORT_Z], [[-15, 7], [15, 7]], 12, this.S(el, dead ? GRAY(40) : el.conducting ? GRAY(120) : GRAY(66)));
    this.revolve(el, 'x', [11, 0, PORT_Z], [[-2.5, 7.4], [2.5, 7.4]], 12, this.S(el, GRAY(232)), { cap: this.S(el, GRAY(232)) });
    this.lead(el, [-38, 0, PORT_Z], [-15, 0, PORT_Z]);
    this.lead(el, [38, 0, PORT_Z], [15, 0, PORT_Z]);
    this.text(this.P(el, -7, 0, PORT_Z + 14), 'A', 'rgba(255,255,255,0.8)', 9);
    this.text(this.P(el, 12, 0, PORT_Z + 14), 'K', 'rgba(255,255,255,0.8)', 9);
    if (dead) this.text(this.P(el, 0, 0, 40), '× пробит', '#ffffff', 10);
    else if (world.showVectors && Math.abs(el.current) > 0.0005) this.text(this.P(el, 0, 0, 40), `${(Math.abs(el.current) * 1000).toFixed(1)} мА`, '#ffffff', 10);
  }

  b_led(el, world) {
    const dead = el.properties.blown;
    const g = dead ? 0 : el.glow();
    const v = Math.round(80 + Math.min(1, g) * 175);
    this.revolve(el, 'z', [0, 0, 0], [[0, 10], [6, 10]], 14, this.S(el, GRAY(58)));
    this.sphere(el, [0, 0, 15], 10, this.S(el, dead ? GRAY(48) : GRAY(v), { alpha: 0.92 }), { m: 6, n: 12 });
    this.lead(el, [-38, 0, PORT_Z], [-6, 0, 4]);
    this.lead(el, [38, 0, PORT_Z], [6, 0, 4]);
    if (g > 0.02) {
      this.dot(this.P(el, 0, 0, 15), 10 * (2 + g * 2.2), { glow: Math.min(0.9, g * 0.8), fill: 'glow', bias: -2, nopick: true }, el);
    }
    if (dead) this.text(this.P(el, 0, 0, 36), '× сгорел', '#ffffff', 10);
    else if (world.showVectors && Math.abs(el.current) > 0.0005) this.text(this.P(el, 0, 0, 36), `${(Math.abs(el.current) * 1000).toFixed(1)} мА`, '#ffffff', 10);
  }

  b_potentiometer(el) {
    const p = el.properties.position;
    this.box(el, [0, 8, 8], [34, 10, 8], this.S(el, GRAY(98)));
    const sx = -30 + 60 * p;
    this.box(el, [sx, 8, 19], [3.5, 5, 3.5], this.S(el, GRAY(240)), { maxCell: 100 });
    this.line(this.P(el, sx, 8, 22.5), this.P(el, 0, -26, PORT_Z), { color: '#ececec', lw: 2.2, world: true, nopick: true }, el);
    this.lead(el, [-42, 8, PORT_Z], [-34, 8, 8]);
    this.lead(el, [42, 8, PORT_Z], [34, 8, 8]);
    this.text(this.P(el, 0, 8, 28), `${el.properties.resistance} Ом`, 'rgba(255,255,255,0.8)', 10);
  }

  b_fuse(el, world) {
    const dead = el.properties.blown;
    this.revolve(el, 'x', [0, 0, PORT_Z], [[-23, 8], [23, 8]], 14, this.S(el, GRAY(210), { alpha: 0.28 }), { twoSided: true });
    for (const s of [-1, 1]) {
      this.revolve(el, 'x', [s * 25, 0, PORT_Z], [[-3, 8.6], [3, 8.6]], 12, this.S(el, GRAY(150)), { cap: this.S(el, GRAY(150)) });
    }
    const h = el.heat || 0;
    const wireColor = dead ? 'rgba(255,255,255,0.0)' : `rgb(${Math.round(180 + 75 * h)},${Math.round(180 - 60 * h)},${Math.round(180 - 130 * h)})`;
    if (dead) {
      this.line(this.P(el, -22, 0, PORT_Z), this.P(el, -5, 0, PORT_Z), { color: '#6a6a6a', lw: 1.6, nopick: true }, el);
      this.line(this.P(el, 5, 0, PORT_Z), this.P(el, 22, 0, PORT_Z), { color: '#6a6a6a', lw: 1.6, nopick: true }, el);
    } else {
      this.line(this.P(el, -22, 0, PORT_Z), this.P(el, 22, 0, PORT_Z), { color: wireColor, lw: 1.8, world: true, nopick: true }, el);
    }
    this.lead(el, [-40, 0, PORT_Z], [-28, 0, PORT_Z]);
    this.lead(el, [40, 0, PORT_Z], [28, 0, PORT_Z]);
    if (dead) this.text(this.P(el, 0, 0, 34), '× перегорел', '#ffffff', 10);
    else if (world.showVectors) this.text(this.P(el, 0, 0, 34), `${Math.abs(el.current).toFixed(2)} / ${el.properties.ratedCurrent} А`, '#ffffff', 10);
  }

  b_wire(el) {
    const a = this.W3(el.x1, el.y1, PORT_Z);
    const b = this.W3(el.x2, el.y2, PORT_Z);
    const len = V3.len(V3.sub(b, a));
    const arch = Math.min(18, len * 0.08);
    const N = Math.max(4, Math.min(16, Math.ceil(len / 24)));
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = V3.lerp(a, b, t);
      const lift = Math.sin(Math.PI * t) * arch;
      if (this.layout === 'wall') p[2] += lift;
      else p[1] += lift;
      pts.push(p);
    }
    const st = { color: el.selected ? '#ffffff' : '#c9c9c9', lw: 3.2, world: true, glow: 0 };
    for (let i = 0; i < N; i++) this.line(pts[i], pts[i + 1], st, el);
    // движущиеся заряды
    const cur = Math.abs(el.current || 0);
    if (cur > 0.01 && len > 30) {
      const count = Math.max(2, Math.floor(len / 26));
      const phase = el.chargePhase || 0;
      for (let i = 0; i < count; i++) {
        let t = ((i + (phase % 1 + 1) % 1) / count) % 1;
        const idx = Math.min(N - 1, Math.floor(t * N));
        const lt = t * N - idx;
        const p = V3.lerp(pts[idx], pts[idx + 1], lt);
        this.dot(p, 2.4, { fill: '#ffffff', bias: 4, nopick: true }, el);
      }
    }
    // свободные концы
    if (!el.portA) this.dot(a, 4, { fill: '#000000', stroke: '#ffffff', bias: 4, nopick: true }, el);
    if (!el.portB) this.dot(b, 4, { fill: '#000000', stroke: '#ffffff', bias: 4, nopick: true }, el);
  }

  // ---------- Сетка ----------
  drawGrid(ctx) {
    const ext = Math.max(500, this.dist * 0.95);
    let step = 50;
    while ((ext * 2) / step > 46) step *= 2;
    const cx = this.layout === 'wall' ? this.target[0] : this.target[0];
    const cy = this.layout === 'wall' ? this.target[1] : this.target[2];
    const x0 = Math.floor((cx - ext) / step) * step;
    const x1 = Math.ceil((cx + ext) / step) * step;
    const y0 = Math.floor((cy - ext) / step) * step;
    const y1 = Math.ceil((cy + ext) / step) * step;
    const plane = this.layout === 'wall' ? -80 : 0;
    const pt = (a, b) => (this.layout === 'wall' ? [a, b, plane] : [a, plane, b]);

    const draw = (alpha, lw, pred) => {
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      const seg = (p, q) => {
        let a = p;
        let b = q;
        const za = V3.dot(V3.sub(a, this.cam), this.f);
        const zb = V3.dot(V3.sub(b, this.cam), this.f);
        if (za < NEAR && zb < NEAR) return;
        if (za < NEAR) a = V3.lerp(a, b, (NEAR - za) / (zb - za));
        else if (zb < NEAR) b = V3.lerp(a, b, (NEAR - za) / (zb - za));
        const qa = this.project(a);
        const qb = this.project(b);
        if (!qa || !qb) return;
        ctx.moveTo(qa[0], qa[1]);
        ctx.lineTo(qb[0], qb[1]);
      };
      for (let x = x0; x <= x1; x += step) if (pred(x)) seg(pt(x, y0), pt(x, y1));
      for (let y = y0; y <= y1; y += step) if (pred(y)) seg(pt(x0, y), pt(x1, y));
      ctx.stroke();
    };
    draw(0.05, 1, (v) => Math.round(v / step) % 5 !== 0 && v !== 0);
    draw(0.11, 1, (v) => Math.round(v / step) % 5 === 0 && v !== 0);
    draw(0.26, 1.2, (v) => v === 0);
  }

  // ---------- Главная отрисовка ----------
  render(world, segments) {
    const canvas = this.canvas;
    const ctx = this.ctx;
    this.world = world;
    const layout = View3D.layoutFor(world.theme);
    if (layout !== this.layout) this.reset(world.theme);
    this.showVectors = world.showVectors;

    const W = canvas.width;
    const H = canvas.height;
    if (this.needsFrame && this.frame(world)) this.needsFrame = false;
    this.setupCamera(W, H);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    this.drawGrid(ctx);

    this.buildScene(world, segments);
    const items = this.items;
    items.sort((a, b) => b.depth - a.depth);
    this.sorted = items;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const it of items) {
      switch (it.t) {
        case 'poly': {
          ctx.globalAlpha = it.alpha;
          ctx.beginPath();
          ctx.moveTo(it.pts[0][0], it.pts[0][1]);
          for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i][0], it.pts[i][1]);
          ctx.closePath();
          ctx.fillStyle = it.fill;
          ctx.fill();
          ctx.strokeStyle = it.edge || it.fill;
          ctx.lineWidth = it.edge ? it.lw : 0.9;
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'line': {
          ctx.globalAlpha = it.alpha;
          ctx.strokeStyle = it.color;
          const px = it.world ? Math.min(14, Math.max(1.2, (it.lw * this.focal) / Math.max(it.depth, NEAR))) : it.lw;
          ctx.lineWidth = px;
          if (it.glow) {
            ctx.shadowColor = it.color;
            ctx.shadowBlur = it.glow;
          }
          if (it.dash) ctx.setLineDash(it.dash);
          ctx.beginPath();
          ctx.moveTo(it.x1, it.y1);
          ctx.lineTo(it.x2, it.y2);
          ctx.stroke();
          if (it.dash) ctx.setLineDash([]);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          break;
        }
        case 'dot': {
          ctx.globalAlpha = it.alpha;
          if (it.fill === 'glow') {
            const gr = ctx.createRadialGradient(it.x, it.y, 2, it.x, it.y, it.r);
            gr.addColorStop(0, `rgba(255,255,255,${it.glow})`);
            gr.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
            if (it.fill) {
              if (it.glow) {
                ctx.shadowColor = it.fill;
                ctx.shadowBlur = it.glow;
              }
              ctx.fillStyle = it.fill;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
            if (it.stroke) {
              ctx.strokeStyle = it.stroke;
              ctx.lineWidth = it.lw;
              ctx.stroke();
            }
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'text': {
          ctx.font = `600 ${it.size}px Inter, system-ui, sans-serif`;
          ctx.textAlign = it.align;
          ctx.textBaseline = 'middle';
          ctx.fillStyle = it.color;
          ctx.fillText(it.str, it.x, it.y);
          break;
        }
      }
    }
  }

  // ---------- Выбор объектов мышью ----------
  static pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  static distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // Возвращает { kind: 'handle'|'port'|'element', el, index?, part? } или null
  pickAt(sx, sy) {
    const list = this.sorted;
    // 1. ручки и клеммы (мелкие цели) — приоритет
    for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i];
      if (it.t !== 'dot' || !it.meta) continue;
      if (!it.meta.handle && it.meta.port === undefined && !it.meta.twist) continue;
      if (Math.hypot(sx - it.x, sy - it.y) <= it.r + 5) {
        if (it.meta.twist) return { kind: 'twist', el: it.owner };
        return it.meta.handle ? { kind: 'handle', el: it.owner } : { kind: 'port', el: it.owner, index: it.meta.port };
      }
    }
    // 2. тела: ближайший к камере элемент; «низкоприоритетные» (зоны) — в последнюю очередь
    let low = null;
    for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i];
      if (it.nopick || !it.owner || it.owner.ghost) continue;
      let hit = false;
      if (it.t === 'poly') hit = View3D.pointInPoly(sx, sy, it.pts);
      else if (it.t === 'line') {
        const px = it.world ? (it.lw * this.focal) / Math.max(it.depth, NEAR) : it.lw;
        hit = View3D.distToSegment(sx, sy, it.x1, it.y1, it.x2, it.y2) <= Math.max(6, px / 2 + 3);
      } else if (it.t === 'dot' && it.fill && it.fill !== 'glow') hit = Math.hypot(sx - it.x, sy - it.y) <= it.r + 3;
      if (!hit) continue;
      const res = { kind: 'element', el: it.owner, part: it.meta && it.meta.part };
      if (it.meta && it.meta.low) {
        if (!low) low = res;
        continue;
      }
      return res;
    }
    return low;
  }

  // Ближайшая клемма на экране
  nearestPort(sx, sy, maxPx = 20) {
    let best = null;
    let bd = maxPx;
    for (const p of this.portScreen) {
      const d = Math.hypot(sx - p.x, sy - p.y);
      if (d <= bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }
}
