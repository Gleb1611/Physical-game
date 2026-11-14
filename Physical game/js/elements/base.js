// ============================================================
//  Element — базовый класс всех объектов мира
// ============================================================

class Element {
  constructor(x, y) {
    this.id = Element._nextId++;
    this.x = x;
    this.y = y;
    this.rotation = 0;
    this.width = 60;
    this.height = 60;
    this.selected = false;

    // метаданные (переопределяются в наследниках)
    this.type = 'generic';
    this.label = 'Объект';
    this.color = '#4f7cff';

    // параметры, редактируемые в панели свойств (шаг 3)
    this.properties = {};

    // точки подключения — понадобятся для электрики/оптики
    this.ports = [];
  }

  // ---- Геометрия ----
  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      w: this.width,
      h: this.height,
    };
  }

  containsPoint(wx, wy) {
    const b = this.getBounds();
    return wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h;
  }

  // ---- Рендер ----
  render(ctx) {
    const b = this.getBounds();

    // тело элемента
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(0,0,0,0.35)';
    ctx.lineWidth = this.selected ? 2 : 1;

    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.stroke();

    // метка
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x, this.y);
  }

  // ---- Логика (переопределяется) ----
  update(dt, world) {}
}

Element._nextId = 1;

// Утилита: прямоугольник со скруглёнными углами
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}