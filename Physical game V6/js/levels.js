// ============================================================
//  УРОВНИ — задачи на сборку экспериментов
//
//  Каждый уровень описывает:
//    id, theme, title, short   — заголовок и краткий текст для карточки
//    brief, hint               — условие задачи и подсказка
//    allowed                   — типы элементов, доступных в палитре
//    running                   — запускать ли симуляцию сразу
//    setup(world) -> refs      — расстановка зафиксированных элементов
//    goals[]                   — условия победы: { text, check(world, refs), latch }
//
//  latch: true — условие «запоминается» (для событий вроде удара).
//  Уровень пройден, когда все условия выполнены без перерыва HOLD_TIME секунд.
// ============================================================

const HOLD_TIME = 0.8;

// ---------- Вспомогательные функции ----------

// Зафиксировать элемент: нельзя двигать и удалять.
//   props  — запретить менять параметры в инспекторе
//   rotate — оставить возможность поворота
function lockEl(el, opts = {}) {
  el.locked = true;
  if (!opts.rotate) el.rotatable = false;
  if (opts.props) el.propsLocked = true;
  return el;
}

function lockedWire(world, elA, portA, elB, portB) {
  const w = connectPorts(world, elA, portA, elB, portB);
  w.locked = true;
  return w;
}

const firstOf = (world, cls) => world.elements.find((e) => e instanceof cls) || null;
const countColors = (screen) => new Set(screen.hits.map((h) => h.color)).size;

// ---------- Метка цели (в физике не участвует, выделить нельзя) ----------
class TargetZone extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'target';
    this.category = 'level';
    this.label = 'Цель';
    this.width = 120;
    this.height = 50;
    this.ghost = true;
    this.locked = true;
    this.rotatable = false;
    this.reached = false;
  }

  contains(wx, wy) {
    return Math.abs(wx - this.x) <= this.width / 2 && Math.abs(wy - this.y) <= this.height / 2;
  }

  render(ctx) {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.reached ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = this.reached ? 2.4 : 1.4;
    ctx.setLineDash([8, 6]);
    ctx.fillRect(-hw, -hh, this.width, this.height);
    ctx.strokeRect(-hw, -hh, this.width, this.height);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ЦЕЛЬ', 0, 0);
    ctx.restore();
  }
}

// ============================================================
//  СПИСОК УРОВНЕЙ
// ============================================================

