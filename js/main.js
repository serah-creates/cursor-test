import { Ship, Asteroid, Bullet, Particle, UFO, UFOBullet } from './entities.js';
import { rand, randInt } from './utils.js';
import { speed, timer, GAME_SPEED } from './config.js';
import {
  initAudio, playShoot, playExplosion, playThrust, stopThrust,
  playExtraLife, playUfo
} from './audio.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');

const STATE = { TITLE: 'title', PLAYING: 'playing', PAUSED: 'paused', DEAD: 'dead', GAME_OVER: 'gameover' };

const keys = {};
let state = STATE.TITLE;
let ship = null;
let asteroids = [];
let bullets = [];
let particles = [];
let ufos = [];
let ufoBullets = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('asteroids-high') || '0', 10);
let lives = 3;
let level = 1;
let shootCooldown = 0;
let hyperspaceCooldown = 0;
let ufoTimer = timer(600);
let extraLifeScore = 10000;
let frameCount = 0;

highScoreEl.textContent = highScore;

document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }

  if (state === STATE.TITLE || state === STATE.GAME_OVER) {
    startGame();
  } else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyH') &&
             state === STATE.PLAYING && !ship.dead) {
    triggerHyperspace();
  } else if (e.code === 'KeyP' && state === STATE.PLAYING) {
    state = STATE.PAUSED;
    showOverlay('PAUSED', 'Press P to resume');
    stopThrust();
  } else if (e.code === 'KeyP' && state === STATE.PAUSED) {
    state = STATE.PLAYING;
    hideOverlay();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function startGame() {
  initAudio();
  score = 0;
  lives = 3;
  level = 1;
  extraLifeScore = 10000;
  ship = new Ship(W / 2, H / 2);
  bullets = [];
  particles = [];
  ufos = [];
  ufoBullets = [];
  ufoTimer = timer(600);
  state = STATE.PLAYING;
  hideOverlay();
  spawnAsteroids();
  updateHUD();
}

function spawnAsteroids() {
  asteroids = [];
  const count = 2 + level;
  for (let i = 0; i < count; i++) {
    let a;
    do {
      a = Asteroid.createRandom('large', W, H, speed(1 + level * 0.08));
    } while (a.x > W / 2 - 100 && a.x < W / 2 + 100 &&
             a.y > H / 2 - 100 && a.y < H / 2 + 100);
    asteroids.push(a);
  }
}

function nextLevel() {
  level++;
  ship.reset(W / 2, H / 2);
  ship.makeInvulnerable();
  bullets = [];
  ufoBullets = [];
  spawnAsteroids();
  ufoTimer = timer(600);
  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
  levelEl.textContent = level;
  livesEl.textContent = '▲'.repeat(Math.max(0, lives));
}

function showOverlay(title, subtitle = '') {
  overlayTitle.textContent = title;
  overlaySubtitle.textContent = subtitle;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function handleInput() {
  if (state !== STATE.PLAYING || ship.dead) return;

  if (keys['ArrowLeft'] || keys['KeyA']) ship.rotate(-1);
  if (keys['ArrowRight'] || keys['KeyD']) ship.rotate(1);
  if (keys['ArrowUp'] || keys['KeyW']) ship.thrust();

  playThrust(ship.thrusting);

  if (keys['Space'] && shootCooldown <= 0 && bullets.filter(b => !b.dead).length < 4) {
    const tip = ship.getVertices()[0];
    bullets.push(new Bullet(tip.x, tip.y, ship.angle));
    shootCooldown = timer(12);
    playShoot();
  }

}

function triggerHyperspace() {
  if (hyperspaceCooldown > 0) return;
  hyperspaceCooldown = timer(120);
  ship.x = rand(40, W - 40);
  ship.y = rand(40, H - 40);
  ship.vx = 0;
  ship.vy = 0;
  for (let i = 0; i < 8; i++) {
    particles.push(new Particle(ship.x, ship.y, 2, 20));
  }
  if (Math.random() < 0.1) {
    killShip();
  }
}

function killShip() {
  if (ship.invulnerableTime > 0) return;
  ship.dead = true;
  stopThrust();
  playExplosion(1.5);
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle(ship.x, ship.y, 5, 40));
  }
  lives--;
  updateHUD();
  state = STATE.DEAD;
  setTimeout(respawnShip, 1500 / GAME_SPEED);
}

