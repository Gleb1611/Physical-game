// ============================================================
//  World — хранит элементы, рисует, делает hit-test
// ============================================================

class World {
  constructor() {
    this.elements = [];
  }

  add(el) {
    this.elements.push(el);
    return el;
  }

  remove(el) {
    const i = this.elements.indexOf(el);
    if (i >= 0) this.elements.splice(i, 1);
  }

  clear() {
    this.elements = [];
  }

  // Возвращает верхний элемент под точкой или null
  hitTest(wx, wy) {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      if (this.elements[i].containsPoint(wx, wy)) return this.elements[i];
    }
    return null;
  }

  update(dt) {
    for (const el of this.elements) el.update(dt, this);
  }

  render(ctx) {
    for (const el of this.elements) {
      el.render(ctx);
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