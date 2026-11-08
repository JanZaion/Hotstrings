// src/jsui/fire.ts
autowatch = 1;
inlets = 1;
outlets = 0;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;
box.setattr("border", 0);
var MIN_MS = 500;
var MAX_MS = 12e3;
var DEFAULT_MS = 4e3;
var MAX_PARTICLES = 90;
var FPS_MS = 33;
var intensity = idleToIntensity(DEFAULT_MS);
var particles = [];
var spawnAcc = 0;
var tickCount = 0;
var running = false;
var tsk = new Task(tick);
function idleToIntensity(ms) {
  const t = Math.min(1, Math.max(0, (ms - MIN_MS) / (MAX_MS - MIN_MS)));
  return 1 - t;
}
function setIdle(ms) {
  intensity = idleToIntensity(ms);
}
function msg_float(v) {
  setIdle(v);
}
function msg_int(v) {
  setIdle(v);
}
function viewW() {
  return box.rect[2] - box.rect[0];
}
function viewH() {
  return box.rect[3] - box.rect[1];
}
function rand(min, max) {
  return min + Math.random() * (max - min);
}
function spawnOne(w, h) {
  const spread = (0.08 + intensity * 0.22) * w;
  const spark = Math.random() < 0.1 + intensity * 0.12;
  particles.push({
    x: w * 0.5 + rand(-spread, spread),
    y: h * rand(0.82, 0.96),
    vx: rand(-0.35, 0.35) * (0.35 + intensity),
    vy: -rand(0.55, 2.1) * (0.28 + intensity * 1.25),
    life: 1,
    decay: rand(0.016, 0.038) / (0.38 + intensity * 0.85),
    size: spark ? rand(0.8, 1.8) : rand(2.2, 6.4) * (0.35 + intensity * 1.05),
    spark: spark ? 1 : 0
  });
}
function tick() {
  const w = viewW();
  const h = viewH();
  tickCount += 1;
  const wind = Math.sin(tickCount * 0.045) * 0.28 + Math.sin(tickCount * 0.11) * 0.14;
  spawnAcc += 0.35 + intensity * 3.6;
  while (spawnAcc >= 1 && particles.length < MAX_PARTICLES) {
    spawnAcc -= 1;
    spawnOne(w, h);
  }
  if (spawnAcc > 4) {
    spawnAcc = 4;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vx += wind * 0.018;
    p.x += p.vx;
    p.y += p.vy;
    p.vy -= 0.01 * (0.25 + intensity);
    const rise = Math.max(0, 1 - p.y / h);
    p.x += (w * 0.5 - p.x) * (0.012 + rise * 0.03);
    p.life -= p.decay;
    if (p.life <= 0 || p.y < -p.size) {
      particles.splice(i, 1);
    }
  }
  mgraphics.redraw();
}
function drawEllipse(cx, cy, rx, ry, r, g, b, a) {
  if (a <= 0 || rx <= 0 || ry <= 0) {
    return;
  }
  mgraphics.set_source_rgba(r, g, b, a);
  mgraphics.ellipse(cx - rx, cy - ry, rx * 2, ry * 2);
  mgraphics.fill();
}
function particleColor(p) {
  const life = p.life;
  const col = { r: 1, g: 0.4, b: 0.05, a: 0.6 };
  if (p.spark) {
    col.r = 1;
    col.g = 0.92;
    col.b = 0.62;
    col.a = life * 0.95;
    return col;
  }
  if (life > 0.72) {
    const t = (life - 0.72) / 0.28;
    col.r = 1;
    col.g = 0.82 + t * 0.16;
    col.b = 0.32 + t * 0.5;
    col.a = 0.62 + t * 0.28;
  } else if (life > 0.38) {
    const t = (life - 0.38) / 0.34;
    col.r = 1;
    col.g = 0.32 + t * 0.5;
    col.b = 0.04 + t * 0.28;
    col.a = 0.5 + t * 0.14;
  } else {
    const t = life / 0.38;
    col.r = 0.5 + t * 0.5;
    col.g = 0.04 + t * 0.28;
    col.b = 0.015;
    col.a = t * 0.48;
  }
  return col;
}
function paint() {
  const w = viewW();
  const h = viewH();
  const flicker = 0.82 + Math.sin(tickCount * 0.31) * 0.08 + Math.random() * 0.1;
  const heat = intensity * flicker;
  const cx = w * 0.5;
  const baseY = h * 0.9;
  drawEllipse(
    cx,
    baseY,
    (10 + heat * 26) * (w / 70),
    (7 + heat * 16) * (h / 90),
    0.9,
    0.18,
    0.02,
    0.12 + heat * 0.18
  );
  drawEllipse(
    cx,
    baseY + h * 0.02,
    (6 + heat * 16) * (w / 70),
    (4 + heat * 9) * (h / 90),
    1,
    0.35,
    0.04,
    0.16 + heat * 0.22
  );
  drawEllipse(
    cx,
    baseY + h * 0.03,
    (3 + heat * 8) * (w / 70),
    (2 + heat * 4) * (h / 90),
    1,
    0.7,
    0.25,
    0.2 + heat * 0.28
  );
  for (const p of particles) {
    const col = particleColor(p);
    const rx = p.size * (0.7 + (1 - p.life) * 0.35);
    const ry = p.size * (1.15 + (1 - p.life) * 0.55);
    drawEllipse(p.x, p.y, rx * 1.8, ry * 1.8, col.r, col.g * 0.55, col.b * 0.4, col.a * 0.22);
    drawEllipse(p.x, p.y, rx, ry, col.r, col.g, col.b, col.a);
    if (p.life > 0.55 && !p.spark) {
      drawEllipse(p.x, p.y + ry * 0.15, rx * 0.4, ry * 0.35, 1, 0.95, 0.75, (p.life - 0.55) * 0.7);
    }
  }
}
function startTask() {
  if (running) {
    return;
  }
  tsk.interval = FPS_MS;
  tsk.repeat();
  running = true;
}
function loadbang() {
  box.setattr("border", 0);
  startTask();
}
function notifydeleted() {
  tsk.cancel();
  running = false;
}
startTask();
void msg_float;
void msg_int;
void paint;
void loadbang;
void notifydeleted;