function respawnShip() {
  if (lives <= 0) {
    state = STATE.GAME_OVER;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('asteroids-high', highScore);
    }
    showOverlay('GAME OVER', `Score: ${score} — Press any key`);
    updateHUD();
    return;
  }
  ship.reset(W / 2, H / 2);
  ship.dead = false;
  ship.makeInvulnerable();
  state = STATE.PLAYING;
}

function spawnExplosion(x, y, size = 1) {
  playExplosion(size);
  const count = Math.floor(8 + size * 8);
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, 2 + size * 2, 25 + size * 10));
  }
}

function checkCollisions() {
  for (const bullet of bullets) {
    if (bullet.dead) continue;

    for (const asteroid of asteroids) {
      if (asteroid.dead) continue;
      if (asteroid.collidesWith(bullet.x, bullet.y, bullet.radius)) {
        bullet.dead = true;
        asteroid.dead = true;
        score += asteroid.score;
        spawnExplosion(asteroid.x, asteroid.y, asteroid.radius / 20);
        const fragments = asteroid.split();
        asteroids.push(...fragments);
        checkExtraLife();
        updateHUD();
        break;
      }
    }

    for (const ufo of ufos) {
      if (ufo.dead) continue;
      if (Math.hypot(bullet.x - ufo.x, bullet.y - ufo.y) < ufo.radius + bullet.radius) {
        bullet.dead = true;
        ufo.dead = true;
        score += ufo.score;
        spawnExplosion(ufo.x, ufo.y, 1.2);
        checkExtraLife();
        updateHUD();
      }
    }
  }

  if (!ship.dead && ship.invulnerableTime <= 0) {
    for (const asteroid of asteroids) {
      if (asteroid.dead) continue;
      if (asteroid.collidesWith(ship.x, ship.y, ship.radius)) {
        killShip();
        return;
      }
    }

    for (const ufo of ufos) {
      if (ufo.dead) continue;
      if (Math.hypot(ship.x - ufo.x, ship.y - ufo.y) < ship.radius + ufo.radius) {
        killShip();
        return;
      }
    }

    for (const ub of ufoBullets) {
      if (ub.dead) continue;
      if (ship.collidesWith(ub.x, ub.y, ub.radius)) {
        killShip();
        return;
      }
    }
  }
}

function checkExtraLife() {
  if (score >= extraLifeScore) {
    lives++;
    extraLifeScore += 10000;
    playExtraLife();
    updateHUD();
  }
}

function updateUFOs() {
  ufoTimer--;
  if (ufoTimer <= 0 && ufos.filter(u => !u.dead).length === 0) {
    ufos.push(new UFO(W, H));
    ufoTimer = randInt(timer(600), timer(1200));
    playUfo();
  }

  for (const ufo of ufos) {
    if (ufo.dead) continue;
    ufo.update();
    if (ufo.canShoot() && !ship.dead) {
      ufoBullets.push(new UFOBullet(ufo.x, ufo.y, ship.x, ship.y));
    }
  }
}

function update() {
  if (state !== STATE.PLAYING && state !== STATE.DEAD) return;

  frameCount++;
  if (shootCooldown > 0) shootCooldown--;
  if (hyperspaceCooldown > 0) hyperspaceCooldown--;

  if (state === STATE.PLAYING) {
    handleInput();
    ship.update(W, H);
  }

  for (const a of asteroids) a.update(W, H);
  for (const b of bullets) b.update(W, H);
  for (const p of particles) p.update();
  updateUFOs();
  for (const ub of ufoBullets) ub.update(W, H);

  asteroids = asteroids.filter(a => !a.dead);
  bullets = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  ufos = ufos.filter(u => !u.dead);
  ufoBullets = ufoBullets.filter(ub => !ub.dead);

  if (state === STATE.PLAYING) {
    checkCollisions();
    if (asteroids.length === 0) {
      nextLevel();
    }
  }
}

function drawStarfield() {
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 80; i++) {
    const x = ((i * 137.5 + frameCount * speed(0.1 + (i % 3) * 0.05)) % W);
    const y = ((i * 97.3) % H);
    const brightness = 0.2 + (i % 5) * 0.15;
    ctx.globalAlpha = brightness;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawStarfield();

  for (const a of asteroids) a.draw(ctx);
  for (const ufo of ufos) ufo.draw(ctx);
  for (const b of bullets) b.draw(ctx);
  for (const ub of ufoBullets) ub.draw(ctx);
  for (const p of particles) p.draw(ctx);
  if (ship && !ship.dead) ship.draw(ctx);

}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

showOverlay('ASTEROIDS', 'Press any key to start');
gameLoop();
