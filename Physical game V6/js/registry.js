// ============================================================
//  Реестр элементов по разделам и готовые лабораторные работы (Пресеты)
// ============================================================

const REGISTRY = {
  mechanics: [
    { cls: Ball, type: 'ball',     label: 'Упругий шар',   sub: 'Качение и удары',      icon: '🔴' },
    { cls: Block, type: 'block',    label: 'Брусок',        sub: 'Трение и скольжение',  icon: '🟦' },
    { cls: Ramp, type: 'ramp',     label: 'Плоскость',     sub: 'Опора / наклонная',    icon: '📐' },
    { cls: Spring, type: 'spring',   label: 'Пружина Гука',  sub: 'Упругие колебания',    icon: '〰️' },
    { cls: Pendulum, type: 'pendulum', label: 'Маятник',       sub: 'Гармонический подвес', icon: '⏱️' },
    { cls: IcePlane, type: 'ice-plane',   label: 'Ледяная плоскость', sub: 'Почти без трения',      icon: '🧊' },
    { cls: Trampoline, type: 'trampoline', label: 'Батут',             sub: 'Добавляет скорость',    icon: '🟢' },
    { cls: ForceZone, type: 'force-zone',  label: 'Силовое поле',      sub: 'Область с ускорением',  icon: '🌀' },
  ],
  optics: [
    { cls: LightSource, type: 'light-source',   label: 'Источник света', sub: 'Пучок / Лазер / Веер', icon: '🔦' },
    { cls: Lens, type: 'lens',          label: 'Линза',          sub: 'Собирающая и рассеив.', icon: '🔍' },
    { cls: Mirror, type: 'mirror',        label: 'Зеркало',        sub: 'Плоское и сферическое', icon: '🪞' },
    { cls: Prism, type: 'prism',         label: 'Призма',         sub: 'Преломление и радуга',  icon: '💎' },
    { cls: OpticalScreen, type: 'optical-screen', label: 'Экран',          sub: 'Детектор лучей',        icon: '🖥️' },
    { cls: BeamSplitter, type: 'beam-splitter',  label: 'Делитель пучка', sub: 'Делит луч пополам',     icon: '🔀' },
    { cls: GlassSlab, type: 'glass-slab',     label: 'Стеклянная пластина', sub: 'Сдвиг луча',       icon: '🪟' },
    { cls: ColorFilter, type: 'color-filter',   label: 'Светофильтр',    sub: 'Пропускает один цвет',  icon: '🎨' },
    { cls: Slit, type: 'slit',          label: 'Щель',           sub: 'Вырезает узкий пучок',  icon: '▮▮' },
  ],
  electricity: [
    { cls: Battery, type: 'battery',   label: 'Батарея ЭДС', sub: 'Источник напряжения', icon: '🔋' },
    { cls: Lamp, type: 'lamp',      label: 'Лампа',       sub: 'Светится от мощности', icon: '💡' },
    { cls: Resistor, type: 'resistor',  label: 'Резистор',    sub: 'Омическая нагрузка',   icon: '⏛' },
    { cls: Switch, type: 'switch',    label: 'Ключ',        sub: 'Клик — замкнуть цепь', icon: '🕹️' },
    { cls: Ammeter, type: 'ammeter',   label: 'Амперметр',   sub: 'Измерение тока (А)',   icon: '🧭' },
    { cls: Voltmeter, type: 'voltmeter', label: 'Вольтметр',   sub: 'Измерение напряж. (В)', icon: '📟' },
    { cls: Capacitor, type: 'capacitor',     label: 'Конденсатор',     sub: 'Копит заряд и энергию', icon: '┤├' },
    { cls: Diode, type: 'diode',         label: 'Диод',            sub: 'Ток только в одну сторону', icon: '▶|' },
    { cls: LED, type: 'led',           label: 'Светодиод',       sub: 'Светится от тока',      icon: '🔴' },
    { cls: Potentiometer, type: 'potentiometer', label: 'Потенциометр',    sub: 'Реостат / делитель',    icon: '🎚️' },
    { cls: Fuse, type: 'fuse',          label: 'Предохранитель',  sub: 'Размыкает при перегрузке', icon: '🧯' },
    { cls: Wire, type: 'wire',      label: 'Провод',      sub: 'Или тяни от клеммы ●', icon: '🔌' },
  ],
};

