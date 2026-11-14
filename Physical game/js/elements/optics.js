class LightSource extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'light-source';
    this.label = 'Свет';
    this.color = '#fbbf24';
    this.width = 50;
    this.height = 50;
    this.properties = { color: '#ffee88', intensity: 1 };
  }

  render(ctx) {
    // свечение
    const grad = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, 40);
    grad.addColorStop(0, 'rgba(255,238,136,0.5)');
    grad.addColorStop(1, 'rgba(255,238,136,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 40, 0, Math.PI * 2);
    ctx.fill();

    // ядро
    ctx.fillStyle = this.properties.color || '#fbbf24';
    ctx.strokeStyle = this.selected ? '#ffffff' : 'rgba(0,0,0,0.3)';
    ctx.lineWidth = this.selected ? 2 : 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  containsPoint(wx, wy) {
    const dx = wx - this.x, dy = wy - this.y;
    return dx * dx + dy * dy <= 18 * 18;
  }
}

class Lens extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'lens';
    this.label = 'Линза';
    this.color = '#38bdf8';
    this.width = 24;
    this.height = 90;
    this.properties = { focal: 1, kind: 'converging' }; // converging | diverging
  }

  render(ctx) {
    const b = this.getBounds();
    ctx.save();
    ctx.strokeStyle = this.selected ? '#ffffff' : '#38bdf8';
    ctx.fillStyle = 'rgba(56,189,248,0.15)';
    ctx.lineWidth = 2;

    // форма линзы (эллипс)
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#9aa3b8';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, this.x, this.y + b.h / 2 + 14);
  }
}

class Mirror extends Element {
  constructor(x, y) {
    super(x, y);
    this.type = 'mirror';
    this.label = 'Зеркало';
    this.color = '#a78bfa';
    this.width = 16;
    this.height = 90;
    this.properties = { kind: 'flat' };
  }
}