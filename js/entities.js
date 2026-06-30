import { TAU, rand, wrapPosition, polygonVertices, rotatePoint, circlePolygonCollision } from './utils.js';
import { speed, timer } from './config.js';

export class Ship {
  constructor(x, y) {
    this.reset(x, y);
    this.radius = 12;
    this.thrustPower = speed(0.15);
    this.rotationSpeed = speed(0.08);
    this.maxSpeed = speed(8);
    this.friction = 0.996;
    this.invulnerableTime = 0;
    this.blinkTimer = 0;
    this.dead = false;
    this.thrusting = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
  }

  rotate(dir) {
    this.angle += dir * this.rotationSpeed;
  }

  thrust() {
    this.thrusting = true;
    this.vx += Math.cos(this.angle) * this.thrustPower;
    this.vy += Math.sin(this.angle) * this.thrustPower;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }
  }

  update(width, height) {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.friction;
    this.vy *= this.friction;
    wrapPosition(this, width, height);
    this.thrusting = false;

    if (this.invulnerableTime > 0) {
      this.invulnerableTime--;
      this.blinkTimer++;
    }
  }

  makeInvulnerable(frames = 180) {
    this.invulnerableTime = frames;
    this.blinkTimer = 0;
  }

  isVisible() {
    if (this.invulnerableTime <= 0) return true;
    return Math.floor(this.blinkTimer / 6) % 2 === 0;
  }

  getVertices() {
    const nose = { x: 15, y: 0 };
    const left = { x: -10, y: -8 };
    const right = { x: -10, y: 8 };
    return [nose, left, right].map(p => {
      const r = rotatePoint(p.x, p.y, this.angle);
      return { x: this.x + r.x, y: this.y + r.y };
    });
  }

  collidesWith(x, y, radius) {
    if (this.invulnerableTime > 0 || this.dead) return false;
    return circlePolygonCollision(x, y, radius, this.getVertices());
  }

  draw(ctx) {
    if (!this.isVisible()) return;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const verts = this.getVertices();
    ctx.moveTo(verts[0].x, verts[0].y);
    ctx.lineTo(verts[1].x, verts[1].y);
    ctx.lineTo(verts[2].x, verts[2].y);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting) {
      const flameAngle = this.angle + Math.PI;
      const flameLen = rand(8, 14);
      const spread = 0.3;
      ctx.beginPath();
      const fx = this.x + Math.cos(flameAngle) * 10;
      const fy = this.y + Math.sin(flameAngle) * 10;
      ctx.moveTo(fx, fy);
      ctx.lineTo(
        this.x + Math.cos(flameAngle + spread) * flameLen,
        this.y + Math.sin(flameAngle + spread) * flameLen
      );
      ctx.moveTo(fx, fy);
      ctx.lineTo(
        this.x + Math.cos(flameAngle - spread) * flameLen,
        this.y + Math.sin(flameAngle - spread) * flameLen
      );
      ctx.stroke();
    }
  }
}

const ASTEROID_SIZES = {
  large: { radius: 40, speed: speed(1.2), score: 20, next: 'medium', verts: 10 },
  medium: { radius: 25, speed: speed(2.0), score: 50, next: 'small', verts: 8 },
  small: { radius: 12, speed: speed(3.0), score: 100, next: null, verts: 6 },
};

export class Asteroid {
  constructor(x, y, size = 'large', speedMult = 1) {
    const config = ASTEROID_SIZES[size];
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = config.radius;
    this.score = config.score;
    this.nextSize = config.next;
    this.angle = rand(0, TAU);
    this.rotationSpeed = rand(-speed(0.02), speed(0.02));
    const speed = config.speed * speedMult;
    const dir = rand(0, TAU);
    this.vx = Math.cos(dir) * speed;
    this.vy = Math.sin(dir) * speed;
    this.localVerts = polygonVertices(config.verts, this.radius, 0.35);
    this.dead = false;
  }

  static createRandom(size, width, height, speedMult = 1, margin = 60) {
    let x, y;
    const edge = Math.floor(rand(0, 4));
    switch (edge) {
      case 0: x = rand(0, width); y = -margin; break;
      case 1: x = width + margin; y = rand(0, height); break;
      case 2: x = rand(0, width); y = height + margin; break;
      default: x = -margin; y = rand(0, height); break;
    }
    return new Asteroid(x, y, size, speedMult);
  }

  getWorldVerts() {
    return this.localVerts.map(v => {
      const r = rotatePoint(v.x, v.y, this.angle);
      return { x: this.x + r.x, y: this.y + r.y };
    });
  }

  update(width, height) {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotationSpeed;
    wrapPosition(this, width, height);
  }

  collidesWith(x, y, radius) {
    return circlePolygonCollision(x, y, radius, this.getWorldVerts());
  }

  draw(ctx) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const verts = this.getWorldVerts();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  split() {
    if (!this.nextSize) return [];
    return [
      new Asteroid(this.x, this.y, this.nextSize),
      new Asteroid(this.x, this.y, this.nextSize),
    ];
  }
}

export class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed(10);
    this.vy = Math.sin(angle) * speed(10);
    this.life = timer(40);
    this.dead = false;
    this.radius = 2;
  }

  update(width, height) {
    this.x += this.vx;
    this.y += this.vy;
    wrapPosition(this, width, height);
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, TAU);
    ctx.fill();
  }
}

export class Particle {
  constructor(x, y, speedVal = 3, life = 30) {
    this.x = x;
    this.y = y;
    const dir = rand(0, TAU);
    const spd = rand(speed(0.5), speed(speedVal));
    this.vx = Math.cos(dir) * spd;
    this.vy = Math.sin(dir) * spd;
    this.life = timer(life);
    this.maxLife = life;
    this.dead = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(this.x, this.y, 2, 2);
  }
}

export class UFO {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.y = rand(40, height - 40);
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.x = this.direction === 1 ? -30 : width + 30;
    this.vx = this.direction * rand(speed(1.5), speed(2.5));
    this.vy = rand(speed(-0.5), speed(0.5));
    this.radius = 14;
    this.dead = false;
    this.shootTimer = rand(timer(60), timer(180));
    this.wobble = 0;
    this.score = 200;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy + Math.sin(this.wobble) * speed(0.5);
    this.wobble += speed(0.05);
    this.shootTimer--;

    if ((this.direction === 1 && this.x > this.width + 40) ||
        (this.direction === -1 && this.x < -40)) {
      this.dead = true;
    }
  }

  canShoot() {
    if (this.shootTimer <= 0) {
      this.shootTimer = rand(timer(90), timer(240));
      return true;
    }
    return false;
  }

  draw(ctx) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.x - 14, this.y);
    ctx.lineTo(this.x - 6, this.y - 6);
    ctx.lineTo(this.x + 6, this.y - 6);
    ctx.lineTo(this.x + 14, this.y);
    ctx.lineTo(this.x + 6, this.y + 4);
    ctx.lineTo(this.x - 6, this.y + 4);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y - 2, 4, Math.PI, 0);
    ctx.stroke();
  }
}

export class UFOBullet {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    const angle = Math.atan2(targetY - y, targetX - x);
    this.vx = Math.cos(angle) * speed(4);
    this.vy = Math.sin(angle) * speed(4);
    this.life = timer(120);
    this.dead = false;
    this.radius = 3;
  }

  update(width, height) {
    this.x += this.vx;
    this.y += this.vy;
    wrapPosition(this, width, height);
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, TAU);
    ctx.fill();
  }
}

export { ASTEROID_SIZES };