// ============================================================
//  Описания элементов: что это, как работает, зачем нужен
//  Ключ = element.type. Показывается в палитре (кнопка ⓘ)
//  и в правой панели при выборе объекта.
// ============================================================

const ELEMENT_INFO = {
  // ---------------- МЕХАНИКА ----------------
  ball: {
    what: 'Упругий шар с настраиваемой массой, радиусом и упругостью.',
    how: 'На шар действуют сила тяжести mg и реакция опоры. При ударе скорость вдоль нормали меняется по коэффициенту восстановления e (e = 1 — идеально упругий удар, e = 0 — абсолютно неупругий). Трение раскручивает шар, поэтому он катится.',
    why: 'Нужен для опытов на законы сохранения энергии и импульса, соударения тел и качение по наклонной плоскости.',
    formula: 'p = mv;  Eₖ = mv²/2;  Eₚ = mgh',
  },
  block: {
    what: 'Прямоугольный брусок, который скользит, а не катится.',
    how: 'Движется под действием mg и силы трения Кулона: F_тр ≤ μN. Если μ больше tg α наклонной плоскости, брусок остаётся на месте, иначе — скользит с ускорением a = g(sin α − μ cos α). Галочка «Зафиксировать» превращает его в неподвижную опору.',
    why: 'Показывает разницу между скольжением и качением, помогает измерять коэффициент трения и изучать условия равновесия на наклонной плоскости.',
    formula: 'F_тр = μN;  a = g(sin α − μ cos α)',
  },
  ramp: {
    what: 'Неподвижная плоскость: пол, стена или горка любого наклона.',
    how: 'Это жёсткая опора, от которой тела отталкиваются по нормали. Угол задаётся поворотом (ручка сверху или ползунок), а свойства поверхности — трением μ и упругостью e.',
    why: 'Основа почти любого опыта по механике: из плоскостей собираются горки, стенки, ловушки и полы.',
    formula: 'N = mg cos α',
  },
  spring: {
    what: 'Вертикальная пружина с грузом, подчиняющаяся закону Гука.',
    how: 'Сила упругости пропорциональна смещению: F = −kx. Груз колеблется по уравнению m·x″ = −kx − c·x′, где c — затухание. Цвет витков показывает растяжение (синий) или сжатие (красный). Груз можно оттянуть мышью.',
    why: 'Нужна, чтобы изучать гармонические колебания, зависимость периода от массы и жёсткости, а также переход потенциальной энергии в кинетическую.',
    extra3d: 'У груза появляется вращение вокруг оси пружины, как у маятника Вильберфорса. Растяжение и закрутка связаны: пружина колеблется вверх-вниз, груз постепенно закручивается и раскручивается, а энергия перетекает между двумя видами колебаний. Закрутить груз можно мышью за кольцо вокруг него. Эффект сильнее всего, когда частоты совпадают (резонанс).',
    formula: 'T = 2π√(m/k);  Eₚ = kx²/2',
  },
  pendulum: {
    what: 'Математический маятник: груз на нерастяжимой нити.',
    how: 'Решается нелинейное уравнение θ″ = −(g/L)·sin θ − γθ′. При малых углах период почти не зависит от амплитуды, при больших — растёт. Груз можно оттянуть мышью, он сталкивается с шарами и брусками.',
    why: 'Показывает зависимость периода от длины и от ускорения свободного падения (смените планету!), а также колебательный обмен Eₖ ↔ Eₚ.',
    extra3d: 'Груз можно закрутить вокруг нити (кольцо вокруг груза). Закрученная нить укорачивается, как скрученный шнур, поэтому маятник качается быстрее, а нить раскручивается крутильными колебаниями.',
    formula: 'T ≈ 2π√(L/g)',
  },
  'ice-plane': {
    what: 'Плоскость из льда: поверхность почти без трения (μ ≈ 0,02).',
    how: 'Работает так же, как обычная плоскость, но с очень малым коэффициентом трения. Сила трения ограничена μN, поэтому тело разгоняется практически как на идеально гладкой поверхности.',
    why: 'Нужна для сравнения: поставьте рядом лёд и шероховатую плоскость и увидите, как трение влияет на скорость и энергию. Приближает идеальный случай «трения нет».',
    formula: 'a = g(sin α − μ cos α), μ → 0',
  },
  trampoline: {
    what: 'Батут: упругая плоскость, подбрасывающая тела вверх.',
    how: 'При касании тело получает дополнительную скорость вдоль нормали поверхности (значение «Добавка скорости» в м/с), как будто пружина батута отдаёт запасённую энергию. Направление зависит от наклона батута.',
    why: 'Показывает, что энергия тела может расти за счёт внешнего источника. Полезен для опытов по траекториям, высоте подъёма и выстреливанию шаров под углом.',
    formula: 'h = v²/(2g)',
  },
  'force-zone': {
    what: 'Прямоугольная область, где на все тела действует постоянное дополнительное ускорение.',
    how: 'Пока центр тела внутри области, к нему каждый шаг добавляется ускорение a вдоль стрелок (направление задаётся поворотом элемента). Это модель однородного поля: ветра, электрического поля или потока воздуха.',
    why: 'Позволяет изучать движение под действием нескольких сил сразу: например, бросок тела в поле тяжести и боковом ветре, и сравнивать траектории с параболой.',
    formula: 'F = ma;  x(t) = x₀ + v₀t + at²/2',
  },

  // ---------------- ОПТИКА ----------------
  'light-source': {
    what: 'Излучатель света: параллельный пучок, лазер или расходящийся веер.',
    how: 'Источник испускает набор лучей из своего торца в направлении поворота. Белый свет при встрече с призмой раскладывается на 7 цветов, цветные лучи идут не разлагаясь.',
    why: 'Без источника в оптической схеме нечего преломлять и отражать. Тип пучка подбирается под опыт: параллельный — для линз, веер — для построения изображений.',
  },
  lens: {
    what: 'Тонкая линза: собирающая (+F) или рассеивающая (−F).',
    how: 'Луч, попавший на линзу на высоте h от оси, отклоняется на угол h/F в сторону оси (собирающая) или от неё (рассеивающая). Показаны фокусы F и двойные фокусы 2F.',
    why: 'Нужна для построения изображений, фокусировки пучков и сборки оптических приборов: телескопа, проектора, лупы.',
    formula: '1/d + 1/f = 1/F;  D = 1/F',
  },
  mirror: {
    what: 'Зеркало: плоское, вогнутое (собирающее) или выпуклое (рассеивающее).',
    how: 'Плоское зеркало отражает по закону «угол падения равен углу отражения». Сферические зеркала дополнительно отклоняют луч в зависимости от расстояния до оси, как линза, но «назад».',
    why: 'Меняет направление лучей (перископ, оптические схемы), даёт изображения (вогнутое — как в телескопе-рефлекторе, выпуклое — как обзорное зеркало на дороге).',
    formula: 'α_пад = α_отр;  F = R/2',
  },
  prism: {
    what: 'Стеклянная треугольная призма с дисперсией.',
    how: 'На каждой грани луч преломляется по закону Снеллиуса. Показатель преломления зависит от цвета: фиолетовый свет преломляется сильнее красного, поэтому белый луч расходится в радугу. При слишком большом угле возникает полное внутреннее отражение.',
    why: 'Классический опыт Ньютона: доказывает, что белый свет состоит из цветов. Призмы используют в спектроскопах и биноклях.',
    formula: 'n₁ sin θ₁ = n₂ sin θ₂',
  },
  'optical-screen': {
    what: 'Экран: детектор, на котором видны точки попадания лучей.',
    how: 'Луч, достигший экрана, останавливается и рисует светящуюся точку цвета этого луча. Счётчик попаданий показывает освещённость.',
    why: 'Позволяет увидеть результат опыта: где собрался фокус, какой цвет и в каком месте пришёл, как далеко разошёлся спектр.',
  },
  'beam-splitter': {
    what: 'Делитель пучка: полупрозрачное зеркало.',
    how: 'Каждый попавший луч делится на два: часть энергии (доля R) отражается как от плоского зеркала, остальное (1 − R) проходит дальше. Яркость лучей показывает их интенсивность.',
    why: 'С его помощью один пучок направляют сразу в две части схемы. Используется в интерферометрах, лазерных установках и фотоаппаратах.',
    formula: 'R + T = 1',
  },
  'glass-slab': {
    what: 'Плоскопараллельная стеклянная пластина.',
    how: 'Луч преломляется на входе и на выходе. Направление после пластины остаётся прежним, но сам луч смещается в сторону. Чем больше угол падения, толщина и показатель n, тем сильнее сдвиг.',
    why: 'Показывает преломление в «чистом виде» и объясняет, почему предметы за стеклом и под водой кажутся смещёнными. Помогает измерять показатель преломления.',
    formula: 'смещение = d·sin(α − β)/cos β',
  },
  'color-filter': {
    what: 'Светофильтр: пропускает только свой цвет.',
    how: 'Белый луч, прошедший фильтр, окрашивается в его цвет. Луч нужного цвета проходит (немного ослабевая), лучи других цветов поглощаются.',
    why: 'Выделяет часть спектра. Поставьте фильтр после призмы, чтобы выбрать одну цветовую полосу. Так работают светофильтры в фотографии и на сцене.',
  },
  slit: {
    what: 'Щель в непрозрачной ширме.',
    how: 'Ширма поглощает всё, что в неё попало; лучи, проходящие через щель, продолжают путь. Ширину и положение щели можно менять.',
    why: 'Вырезает узкий пучок из широкого. Нужна, чтобы получить «чистый» луч перед призмой или линзой и сравнить схему с широким и узким пучком.',
  },

  // ---------------- ЭЛЕКТРИЧЕСТВО ----------------
  battery: {
    what: 'Источник ЭДС (батарея) с внутренним сопротивлением.',
    how: 'Создаёт напряжение E между клеммами «−» и «+». Реальное напряжение на клеммах меньше из-за внутреннего сопротивления r: U = E − Ir. При очень малом сопротивлении внешней цепи появляется короткое замыкание.',
    why: 'Без источника ток не течёт. Показывает, что напряжение на нагрузке падает при росте тока, и что короткое замыкание опасно.',
    formula: 'I = E/(R + r)',
  },
  lamp: {
    what: 'Лампа накаливания, свечение которой зависит от мощности.',
    how: 'Ведёт себя как резистор: U = IR. Выделяемая мощность P = UI определяет яркость. Если мощность намного больше номинальной, нить перегорает.',
    why: 'Наглядный индикатор тока: по яркости видно, как мощность делится между элементами при последовательном и параллельном соединении.',
    formula: 'P = UI = I²R = U²/R',
  },
  resistor: {
    what: 'Резистор — элемент с постоянным сопротивлением.',
    how: 'Подчиняется закону Ома: ток через него пропорционален приложенному напряжению. Выделяемая мощность нагревает резистор, цвет корпуса краснеет.',
    why: 'Ограничивает ток, делит напряжение, служит нагрузкой. Без него не собрать делитель напряжения и не защитить светодиод.',
    formula: 'I = U/R;  P = I²R',
  },
  switch: {
    what: 'Ключ: размыкает и замыкает цепь.',
    how: 'В замкнутом состоянии сопротивление почти нулевое, в разомкнутом — бесконечное, ток не идёт. Переключается кликом по ключу.',
    why: 'Позволяет включать и выключать части схемы, например, для демонстрации короткого замыкания или для зарядки конденсатора.',
  },
  ammeter: {
    what: 'Амперметр — прибор для измерения силы тока.',
    how: 'Имеет очень малое сопротивление и включается последовательно: весь ток цепи проходит через прибор, а его сопротивление почти не меняет цепь.',
    why: 'Показывает ток в нужной ветви. Включённый параллельно, он создаст короткое замыкание, поэтому его место — в разрыве проводника.',
  },
  voltmeter: {
    what: 'Вольтметр — прибор для измерения напряжения.',
    how: 'Имеет огромное сопротивление (10 МОм) и подключается параллельно участку, на котором измеряют напряжение. Почти не потребляет ток.',
    why: 'Показывает разность потенциалов между двумя точками схемы: падение напряжения на лампе, резисторе или конденсаторе.',
  },
  wire: {
    what: 'Провод между двумя клеммами.',
    how: 'Практически не имеет сопротивления и соединяет потенциалы клемм. Жёлтые точки движутся по проводу в направлении тока, скорость пропорциональна силе тока. Конец провода можно перетащить на другую клемму.',
    why: 'Соединяет элементы в схему. Именно способ соединения (последовательно или параллельно) определяет токи и напряжения.',
  },
  capacitor: {
    what: 'Конденсатор — накопитель электрического заряда и энергии.',
    how: 'При подключении к источнику через резистор заряжается по экспоненте: ток сначала большой, затем падает до нуля, а напряжение растёт до ЭДС источника. Постоянная времени τ = RC. Ёмкость в симуляции взята в учебном масштабе (до 2 Ф), чтобы процесс был виден за секунды.',
    why: 'Нужен для сглаживания напряжения, хранения энергии, таймеров и фильтров. Показывает, что ток в цепи постоянного тока может быть временным.',
    formula: 'q = CU;  W = CU²/2;  U(t) = E(1 − e^(−t/RC))',
  },
  diode: {
    what: 'Диод — пропускает ток только в одном направлении.',
    how: 'Если напряжение от анода (A) к катоду (K) выше порога Uпр, диод открывается и ведёт себя почти как провод с падением Uпр. Если ниже или полярность обратная — он закрыт и тока нет.',
    why: 'Защищает схемы от неправильной полярности, выпрямляет ток, разделяет ветви. Проверьте: поверните диод на 180° и ток исчезнет.',
    formula: 'U > Uпр → открыт, иначе I = 0',
  },
  led: {
    what: 'Светодиод — диод, который светится при протекании тока.',
    how: 'Открывается при напряжении около 2 В. Яркость пропорциональна току. Допустимый ток мал (десятки мА), поэтому светодиод нужно подключать через резистор, иначе он мгновенно сгорает.',
    why: 'Показывает, как резистор ограничивает ток, и объясняет, зачем в реальных схемах стоят «токоограничивающие» резисторы.',
    formula: 'R = (E − Uпр)/I',
  },
  potentiometer: {
    what: 'Потенциометр — резистор с подвижным контактом (движком).',
    how: 'Имеет три клеммы: a, b и движок w. Сопротивление делится движком на две части R·p и R·(1−p). Если использовать только a и w — получится реостат, регулирующий ток. Если подать напряжение на a и b, с движка снимается часть напряжения.',
    why: 'Регулирует яркость лампы, громкость и напряжение. Это и есть «ручка» диммера, и делитель напряжения с плавной настройкой.',
    formula: 'U_вых = U·R₂/(R₁ + R₂)',
  },
  fuse: {
    what: 'Плавкий предохранитель — защита цепи от перегрузки.',
    how: 'Проволока нагревается током: при токе выше номинала нагрев растёт, и чем больше перегрузка, тем быстрее. Когда нагрев достигает предела, проволока перегорает и цепь размыкается навсегда (пока не сбросить).',
    why: 'Защищает батарею и приборы от короткого замыкания и пожара. Замкните ключ параллельно лампе и посмотрите, как быстро сработает предохранитель.',
    formula: 'тепло ~ I²·t',
  },
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
    {
      id: 'ice_vs_rough',
      name: '🧊 Лёд против шероховатости: роль трения',
      build(world) {
        const ice = new IcePlane(-190, 20);
        ice.properties.length = 300;
        ice.rotation = 0.25;
        world.add(ice);

        const rough = new Ramp(150, 20);
        rough.properties.length = 300;
        rough.properties.friction = 0.9;
        rough.rotation = 0.25;
        world.add(rough);

        const floor = new Ramp(-20, 190);
        floor.properties.length = 700;
        world.add(floor);

        const wall = new Ramp(325, 125);
        wall.properties.length = 140;
        wall.rotation = Math.PI / 2;
        world.add(wall);

        const b1 = new Block(-269, -35);
        b1.rotation = 0.25;
        b1.properties.friction = 0.2;
        b1.properties.mass = 2;
        world.add(b1);

        const b2 = new Block(71, -35);
        b2.rotation = 0.25;
        b2.properties.friction = 0.2;
        b2.properties.mass = 2;
        world.add(b2);

        world.select(b1);
      },
    },
    {
      id: 'trampoline_field',
      name: '🌀 Батут и силовое поле: движение под несколькими силами',
      build(world) {
        const floor = new Ramp(0, 185);
        floor.properties.length = 700;
        world.add(floor);

        const wall = new Ramp(340, 105);
        wall.properties.length = 200;
        wall.rotation = Math.PI / 2;
        world.add(wall);

        const tramp = new Trampoline(-150, 160);
        tramp.properties.length = 180;
        tramp.properties.boost = 2.5;
        world.add(tramp);

        const zone = new ForceZone(150, 20);
        zone.properties.strength = 10;
        zone.properties.width = 240;
        zone.properties.height = 300;
        world.add(zone);

        const b1 = new Ball(-150, -60);
        b1.properties.restitution = 0.8;
        world.add(b1);

        const b2 = new Ball(90, -100);
        b2.properties.restitution = 0.7;
        world.add(b2);

        world.select(zone);
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
        m1.rotation = -Math.PI / 4;
        world.add(m1);

        const m2 = new Mirror(-20, 105);
        m2.properties.kind = 'flat';
        m2.properties.aperture = 120;
        m2.rotation = -Math.PI / 4;
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
    {
      id: 'splitter_filter',
      name: '🔀 Делитель пучка, светофильтр и стеклянная пластина',
      build(world) {
        const src = new LightSource(-250, 0);
        src.properties.kind = 'laser';
        src.properties.spectrum = 'white';
        world.add(src);

        const bs = new BeamSplitter(-90, 0);
        bs.properties.ratio = 0.5;
        bs.rotation = -Math.PI / 4;
        world.add(bs);

        const filt = new ColorFilter(40, 0);
        filt.properties.color = 'red';
        filt.properties.aperture = 80;
        world.add(filt);

        const scr1 = new OpticalScreen(230, 0);
        scr1.properties.height = 120;
        world.add(scr1);

        const m = new Mirror(-90, 110);
        m.properties.kind = 'flat';
        m.rotation = -Math.PI / 4;
        world.add(m);

        const slab = new GlassSlab(40, 110);
        slab.properties.thickness = 70;
        slab.rotation = 0.5;
        world.add(slab);

        const scr2 = new OpticalScreen(230, 110);
        scr2.properties.height = 120;
        world.add(scr2);

        world.select(bs);
      },
    },
    {
      id: 'slit_prism_filter',
      name: '🎨 Щель, призма и выбор цвета светофильтром',
      build(world) {
        const src = new LightSource(-250, 28);
        src.properties.kind = 'beam';
        src.properties.spectrum = 'white';
        src.properties.rayCount = 7;
        src.properties.spread = 40;
        src.rotation = -0.14;
        world.add(src);

        const slit = new Slit(-150, 17);
        slit.properties.gap = 20;
        slit.properties.height = 150;
        world.add(slit);

        const prism = new Prism(-20, 10);
        prism.properties.size = 150;
        prism.properties.ior = 1.54;
        prism.properties.dispersion = 1.6;
        prism.rotation = 0.08;
        world.add(prism);

        const filt = new ColorFilter(112, 118);
        filt.properties.color = 'cyan';
        filt.properties.aperture = 220;
        filt.rotation = Math.PI / 4;
        world.add(filt);

        const screen = new OpticalScreen(140, 130);
        screen.properties.height = 220;
        screen.rotation = Math.PI / 4;
        world.add(screen);

        world.select(filt);
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
    {
      id: 'rc_charge',
      name: '🔋 Зарядка конденсатора через резистор (RC-цепь)',
      build(world) {
        const bat = new Battery(-125, 105);
        bat.properties.emf = 12;
        world.add(bat);

        const sw = new Switch(115, 105);
        sw.properties.closed = true;
        world.add(sw);

        const res = new Resistor(85, -65);
        res.properties.resistance = 10;
        world.add(res);

        const cap = new Capacitor(-140, -65);
        cap.properties.capacitance = 0.3;
        world.add(cap);

        const volt = new Voltmeter(-140, -165);
        world.add(volt);

        connectPorts(world, bat, 1, sw, 0);
        connectPorts(world, sw, 1, res, 1);
        connectPorts(world, res, 0, cap, 0);
        connectPorts(world, cap, 1, bat, 0);

        connectPorts(world, cap, 0, volt, 0);
        connectPorts(world, cap, 1, volt, 1);

        world.select(cap);
      },
    },
    {
      id: 'led_diode',
      name: '🔴 Светодиод, резистор и обратное включение диода',
      build(world) {
        const bat = new Battery(0, 130);
        bat.properties.emf = 6;
        world.add(bat);

        const r1 = new Resistor(-130, -10);
        r1.properties.resistance = 150;
        world.add(r1);

        const led1 = new LED(-130, -110);
        world.add(led1);

        const r2 = new Resistor(130, -10);
        r2.properties.resistance = 150;
        world.add(r2);

        const led2 = new LED(130, -110);
        world.add(led2);

        // Левая ветвь: правильная полярность
        connectPorts(world, bat, 1, r1, 0);
        connectPorts(world, r1, 1, led1, 0);
        connectPorts(world, led1, 1, bat, 0);

        // Правая ветвь: светодиод включён наоборот
        connectPorts(world, bat, 1, r2, 0);
        connectPorts(world, r2, 1, led2, 1);
        connectPorts(world, led2, 0, bat, 0);

        world.select(led2);
      },
    },
    {
      id: 'dimmer',
      name: '🎚️ Диммер: потенциометр регулирует яркость лампы',
      build(world) {
        const bat = new Battery(0, 130);
        bat.properties.emf = 16;
        world.add(bat);

        const pot = new Potentiometer(-130, 0);
        pot.properties.resistance = 50;
        pot.properties.position = 0.2;
        world.add(pot);

        const lamp = new Lamp(130, 0);
        lamp.properties.resistance = 12;
        lamp.properties.maxPower = 20;
        world.add(lamp);

        const volt = new Voltmeter(130, -110);
        world.add(volt);

        connectPorts(world, bat, 1, pot, 0);
        connectPorts(world, pot, 2, lamp, 0);
        connectPorts(world, lamp, 1, bat, 0);

        connectPorts(world, lamp, 0, volt, 0);
        connectPorts(world, lamp, 1, volt, 1);

        world.select(pot);
      },
    },
    {
      id: 'fuse_short',
      name: '🧯 Предохранитель и короткое замыкание',
      build(world) {
        const bat = new Battery(-130, 120);
        bat.properties.emf = 12;
        world.add(bat);

        const fuse = new Fuse(30, 120);
        fuse.properties.ratedCurrent = 2;
        world.add(fuse);

        const amm = new Ammeter(-130, -40);
        world.add(amm);

        const lamp = new Lamp(30, -40);
        lamp.properties.resistance = 12;
        lamp.properties.maxPower = 20;
        world.add(lamp);

        const shortSw = new Switch(30, -140);
        shortSw.properties.closed = false;
        world.add(shortSw);

        connectPorts(world, bat, 1, fuse, 0);
        connectPorts(world, fuse, 1, lamp, 1);
        connectPorts(world, lamp, 0, amm, 1);
        connectPorts(world, amm, 0, bat, 0);

        connectPorts(world, shortSw, 0, lamp, 0);
        connectPorts(world, shortSw, 1, lamp, 1);

        world.select(shortSw);
      },
    },
  ],
};
