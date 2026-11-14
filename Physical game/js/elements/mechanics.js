class Block extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'block';
    this.label = 'Блок';
    this.color = '#4f7cff';
    this.width = 70;
    this.height = 50;
    this.properties = { mass: 1, friction: 0.2 };
  }
}

class Spring extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'spring';
    this.label = 'Пружина';
    this.color = '#22c55e';
    this.width = 80;
    this.height = 30;
    this.properties = { stiffness: 100, length: 1 };
  }

  render(ctx) {
    const b = this.getBounds();
    ctx.strokeStyle = this.selected ? '#ffffff' : '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const coils = 6;
    const coilW = (b.w - 20) / coils;
    ctx.moveTo(b.x, this.y);
    ctx.lineTo(b.x + 10, this.y);
    for (let i = 0; i < coils; i++) {
      const x1 = b.x + 10 + coilW * i;
      ctx.lineTo(x1 + coilW / 2, this.y - 12);
      ctx.lineTo(x1 + coilW, this.y);
    }
    ctx.lineTo(b.x + b.w, this.y);
    ctx.stroke();

    ctx.fillStyle = '#9aa3b8';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, this.x, this.y + 26);
  }
}

class Pendulum extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'pendulum';
    this.label = 'Маятник';
    this.color = '#f59e0b';
    this.width = 40;
    this.height = 80;
    this.properties = { length: 1, mass: 1, angle: 30 };
  }
}