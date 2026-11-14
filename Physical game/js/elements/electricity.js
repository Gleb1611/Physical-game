class Battery extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'battery';
    this.label = 'Батарея';
    this.color = '#ef4444';
    this.width = 70;
    this.height = 40;
    this.properties = { emf: 9 }; // В
    this.ports = [
      { x: -35, y: 0, name: '+' },
      { x: 35, y: 0, name: '-' },
    ];
  }

  render(ctx) {
    const b = this.getBounds();
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(0,0,0,0.35)';
    ctx.lineWidth = this.selected ? 2 : 1;
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+  −', this.x, this.y);
  }
}

class Resistor extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'resistor';
    this.label = 'Резистор';
    this.color = '#22d3ee';
    this.width = 60;
    this.height = 28;
    this.properties = { resistance: 100 }; // Ом
    this.ports = [
      { x: -30, y: 0, name: 'a' },
      { x: 30, y: 0, name: 'b' },
    ];
  }
}

class Lamp extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'lamp';
    this.label = 'Лампа';
    this.color = '#fde047';
    this.width = 46;
    this.height = 46;
    this.properties = { power: 60, on: false };
    this.ports = [
      { x: -23, y: 0, name: 'a' },
      { x: 23, y: 0, name: 'b' },
    ];
  }

  render(ctx) {
    const r = this.width / 2;
    if (this.properties.on) {
      const grad = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, r * 2);
      grad.addColorStop(0, 'rgba(253,224,71,0.55)');
      grad.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = this.properties.on ? '#fde047' : '#3a4258';
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(0,0,0,0.35)';
    ctx.lineWidth = this.selected ? 2 : 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  containsPoint(wx, wy) {
    const dx = wx - this.x, dy = wy - this.y;
    return dx * dx + dy * dy <= (this.width / 2) ** 2;
  }
}

class Wire extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'wire';
    this.label = 'Провод';
    this.color = '#64748b';
    this.width = 80;
    this.height = 6;
    this.properties = { resistance: 0 };
  }
}

class Switch extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'switch';
    this.label = 'Ключ';
    this.color = '#94a3b8';
    this.width = 60;
    this.height = 30;
    this.properties = { closed: false };
    this.ports = [
      { x: -30, y: 0, name: 'a' },
      { x: 30, y: 0, name: 'b' },
    ];
  }
}