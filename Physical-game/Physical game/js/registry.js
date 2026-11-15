// ============================================================
//  Реестр элементов по разделам и готовые лабораторные работы (Пресеты)
// ============================================================

const REGISTRY = {
  mechanics: [
    { cls: Ball,     label: 'Упругий шар',   sub: 'Качение и удары',      icon: '🔴' },
    { cls: Block,    label: 'Брусок',        sub: 'Трение и скольжение',  icon: '🟦' },
    { cls: Ramp,     label: 'Плоскость',     sub: 'Опора / наклонная',    icon: '📐' },
    { cls: Spring,   label: 'Пружина Гука',  sub: 'Упругие колебания',    icon: '〰️' },
    { cls: Pendulum, label: 'Маятник',       sub: 'Гармонический подвес', icon: '⏱️' },
  ],
  optics: [
    { cls: LightSource,   label: 'Источник света', sub: 'Пучок / Лазер / Веер', icon: '🔦' },
    { cls: Lens,          label: 'Линза',          sub: 'Собирающая и рассеив.', icon: '🔍' },
    { cls: Mirror,        label: 'Зеркало',        sub: 'Плоское и сферическое', icon: '🪞' },
    { cls: Prism,         label: 'Призма',         sub: 'Преломление и радуга',  icon: '💎' },
    { cls: OpticalScreen, label: 'Экран',          sub: 'Детектор лучей',        icon: '🖥️' },
  ],
  electricity: [
    { cls: Battery,   label: 'Батарея ЭДС', sub: 'Источник напряжения', icon: '🔋' },
    { cls: Lamp,      label: 'Лампа',       sub: 'Светится от мощности', icon: '💡' },
    { cls: Resistor,  label: 'Резистор',    sub: 'Омическая нагрузка',   icon: '⏛' },
    { cls: Switch,    label: 'Ключ',        sub: 'Клик — замкнуть цепь', icon: '🕹️' },
    { cls: Ammeter,   label: 'Амперметр',   sub: 'Измерение тока (А)',   icon: '🧭' },
    { cls: Voltmeter, label: 'Вольтметр',   sub: 'Измерение напряж. (В)', icon: '📟' },
    { cls: Wire,      label: 'Провод',      sub: 'Или тяни от клеммы ●', icon: '🔌' },
  ],
};

function connectPorts(world, elA, portIndexA, elB, portIndexB) {
  const w = new Wire(0, 0);
  w.portA = { elId: elA.id, portIndex: portIndexA };
  w.portB = { elId: elB.id, portIndex: portIndexB };
  w.syncEndpoints(world);
  world.add(w);
  return w;
}