const LEVELS = [
  // ------------------------- МЕХАНИКА -------------------------
  {
    id: 'mech-1',
    theme: 'mechanics',
    title: 'Скатись в цель',
    short: 'Направь шар в мишень наклонной плоскостью.',
    brief:
      'Шар упадёт вертикально и останется на месте. Поставь под него наклонную плоскость так, чтобы он скатился в зону цели у стенки. Затем нажми «Старт».',
    hint: 'Добавь «Плоскость», перетащи её под шар и поверни на 15–25° (ручка сверху или кнопки углов). Наклон вниз вправо.',
    allowed: ['ramp'],
    running: false,
    setup(world) {
      const floor = lockEl(new Ramp(0, 150));
      floor.properties.length = 700;
      world.add(floor);

      const wall = lockEl(new Ramp(338, 90));
      wall.properties.length = 120;
      wall.rotation = Math.PI / 2;
      world.add(wall);

      const target = new TargetZone(240, 115);
      target.width = 140;
      target.height = 50;
      world.add(target);

      const ball = lockEl(new Ball(-240, -100), { props: true });
      world.add(ball);
      return { ball, target };
    },
    goals: [
      {
        text: 'Шар лежит в зоне цели',
        check(world, r) {
          const inside = r.target.contains(r.ball.x, r.ball.y);
          r.target.reached = inside;
          return inside;
        },
      },
    ],
  },

  {
    id: 'mech-2',
    theme: 'mechanics',
    title: 'Пружина с периодом 1 с',
    short: 'Подбери жёсткость и массу груза.',
    brief:
      'Период колебаний груза на пружине равен T = 2π√(m/k). Настрой жёсткость и массу так, чтобы T = 1,0 с (допуск ±0,06 с), затем запусти симуляцию.',
    hint: 'Выбери пружину и измени k и m. Например, m = 2 кг и k = 80 Н/м дают T ≈ 0,99 с.',
    allowed: [],
    running: false,
    setup(world) {
      const spring = lockEl(new Spring(0, -140));
      spring.properties.stiffness = 40;
      spring.properties.mass = 2;
      spring.properties.damping = 0.1;
      spring.properties.displacement = 60;
      spring.disp = 60;
      world.add(spring);
      return { spring };
    },
    goals: [
      {
        text: 'Период T = 1,0 с (±0,06)',
        check(world, r) {
          const T = 2 * Math.PI * Math.sqrt(r.spring.properties.mass / r.spring.properties.stiffness);
          return Math.abs(T - 1.0) <= 0.06;
        },
      },
      {
        text: 'Груз прошёл положение равновесия',
        latch: true,
        check(world, r) {
          return r.spring.disp < -5;
        },
      },
    ],
  },

  {
    id: 'mech-3',
    theme: 'mechanics',
    title: 'Закон сохранения импульса',
    short: 'Останови шар ударом о другой шар.',
    brief:
      'Шар A (3 кг) летит на покоящийся шар B. Подбери массу шара B так, чтобы после удара шар A остановился, а B покатился дальше. Запусти опыт кнопкой «Старт».',
    hint: 'При упругом ударе тело останавливается, если сталкивается с телом такой же массы. Выбери шар B и задай ему массу 3 кг.',
    allowed: [],
    running: false,
    setup(world) {
      const floor = lockEl(new Ramp(0, 100));
      floor.properties.length = 600;
      floor.properties.friction = 0.01;
      world.add(floor);
      for (const x of [-295, 295]) {
        const wall = lockEl(new Ramp(x, 35));
        wall.properties.length = 140;
        wall.rotation = Math.PI / 2;
        world.add(wall);
      }

      const a = lockEl(new Ball(-210, 62), { props: true });
      a.properties.mass = 3;
      a.properties.radius = 27;
      a.properties.restitution = 0.96;
      a.properties.vx = 330;
      a.vx = 330;
      world.add(a);

      const b = lockEl(new Ball(-20, 67));
      b.properties.mass = 1.5;
      b.properties.radius = 22;
      b.properties.restitution = 0.96;
      world.add(b);
      return { a, b };
    },
    goals: [
      {
        text: 'Шар A остановился, шар B покатился',
        latch: true,
        check(world, r) {
          return Math.abs(r.a.vx) < 20 && r.b.vx > 200;
        },
      },
    ],
  },

  {
    id: 'mech-4',
    theme: 'mechanics',
    title: 'Застрявший брусок',
    short: 'Заставь брусок съехать в цель.',
    brief:
      'Из-за трения брусок не скользит по плоскости. Измени наклон плоскости или коэффициент трения бруска так, чтобы он съехал и остановился в зоне цели. Условие скольжения: μ < tg α.',
    hint: 'Поверни плоскость круче (например, до 30°) или выбери брусок и уменьши его трение μ. Трение между телами берётся как среднее.',
    allowed: [],
    running: false,
    setup(world) {
      const floor = lockEl(new Ramp(0, 190));
      floor.properties.length = 800;
      world.add(floor);

      const ramp = lockEl(new Ramp(-130, 20), { rotate: true, props: true });
      ramp.properties.length = 320;
      ramp.properties.friction = 0.5;
      ramp.rotation = 0.3;
      world.add(ramp);

      const target = new TargetZone(160, 152);
      target.width = 220;
      target.height = 56;
      world.add(target);

      // положение рассчитано так, чтобы брусок лежал на поверхности плоскости
      const block = lockEl(new Block(-196, -36));
      block.rotation = 0.3;
      block.properties.mass = 2;
      block.properties.friction = 0.3;
      world.add(block);
      return { block, target, ramp };
    },
    goals: [
      {
        text: 'Брусок остановился в зоне цели',
        check(world, r) {
          const inside = r.target.contains(r.block.x, r.block.y) && Math.hypot(r.block.vx, r.block.vy) < 25;
          r.target.reached = inside;
          return inside;
        },
      },
    ],
  },

  {
    id: 'mech-5',
    theme: 'mechanics',
    title: 'Маятник на 3 секунды',
    short: 'Подбери длину нити для нужного периода.',
    brief:
      'Период маятника T = 2π√(L/g). Подбери длину нити так, чтобы на Земле период был 3,0 с (±0,1 с), и запусти симуляцию. Можно проверить, как изменится период на Луне.',
    hint: 'Нужна длина L = gT²/4π² ≈ 2,24 м, то есть около 155 пкс (70 пкс = 1 м). Выбери маятник и подвигай ползунок длины.',
    allowed: [],
    running: false,
    setup(world) {
      const pend = lockEl(new Pendulum(0, -130));
      pend.properties.length = 175;
      pend.properties.angle = 30;
      pend.properties.damping = 0.01;
      pend.theta = (30 * Math.PI) / 180;
      world.add(pend);
      return { pend };
    },
    goals: [
      {
        text: 'Период T = 3,0 с (±0,1)',
        check(world, r) {
          const L = r.pend.properties.length / PX_PER_METER;
          const g = world.gravity > 0.01 ? world.gravity : 0.01;
          const T = 2 * Math.PI * Math.sqrt(L / g);
          return Math.abs(T - 3.0) <= 0.1;
        },
      },
      {
        text: 'Маятник качнулся в другую сторону',
        latch: true,
        check(world, r) {
          return r.pend.theta < -0.05;
        },
      },
    ],
  },

  {
    id: 'mech-6',
    theme: 'mechanics',
    title: 'Маятник Вильберфорса (3D)',
    short: 'Перекачай энергию в кручение и обратно.',
    brief:
      'Включи режим 3D (переключатель сверху) и нажми «Старт». Груз на пружине будет не только качаться вверх-вниз, но и закручиваться: энергия перетекает из растяжения в кручение и возвращается обратно. Дождись, пока груз закрутится больше чем на 70°, а затем энергия вернётся обратно в вертикальные колебания.',
    hint: 'В 2D кручения нет, оно существует только в 3D. Если закрутка получается слабой, выбери пружину и в блоке «3D · кручение» включи автонастройку резонанса: частоты растяжения и кручения должны совпадать.',
    allowed: [],
    running: false,
    setup(world) {
      const spring = lockEl(new Spring(0, -150));
      spring.properties.stiffness = 40;
      spring.properties.mass = 2;
      spring.properties.damping = 0.05;
      spring.properties.displacement = 70;
      spring.disp = 70;
      world.add(spring);
      return { spring, seen: false };
    },
    goals: [
      {
        text: 'Груз закрутился больше чем на 70° (режим 3D)',
        latch: true,
        check(world, r) {
          const ok = world.mode3d && Math.abs(r.spring.twist) > 1.22;
          if (ok) r.seen = true;
          return ok;
        },
      },
      {
        text: 'Энергия вернулась из кручения в растяжение',
        latch: true,
        check(world, r) {
          // доля энергии кручения не зависит от фазы колебаний, в отличие от мгновенного угла
          const s = r.spring;
          const twistE = 0.5 * s.inertiaEff() * s.twistVel * s.twistVel + 0.5 * s.properties.torsion * s.twist * s.twist;
          const total = s.getEnergy().total;
          return r.seen && total > 0 && twistE / total < 0.08;
        },
      },
    ],
  },

  // -------------------------- ОПТИКА --------------------------
  {
    id: 'opt-1',
    theme: 'optics',
    title: 'Поверни луч',
    short: 'Попади лазером в экран на потолке.',
    brief: 'Лазер светит вправо, а экран находится над ним. Поставь на пути луча плоское зеркало под нужным углом, чтобы луч попал на экран.',
    hint: 'Закон отражения: угол падения равен углу отражения. Чтобы повернуть луч на 90°, наклони зеркало на 45°.',
    allowed: ['mirror'],
    running: true,
    setup(world) {
      const src = lockEl(new LightSource(-230, 70), { props: true });
      src.properties.kind = 'laser';
      src.properties.spectrum = 'green';
      world.add(src);

      const screen = lockEl(new OpticalScreen(60, -130), { props: true });
      screen.properties.height = 160;
      screen.rotation = Math.PI / 2;
      world.add(screen);
      return { screen };
    },
    goals: [
      {
        text: 'Луч попадает на экран',
        check(world, r) {
          return r.screen.hits.length > 0;
        },
      },
    ],
  },

  {
    id: 'opt-2',
    theme: 'optics',
    title: 'Собери пучок в точку',
    short: 'Сфокусируй параллельный пучок линзой.',
    brief: 'Широкий параллельный пучок попадает на экран. Поставь собирающую линзу так, чтобы все лучи сошлись в одну точку на экране.',
    hint: 'Параллельный пучок собирается в фокусе. Экран стоит на x = 200, при F = 140 линзу нужно поставить на 140 пкс левее экрана.',
    allowed: ['lens'],
    running: true,
    setup(world) {
      const src = lockEl(new LightSource(-250, 0), { props: true });
      src.properties.kind = 'beam';
      src.properties.spectrum = 'cyan';
      src.properties.rayCount = 7;
      src.properties.spread = 40;
      world.add(src);

      const screen = lockEl(new OpticalScreen(200, 0), { props: true });
      screen.properties.height = 120;
      world.add(screen);
      return { screen };
    },
    goals: [
      {
        text: 'На экран попадает не менее 5 лучей',
        check(world, r) {
          return r.screen.hits.length >= 5;
        },
      },
      {
        text: 'Лучи сошлись в точку (разброс < 10 пкс)',
        check(world, r) {
          const hits = r.screen.hits;
          if (hits.length < 5) return false;
          const xs = hits.map((h) => h.x);
          const ys = hits.map((h) => h.y);
          const spread = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
          return spread < 10;
        },
      },
    ],
  },

  {
    id: 'opt-3',
    theme: 'optics',
    title: 'Разложи белый свет',
    short: 'Получи радугу с помощью призмы.',
    brief: 'Узкий пучок белого света идёт к экрану. Поставь на его пути призму и подбери положение и угол так, чтобы на экране появилось не менее 5 цветов спектра.',
    hint: 'Помести призму прямо на пути пучка. Поворачивай её, пока лучи не разойдутся веером и не попадут на экран.',
    allowed: ['prism'],
    running: true,
    setup(world) {
      const src = lockEl(new LightSource(-250, 28), { props: true });
      src.properties.kind = 'beam';
      src.properties.spectrum = 'white';
      src.properties.rayCount = 3;
      src.properties.spread = 14;
      src.rotation = -0.14;
      world.add(src);

      const screen = lockEl(new OpticalScreen(140, 130), { props: true });
      screen.properties.height = 300;
      screen.rotation = Math.PI / 4;
      world.add(screen);
      return { screen };
    },
    goals: [
      {
        text: 'На экране не менее 5 разных цветов',
        check(world, r) {
          return countColors(r.screen) >= 5;
        },
      },
    ],
  },

  {
    id: 'opt-4',
    theme: 'optics',
    title: 'Выдели зелёный',
    short: 'Оставь на экране только зелёный свет.',
    brief: 'Лазер даёт белый свет. Поставь светофильтр так, чтобы на экране осталась только зелёная точка.',
    hint: 'Фильтр ставится прямо на луч. Цвет, который он пропускает, выбирается в панели справа.',
    allowed: ['color-filter'],
    running: true,
    setup(world) {
      const src = lockEl(new LightSource(-230, 0), { props: true });
      src.properties.kind = 'laser';
      src.properties.spectrum = 'white';
      world.add(src);

      const screen = lockEl(new OpticalScreen(200, 0), { props: true });
      screen.properties.height = 160;
      world.add(screen);
      return { screen };
    },
    goals: [
      {
        text: 'На экране есть зелёная точка',
        check(world, r) {
          return r.screen.hits.some((h) => h.color === SOURCE_COLOR_MAP.green);
        },
      },
      {
        text: 'Других цветов на экране нет',
        check(world, r) {
          return r.screen.hits.length > 0 && r.screen.hits.every((h) => h.color === SOURCE_COLOR_MAP.green);
        },
      },
    ],
  },

  {
    id: 'opt-5',
    theme: 'optics',
    title: 'Раздели пучок',
    short: 'Направь свет сразу на два экрана.',
    brief: 'Один лазерный луч нужно направить сразу на два экрана: правый и нижний. Одним зеркалом это не сделать, нужен элемент, который делит луч.',
    hint: 'Делитель пучка отражает часть света и пропускает остальное. Поставь его на луч и поверни на −45° (кнопка −45°).',
    allowed: ['beam-splitter'],
    running: true,
    setup(world) {
      const src = lockEl(new LightSource(-250, 0), { props: true });
      src.properties.kind = 'laser';
      src.properties.spectrum = 'cyan';
      world.add(src);

      const right = lockEl(new OpticalScreen(230, 0), { props: true });
      right.properties.height = 140;
      world.add(right);

      const bottom = lockEl(new OpticalScreen(-40, 140), { props: true });
      bottom.properties.height = 260;
      bottom.rotation = Math.PI / 2;
      world.add(bottom);
      return { right, bottom };
    },
    goals: [
      {
        text: 'Свет попадает на правый экран',
        check(world, r) {
          return r.right.hits.length > 0;
        },
      },
      {
        text: 'Свет попадает на нижний экран',
        check(world, r) {
          return r.bottom.hits.length > 0;
        },
      },
    ],
  },

  // ----------------------- ЭЛЕКТРИЧЕСТВО -----------------------
  {
    id: 'el-1',
    theme: 'electricity',
    title: 'Замкни цепь',
    short: 'Зажги лампу от батареи.',
    brief: 'Соедини батарею и лампу проводами в замкнутую цепь. Потяни провод от клеммы ● одного прибора к клемме другого.',
    hint: 'Ток течёт по замкнутому контуру: «+» батареи → лампа → «−» батареи. Нужны два провода.',
    allowed: ['wire'],
    running: true,
    setup(world) {
      const bat = lockEl(new Battery(-120, 70), { props: true });
      bat.properties.emf = 12;
      world.add(bat);
      const lamp = lockEl(new Lamp(120, -50), { props: true });
      lamp.properties.resistance = 12;
      lamp.properties.maxPower = 20;
      world.add(lamp);
      return { lamp };
    },
    goals: [
      {
        text: 'Лампа светится (P > 1 Вт)',
        check(world, r) {
          return r.lamp.power > 1;
        },
      },
    ],
  },

  {
    id: 'el-2',
    theme: 'electricity',
    title: 'Ключ в цепи',
    short: 'Включи в цепь выключатель.',
    brief: 'Собери цепь батарея, ключ и лампа, соединив всё последовательно. Ключ должен быть замкнут: клик по нему переключает состояние.',
    hint: 'Добавь «Ключ» из палитры и протяни провода так, чтобы ток шёл через него. Затем кликни по ключу.',
    allowed: ['switch', 'wire'],
    running: true,
    setup(world) {
      const bat = lockEl(new Battery(-130, 90), { props: true });
      bat.properties.emf = 12;
      world.add(bat);
      const lamp = lockEl(new Lamp(130, -60), { props: true });
      lamp.properties.resistance = 12;
      lamp.properties.maxPower = 20;
      world.add(lamp);
      return { lamp };
    },
    goals: [
      {
        text: 'Ключ стоит в цепи и замкнут',
        check(world) {
          const sw = firstOf(world, Switch);
          return !!sw && sw.properties.closed && Math.abs(sw.current) > 0.05;
        },
      },
      {
        text: 'Лампа светится (P > 1 Вт)',
        check(world, r) {
          return r.lamp.power > 1;
        },
      },
    ],
  },

  {
    id: 'el-3',
    theme: 'electricity',
    title: 'Измерь ток и напряжение',
    short: 'Подключи амперметр и вольтметр.',
    brief: 'Резистор 24 Ом подключён к батарее 12 В, но цепь разомкнута. Замкни её через амперметр и подключи вольтметр параллельно резистору. Приборы должны показать ≈ 0,5 А и ≈ 12 В.',
    hint: 'Амперметр включается последовательно (в разрыв), вольтметр параллельно (к двум концам резистора). Закон Ома: I = U/R.',
    allowed: ['ammeter', 'voltmeter', 'wire'],
    running: true,
    setup(world) {
      const bat = lockEl(new Battery(-130, 100), { props: true });
      bat.properties.emf = 12;
      world.add(bat);
      const res = lockEl(new Resistor(120, -40), { props: true });
      res.properties.resistance = 24;
      world.add(res);
      lockedWire(world, bat, 1, res, 0);
      return {};
    },
    goals: [
      {
        text: 'Амперметр показывает ≈ 0,5 А',
        check(world) {
          const a = firstOf(world, Ammeter);
          return !!a && Math.abs(Math.abs(a.current) - 0.5) < 0.06;
        },
      },
      {
        text: 'Вольтметр показывает ≈ 12 В',
        check(world) {
          const v = firstOf(world, Voltmeter);
          return !!v && Math.abs(Math.abs(v.voltageDrop) - 12) < 0.5;
        },
      },
    ],
  },

  {
    id: 'el-4',
    theme: 'electricity',
    title: 'Две лампы параллельно',
    short: 'Соедини лампы так, чтобы обе горели ярко.',
    brief: 'Две лампы по 12 Ом нужно подключить к батарее 12 В параллельно: тогда каждая получит полное напряжение, а ток источника будет около 2 А.',
    hint: 'У параллельных ламп общие точки подключения: обе «левые» клеммы идут к одному полюсу батареи, обе «правые» к другому.',
    allowed: ['wire'],
    running: true,
    setup(world) {
      const bat = lockEl(new Battery(-150, 110), { props: true });
      bat.properties.emf = 12;
      world.add(bat);
      const l1 = lockEl(new Lamp(80, -70), { props: true });
      l1.properties.resistance = 12;
      l1.properties.maxPower = 20;
      world.add(l1);
      const l2 = lockEl(new Lamp(80, 30), { props: true });
      l2.properties.resistance = 12;
      l2.properties.maxPower = 20;
      world.add(l2);
      return { bat, l1, l2 };
    },
    goals: [
      {
        text: 'Обе лампы светятся (P > 5 Вт)',
        check(world, r) {
          return r.l1.power > 5 && r.l2.power > 5;
        },
      },
      {
        text: 'Ток источника больше 1,8 А',
        check(world, r) {
          return Math.abs(r.bat.current) > 1.8;
        },
      },
    ],
  },

  {
    id: 'el-5',
    theme: 'electricity',
    title: 'Делитель напряжения',
    short: 'Получи 4 В из 12 В.',
    brief: 'Батарея 12 В подключена к резистору R₁ = 30 Ом. Добавь второй резистор и вольтметр так, чтобы вольтметр показал 4 В (±0,3 В).',
    hint: 'Вольтметр ставится параллельно R₂. U₂ = E·R₂/(R₁ + R₂), значит R₂ = 15 Ом. Сопротивление меняется в панели справа.',
    allowed: ['resistor', 'voltmeter', 'wire'],
    running: true,
    setup(world) {
      const bat = lockEl(new Battery(-140, 100), { props: true });
      bat.properties.emf = 12;
      world.add(bat);
      const r1 = lockEl(new Resistor(60, -50), { props: true });
      r1.properties.resistance = 30;
      world.add(r1);
      lockedWire(world, bat, 1, r1, 0);
      return {};
    },
    goals: [
      {
        text: 'Вольтметр показывает 4 В (±0,3)',
        check(world) {
          const v = firstOf(world, Voltmeter);
          return !!v && Math.abs(Math.abs(v.voltageDrop) - 4) < 0.3;
        },
      },
    ],
  },

  {
    id: 'el-6',
    theme: 'electricity',
    title: 'Не сожги светодиод',
    short: 'Подбери резистор для светодиода.',
    brief: 'Светодиод открывается при 2 В и сгорает при токе больше 35 мА. Подключи его к батарее 6 В через резистор так, чтобы он светился и остался цел.',
    hint: 'R = (E − Uпр)/I = (6 − 2)/0,03 ≈ 130 Ом и больше. Если светодиод сгорел, нажми «Заново». Анод (A) подключается к «+».',
    allowed: ['resistor', 'wire'],
    running: true,
    setup(world) {
      const bat = lockEl(new Battery(-120, 90), { props: true });
      bat.properties.emf = 6;
      world.add(bat);
      const led = lockEl(new LED(100, -40), { props: true });
      world.add(led);
      return { led };
    },
    goals: [
      {
        text: 'Светодиод светится',
        check(world, r) {
          return r.led.conducting && r.led.current > 0.003;
        },
      },
      {
        text: 'Светодиод цел',
        check(world, r) {
          return !r.led.properties.blown;
        },
      },
    ],
  },

  {
    id: 'el-7',
    theme: 'electricity',
    title: 'Заряди конденсатор',
    short: 'Накопи на конденсаторе 9 В.',
    brief: 'Резистор 10 Ом подключён к батарее 12 В. Добавь конденсатор и замкни цепь. Конденсатор заряжается по закону U = E(1 − e^(−t/RC)), нужно дождаться 9 В.',
    hint: 'Конденсатор включается последовательно с резистором. Положительная клемма «+» идёт к резистору. Заряд идёт несколько секунд.',
    allowed: ['capacitor', 'voltmeter', 'wire'],
    running: true,
    setup(world) {
      const bat = lockEl(new Battery(-140, 100), { props: true });
      bat.properties.emf = 12;
      world.add(bat);
      const res = lockEl(new Resistor(80, -50), { props: true });
      res.properties.resistance = 10;
      world.add(res);
      lockedWire(world, bat, 1, res, 0);
      return {};
    },
    goals: [
      {
        text: 'Напряжение на конденсаторе ≥ 9 В',
        check(world) {
          const c = firstOf(world, Capacitor);
          return !!c && c.vc >= 9;
        },
      },
    ],
  },
];

