let ctx = null;

export function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
}

function resume() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, duration, type = 'square', volume = 0.08) {
  if (!ctx) return;
  resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playShoot() {
  tone(880, 0.08, 'square', 0.06);
}

export function playExplosion(size = 1) {
  if (!ctx) return;
  resume();
  const duration = 0.3 + size * 0.15;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15 * size, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playThrust(active) {
  if (!ctx) return;
  resume();
  if (active && !playThrust._osc) {
    playThrust._osc = ctx.createOscillator();
    playThrust._gain = ctx.createGain();
    playThrust._osc.type = 'sawtooth';
    playThrust._osc.frequency.value = 55;
    playThrust._gain.gain.value = 0.02;
    playThrust._osc.connect(playThrust._gain);
    playThrust._gain.connect(ctx.destination);
    playThrust._osc.start();
  } else if (!active && playThrust._osc) {
    playThrust._osc.stop();
    playThrust._osc = null;
    playThrust._gain = null;
  }
}

export function playExtraLife() {
  tone(523, 0.1, 'square', 0.08);
  setTimeout(() => tone(659, 0.1, 'square', 0.08), 100);
  setTimeout(() => tone(784, 0.2, 'square', 0.08), 200);
}

export function playUfo() {
  if (!ctx) return;
  resume();
  tone(200 + Math.random() * 400, 0.15, 'sine', 0.04);
}

export function stopThrust() {
  playThrust(false);
}