const PRESETS = {
  mechanics: [
    {
      id: 'inclined_plane',
      name: '📐 Скатывание с наклонной плоскости',
      build(world) {
        const ramp1 = new Ramp(-150, -35);
        ramp1.properties.length = 340;
        ramp1.rotation = 0.36; // ~20.6°
        world.add(ramp1);

        const floor = new Ramp(130, 110);
        floor.properties.length = 380;
        floor.rotation = 0;
        world.add(floor);

        const stopWall = new Ramp(315, 55);
        stopWall.properties.length = 120;
        stopWall.rotation = Math.PI / 2;
        world.add(stopWall);

        const ball = new Ball(-260, -135);
        ball.properties.mass = 1.5;
        ball.properties.restitution = 0.78;
        world.add(ball);

        const block = new Block(-145, -85);
        block.rotation = 0.36;
        block.properties.mass = 2.5;
        block.properties.friction = 0.12;
        world.add(block);

        const pend = new Pendulum(120, -105);
        pend.properties.length = 185;
        pend.properties.angle = 0;
        pend.theta = 0;
        world.add(pend);

        world.select(ball);
      },
    },
    {
      id: 'oscillators',
      name: '⏱️ Маятник и пружина Гука (Энергия)',
      build(world) {
        const pend = new Pendulum(-130, -140);
        pend.properties.length = 200;
        pend.properties.angle = 45;
        pend.properties.mass = 2.5;
        pend.properties.damping = 0.02;
        pend.theta = (45 * Math.PI) / 180;
        world.add(pend);

        const spring = new Spring(130, -150);
        spring.properties.stiffness = 45;
        spring.properties.mass = 2.0;
        spring.properties.restLength = 140;
        spring.properties.displacement = 60;
        spring.properties.damping = 0.15;
        spring.disp = 60;
        world.add(spring);

        world.select(pend);
      },
    },
    {
      id: 'collisions',
      name: '🔴 Упругие соударения и передача импульса',
      build(world) {
        const floor = new Ramp(0, 100);
        floor.properties.length = 600;
        floor.properties.friction = 0.01;
        world.add(floor);

        const leftWall = new Ramp(-295, 35);
        leftWall.properties.length = 140;
        leftWall.rotation = Math.PI / 2;
        world.add(leftWall);

        const rightWall = new Ramp(295, 35);
        rightWall.properties.length = 140;
        rightWall.rotation = Math.PI / 2;
        world.add(rightWall);

        const b1 = new Ball(-210, 64);
        b1.properties.mass = 3.0;
        b1.properties.radius = 27;
        b1.properties.vx = 330;
        b1.properties.restitution = 0.96;
        b1.vx = 330;
        world.add(b1);

        const b2 = new Ball(-20, 68);
        b2.properties.mass = 1.5;
        b2.properties.radius = 22;
        b2.properties.restitution = 0.96;
        world.add(b2);

        const b3 = new Ball(85, 70);
        b3.properties.mass = 1.0;
        b3.properties.radius = 20;
        b3.properties.restitution = 0.96;
        world.add(b3);

        world.select(b1);
      },
    },
  ],

  optics: [
    {
      id: 'prism_rainbow',
      name: '🌈 Дисперсия белого света в призме',
      build(world) {
        const src = new LightSource(-230, 25);
        src.properties.kind = 'beam';
        src.properties.spectrum = 'white';
        src.properties.rayCount = 3;
        src.properties.spread = 14;
        src.rotation = -0.14;
        world.add(src);

        const prism = new Prism(-20, 10);
        prism.properties.size = 150;
        prism.properties.ior = 1.54;
        prism.properties.dispersion = 1.6;
        prism.rotation = 0.08;
        world.add(prism);

        const screen = new OpticalScreen(235, 55);
        screen.properties.height = 240;
        screen.rotation = 0.12;
        world.add(screen);

        world.select(prism);
      },
    },
    {
      id: 'lens_system',
      name: '🔍 Фокусировка пучка: система двух линз',
      build(world) {
        const src = new LightSource(-265, 0);
        src.properties.kind = 'beam';
        src.properties.spectrum = 'cyan';
        src.properties.rayCount = 9;
        src.properties.spread = 70;
        world.add(src);

        const convLens = new Lens(-70, 0);
        convLens.properties.kind = 'converging';
        convLens.properties.focal = 140;
        convLens.properties.aperture = 180;
        world.add(convLens);

        const divLens = new Lens(115, 0);
        divLens.properties.kind = 'diverging';
        divLens.properties.focal = 85;
        divLens.properties.aperture = 140;
        world.add(divLens);

        const screen = new OpticalScreen(265, 0);
        screen.properties.height = 200;
        world.add(screen);

        world.select(convLens);
      },
    },
    {
      id: 'mirror_periscope',
      name: '🪞 Лазерный перископ и вогнутое зеркало',
      build(world) {
        const src = new LightSource(-240, -105);
        src.properties.kind = 'beam';
        src.properties.spectrum = 'green';
        src.properties.rayCount = 5;
        src.properties.spread = 32;
        world.add(src);

        const m1 = new Mirror(-20, -105);
        m1.properties.kind = 'flat';
        m1.properties.aperture = 120;
        m1.rotation = Math.PI / 4;
        world.add(m1);

        const m2 = new Mirror(-20, 105);
        m2.properties.kind = 'flat';
        m2.properties.aperture = 120;
        m2.rotation = Math.PI / 4;
        world.add(m2);

        const concave = new Mirror(215, 105);
        concave.properties.kind = 'concave';
        concave.properties.aperture = 170;
        concave.properties.focal = 125;
        concave.rotation = -0.22;
        world.add(concave);

        world.select(concave);
      },
    },
  ],

  electricity: [
    {
      id: 'simple_circuit',
      name: '💡 Цепь с лампой, ключом и приборами',
      build(world) {
        const bat = new Battery(-125, 105);
        bat.properties.emf = 12;
        world.add(bat);

        const sw = new Switch(115, 105);
        sw.properties.closed = true;
        world.add(sw);

        const amm = new Ammeter(-140, -65);
        world.add(amm);

        const lamp = new Lamp(85, -65);
        lamp.properties.resistance = 12;
        lamp.properties.maxPower = 20;
        world.add(lamp);

        const volt = new Voltmeter(85, -165);
        world.add(volt);

        connectPorts(world, bat, 1, sw, 0);
        connectPorts(world, sw, 1, lamp, 1);
        connectPorts(world, lamp, 0, amm, 1);
        connectPorts(world, amm, 0, bat, 0);

        connectPorts(world, lamp, 0, volt, 0);
        connectPorts(world, lamp, 1, volt, 1);

        world.select(lamp);
      },
    },
    {
      id: 'parallel_circuit',
      name: '⚡ Параллельное соединение ламп и резистора',
      build(world) {
        const bat = new Battery(0, 130);
        bat.properties.emf = 18;
        world.add(bat);

        const swMain = new Switch(-160, 130);
        swMain.properties.closed = true;
        world.add(swMain);

        const lamp1 = new Lamp(0, 10);
        lamp1.properties.resistance = 15;
        world.add(lamp1);

        const lamp2 = new Lamp(-65, -105);
        lamp2.properties.resistance = 10;
        world.add(lamp2);

        const res = new Resistor(80, -105);
        res.properties.resistance = 8;
        world.add(res);

        connectPorts(world, bat, 0, swMain, 1);
        connectPorts(world, swMain, 0, lamp1, 0);
        connectPorts(world, bat, 1, lamp1, 1);

        connectPorts(world, lamp1, 0, lamp2, 0);
        connectPorts(world, lamp2, 1, res, 0);
        connectPorts(world, res, 1, lamp1, 1);

        world.select(bat);
      },
    },
    {
      id: 'voltage_divider',
      name: '📟 Делитель напряжения (Закон Ома)',
      build(world) {
        const bat = new Battery(0, 115);
        bat.properties.emf = 24;
        world.add(bat);

        const r1 = new Resistor(-105, -25);
        r1.properties.resistance = 10;
        world.add(r1);

        const r2 = new Resistor(105, -25);
        r2.properties.resistance = 20;
        world.add(r2);

        const v2 = new Voltmeter(105, -130);
        world.add(v2);

        connectPorts(world, bat, 0, r1, 0);
        connectPorts(world, r1, 1, r2, 0);
        connectPorts(world, r2, 1, bat, 1);

        connectPorts(world, r2, 0, v2, 0);
        connectPorts(world, r2, 1, v2, 1);

        world.select(r2);
      },
    },
  ],
};