// ============================================================
//  Проверка условий уровня
// ============================================================

function createLevelState(level, refs) {
  return {
    level,
    refs: refs || {},
    latched: level.goals.map(() => false),
    ok: level.goals.map(() => false),
    stable: 0,
    done: false,
  };
}

function resetLevelState(state) {
  state.latched.fill(false);
  state.ok.fill(false);
  state.stable = 0;
  state.done = false;
}

// Возвращает true, если изменился набор выполненных условий или уровень только что пройден
function evaluateLevel(state, world, dt) {
  let changed = false;
  state.level.goals.forEach((g, i) => {
    let v = false;
    try {
      v = !!g.check(world, state.refs);
    } catch (e) {
      v = false;
    }
    if (g.latch && v) state.latched[i] = true;
    const ok = g.latch ? state.latched[i] : v;
    if (ok !== state.ok[i]) {
      state.ok[i] = ok;
      changed = true;
    }
  });

  if (state.ok.every(Boolean)) {
    state.stable += dt;
    if (!state.done && state.stable >= HOLD_TIME) {
      state.done = true;
      changed = true;
    }
  } else {
    state.stable = 0;
  }
  return changed;
}

// ============================================================
//  Прогресс (localStorage; если недоступен, живёт только в памяти)
// ============================================================

const LevelProgress = {
  KEY: 'fizikum.levels.v1',
  memory: {},

  load() {
    try {
      const raw = window.localStorage.getItem(this.KEY);
      if (raw) this.memory = JSON.parse(raw) || {};
    } catch (e) {
      /* хранилище недоступно */
    }
    return this.memory;
  },

  isDone(id) {
    return !!this.memory[id];
  },

  markDone(id) {
    this.memory[id] = true;
    try {
      window.localStorage.setItem(this.KEY, JSON.stringify(this.memory));
    } catch (e) {
      /* хранилище недоступно */
    }
  },

  doneCount() {
    return LEVELS.filter((l) => this.memory[l.id]).length;
  },
};
