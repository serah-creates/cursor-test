(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('level');

  const W = canvas.width;
  const H = canvas.height;

  const STATE = { START: 'start', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameOver', LEVEL_CLEAR: 'levelClear' };

  const keys = {};
  let state = STATE.START;
  let score = 0;
  let lives = 3;
  let level = 1;
  let frame = 0;
  let lastTime = 0;

  const player = {
    x: W / 2 - 20,
    y: H - 60,
    w: 40,
    h: 24,
    speed: 320,
    cooldown: 0,
    invincible: 0,
  };

  let bullets = [];
  let alienBullets = [];
  let aliens = [];
  let particles = [];
  let alienDir = 1;
  let alienSpeed = 40;
  let alienDrop = 20;
  let alienMoveTimer = 0;
  let alienMoveInterval = 0.6;
  let alienShootTimer = 0;

  const ALIEN_ROWS = 5;
  const ALIEN_COLS = 11;
  const ALIEN_W = 36;
  const ALIEN_H = 28;
  const ALIEN_GAP_X = 14;
  const ALIEN_GAP_Y = 12;
  const ALIEN_START_X = 60;
  const ALIEN_START_Y = 80;

  const ALIEN_POINTS = [30, 20, 20, 10, 10];

  // Simple synth for retro sounds
  const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null;

  function playTone(freq, duration, type = 'square', volume = 0.08) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function playShoot() { playTone(880, 0.08, 'square', 0.05); }
  function playExplosion() { playTone(120, 0.25, 'sawtooth', 0.1); }
  function playAlienMove() { playTone(60 + Math.random() * 20, 0.04, 'square', 0.03); }
  function playPlayerHit() { playTone(200, 0.4, 'sawtooth', 0.12); }
  function playLevelClear() { playTone(523, 0.15); setTimeout(() => playTone(659, 0.15), 150); setTimeout(() => playTone(784, 0.3), 300); }

  function updateHUD() {
    scoreEl.textContent = `SCORE: ${String(score).padStart(4, '0')}`;
    livesEl.textContent = `LIVES: ${lives}`;
    levelEl.textContent = `LEVEL: ${level}`;
  }

  function createAliens() {
    aliens = [];
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        aliens.push({
          row,
          col,
          x: ALIEN_START_X + col * (ALIEN_W + ALIEN_GAP_X),
          y: ALIEN_START_Y + row * (ALIEN_H + ALIEN_GAP_Y),
          w: ALIEN_W,
          h: ALIEN_H,
          alive: true,
          type: row,
        });
      }
    }
    alienDir = 1;
    alienSpeed = 40 + level * 8;
    alienMoveInterval = Math.max(0.15, 0.6 - level * 0.04);
    alienMoveTimer = 0;
    alienShootTimer = 0;
  }

  function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 60 + Math.random() * 120;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function resetPlayer() {
    player.x = W / 2 - player.w / 2;
    player.invincible = 2;
  }

  function initGame() {
    score = 0;
    lives = 3;
    level = 1;
    bullets = [];
    alienBullets = [];
    particles = [];
    resetPlayer();
    createAliens();
    updateHUD();
    state = STATE.PLAYING;
  }

  function nextLevel() {
    level++;
    bullets = [];
    alienBullets = [];
    resetPlayer();
    createAliens();
    updateHUD();
    playLevelClear();
    state = STATE.PLAYING;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function getLivingAliens() {
    return aliens.filter(a => a.alive);
  }

  function getBottomAliensPerColumn() {
    const cols = {};
    for (const a of getLivingAliens()) {
      if (!cols[a.col] || a.row > cols[a.col].row) cols[a.col] = a;
    }
    return Object.values(cols);
  }

  function moveAliens(dt) {
    alienMoveTimer += dt;
    if (alienMoveTimer < alienMoveInterval) return;
    alienMoveTimer = 0;
    playAlienMove();

    const living = getLivingAliens();
    if (living.length === 0) return;

    let hitEdge = false;
    for (const a of living) {
      if ((alienDir > 0 && a.x + a.w >= W - 20) || (alienDir < 0 && a.x <= 20)) {
        hitEdge = true;
        break;
      }
    }

    if (hitEdge) {
      alienDir *= -1;
      for (const a of living) a.y += alienDrop;
    } else {
      const step = alienSpeed * alienMoveInterval * alienDir;
      for (const a of living) a.x += step;
    }

    for (const a of living) {
      if (a.y + a.h >= player.y) {
        state = STATE.GAME_OVER;
        playPlayerHit();
      }
    }
  }

  function alienShoot(dt) {
    alienShootTimer += dt;
    const living = getLivingAliens();
    if (living.length === 0) return;

    const shootInterval = Math.max(0.8, 2.2 - level * 0.15);
    if (alienShootTimer < shootInterval) return;
    alienShootTimer = 0;

    const shooters = getBottomAliensPerColumn();
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    if (shooter) {
      alienBullets.push({
        x: shooter.x + shooter.w / 2 - 2,
        y: shooter.y + shooter.h,
        w: 4,
        h: 12,
        speed: 200 + level * 15,
      });
    }
  }

  function updatePlayer(dt) {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= player.speed * dt;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += player.speed * dt;
    player.x = Math.max(10, Math.min(W - player.w - 10, player.x));

    if (player.cooldown > 0) player.cooldown -= dt;
    if (player.invincible > 0) player.invincible -= dt;

    if ((keys[' '] || keys['Space']) && player.cooldown <= 0 && state === STATE.PLAYING) {
      bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 4, h: 12, speed: 480 });
      player.cooldown = 0.35;
      playShoot();
    }
  }

  function updateBullets(dt) {
    bullets = bullets.filter(b => {
      b.y -= b.speed * dt;
      return b.y + b.h > 0;
    });

    alienBullets = alienBullets.filter(b => {
      b.y += b.speed * dt;
      return b.y < H;
    });
  }

  function getBunkers() {
    const bunkerY = H - 120;
    const bunkerW = 60;
    const bunkerH = 30;
    return [120, 280, 440, 600].map(cx => ({
      x: cx - bunkerW / 2,
      y: bunkerY,
      w: bunkerW,
      h: bunkerH,
    }));
  }

  function checkCollisions() {
    const bunkers = getBunkers();

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      let hit = false;

      for (const bunker of bunkers) {
        if (rectsOverlap(b, bunker)) {
          bullets.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;

      for (const a of aliens) {
        if (!a.alive) continue;
        if (rectsOverlap(b, a)) {
          a.alive = false;
          bullets.splice(i, 1);
          score += ALIEN_POINTS[a.type] || 10;
          spawnParticles(a.x + a.w / 2, a.y + a.h / 2, '#0f0');
          playExplosion();
          updateHUD();
          break;
        }
      }
    }

    for (let i = alienBullets.length - 1; i >= 0; i--) {
      const b = alienBullets[i];
      for (const bunker of bunkers) {
        if (rectsOverlap(b, bunker)) {
          alienBullets.splice(i, 1);
          break;
        }
      }
    }

    if (player.invincible <= 0) {
      for (let i = alienBullets.length - 1; i >= 0; i--) {
        const b = alienBullets[i];
        if (rectsOverlap(b, player)) {
          alienBullets.splice(i, 1);
          lives--;
          updateHUD();
          playPlayerHit();
          spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#f00', 12);
          if (lives <= 0) {
            state = STATE.GAME_OVER;
          } else {
            player.invincible = 2;
            alienBullets = [];
          }
          break;
        }
      }
    }

    if (getLivingAliens().length === 0 && state === STATE.PLAYING) {
      state = STATE.LEVEL_CLEAR;
    }
  }

  function updateParticles(dt) {
    particles = particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  function drawStars() {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137 + frame * 0.1) % W;
      const sy = (i * 97 + Math.sin(frame * 0.02 + i) * 3) % H;
      const size = (i % 3) + 1;
      ctx.globalAlpha = 0.3 + (i % 5) * 0.14;
      ctx.fillRect(sx, sy, size, size);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    if (player.invincible > 0 && Math.floor(frame / 6) % 2 === 0) return;

    const { x, y, w, h } = player;
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w / 2, y + h - 6);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#080';
    ctx.fillRect(x + w / 2 - 4, y + 8, 8, 10);
  }

  function drawAlien(a, animFrame) {
    const { x, y, w, h, type } = a;
    const colors = ['#f0f', '#f44', '#fa4', '#4af', '#4f4'];
    const color = colors[type] || '#0f0';
    const bob = animFrame ? 2 : 0;

    ctx.fillStyle = color;
    ctx.fillRect(x + 4, y + bob, w - 8, h - 8);

    ctx.fillStyle = '#000';
    ctx.fillRect(x + 8, y + 6 + bob, 6, 6);
    ctx.fillRect(x + w - 14, y + 6 + bob, 6, 6);

    ctx.fillStyle = color;
    ctx.fillRect(x, y + h - 8 + bob, 8, 4);
    ctx.fillRect(x + w - 8, y + h - 8 + bob, 8, 4);
    ctx.fillRect(x + w / 2 - 4, y + h - 4 + bob, 8, 4);
  }

  function drawBullets() {
    ctx.fillStyle = '#ff0';
    for (const b of bullets) ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = '#f44';
    for (const b of alienBullets) ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life * 2;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawBunkers() {
    ctx.fillStyle = '#0a0';
    for (const bunker of getBunkers()) {
      const { x, y, w, h } = bunker;
      ctx.fillRect(x, y, w, h);
      ctx.clearRect(x + 10, y, w - 20, 10);
      ctx.clearRect(x + 20, y + 10, w - 40, 10);
    }
  }

  function drawOverlay(text, subtext) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#0f0';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, H / 2 - 20);

    if (subtext) {
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText(subtext, W / 2, H / 2 + 30);
    }

    ctx.textAlign = 'left';
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    drawStars();
    drawBunkers();
    drawPlayer();

    const animFrame = Math.floor(frame / (alienMoveInterval * 60)) % 2;
    for (const a of aliens) {
      if (a.alive) drawAlien(a, animFrame);
    }

    drawBullets();
    drawParticles();

    if (state === STATE.START) {
      drawOverlay('SPACE INVADERS', 'Press SPACE to start');
    } else if (state === STATE.GAME_OVER) {
      drawOverlay('GAME OVER', `Final Score: ${score}  ·  Press SPACE to restart`);
    } else if (state === STATE.LEVEL_CLEAR) {
      drawOverlay(`LEVEL ${level} CLEAR!`, 'Press SPACE to continue');
    } else if (state === STATE.PAUSED) {
      drawOverlay('PAUSED', 'Press P to resume');
    }
  }

  function update(dt) {
    frame++;

    if (state === STATE.PLAYING) {
      updatePlayer(dt);
      updateBullets(dt);
      moveAliens(dt);
      alienShoot(dt);
      checkCollisions();
      updateParticles(dt);
    } else if (state === STATE.LEVEL_CLEAR || state === STATE.START || state === STATE.GAME_OVER) {
      updateParticles(dt);
    }
  }

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
  }

  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

      if (state === STATE.START) initGame();
      else if (state === STATE.GAME_OVER) initGame();
      else if (state === STATE.LEVEL_CLEAR) nextLevel();
    }

    if (e.key === 'p' || e.key === 'P') {
      if (state === STATE.PLAYING) state = STATE.PAUSED;
      else if (state === STATE.PAUSED) state = STATE.PLAYING;
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  updateHUD();
  requestAnimationFrame(gameLoop);
})();
