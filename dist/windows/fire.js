// src/fire.ts
autowatch = 1;
inlets = 1;
outlets = 0;
var MIN_AWAIT_MS = 500;
var MAX_AWAIT_MS = 12e3;
var FRAME_MS = 33;
var MAX_PARTICLES_PER_PX = 360 / 140;
var SPAWN_PER_PX = 10 / 140;
var JET_SPACING = 24;
var RAMP = [
  [0, [1, 0.96, 0.78]],
  [0.15, [1, 0.82, 0.32]],
  [0.4, [1, 0.48, 0.08]],
  [0.7, [0.78, 0.16, 0.04]],
  [1, [0.35, 0.05, 0.03]]
];
var BLOB_RINGS = [
  [1, 0.28, 1],
  [0.62, 0.45, 0.6],
  [0.3, 0.55, 0.3]
];
var heat = 0;
var particles = [];
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;
var ticker = new Task(tick);
ticker.interval = FRAME_MS;
function awaitms(ms) {
  const t = Math.min(1, Math.max(0, (ms - MIN_AWAIT_MS) / (MAX_AWAIT_MS - MIN_AWAIT_MS)));
  heat = (1 - t) ** 1.5;
  if (heat > 0 && !ticker.running) {
    ticker.repeat();
  }
}
function rand(min, max) {
  return min + Math.random() * (max - min);
}
function rampColor(a) {
  for (let i = 1; i < RAMP.length; i++) {
    const [stop, rgb] = RAMP[i];
    if (a <= stop) {
      const [prevStop, prev] = RAMP[i - 1];
      const k = (a - prevStop) / (stop - prevStop);
      return [
        prev[0] + (rgb[0] - prev[0]) * k,
        prev[1] + (rgb[1] - prev[1]) * k,
        prev[2] + (rgb[2] - prev[2]) * k
      ];
    }
  }
  return RAMP[RAMP.length - 1][1];
}
function spawn(width, height) {
  const spark = Math.random() < 0.06;
  const jets = Math.max(2, Math.round(width / JET_SPACING));
  const jet = Math.floor(Math.random() * jets);
  const drift = Math.sin(Date.now() / 900 + jet * 2.4) * JET_SPACING * 0.3;
  particles.push({
    x: jet / (jets - 1) * width + drift + rand(-7, 7),
    y: height + rand(0, 4),
    vx: rand(-0.1, 0.1),
    vy: -(spark ? rand(1.6, 2.6) : rand(0.9, 1.6)) * (0.6 + 0.5 * heat),
    age: 0,
    life: (spark ? rand(40, 70) : rand(26, 46)) * (0.4 + 0.8 * heat),
    size: spark ? rand(0.7, 1.2) : rand(4, 7.5) * (0.6 + 0.5 * heat),
    phase: rand(0, Math.PI * 2),
    spark
  });
}
function tick() {
  const [width, height] = mgraphics.size;
  if (heat > 0) {
    const count = heat * SPAWN_PER_PX * width + Math.random();
    const maxParticles = MAX_PARTICLES_PER_PX * width;
    for (let i = 0; i < count && particles.length < maxParticles; i++) {
      spawn(width, height);
    }
  }
  for (const p of particles) {
    p.age++;
    p.x += p.vx + Math.sin(p.phase + p.age * 0.25) * (p.spark ? 0.5 : 0.25);
    p.y += p.vy;
  }
  particles = particles.filter((p) => p.age < p.life);
  mgraphics.redraw();
  if (heat <= 0 && particles.length === 0) {
    ticker.cancel();
  }
}
function drawBed(width, height) {
  const bedH = 4 + 6 * heat;
  const bed = mgraphics.pattern_create_linear(0, height, 0, height - bedH);
  bed.add_color_stop_rgba(0, 1, 0.55, 0.12, 0.35 * heat);
  bed.add_color_stop_rgba(1, 1, 0.35, 0.05, 0);
  mgraphics.set_source(bed);
  mgraphics.rectangle(0, height - bedH, width, bedH);
  mgraphics.fill();
}
function drawParticle(p) {
  const a = p.age / p.life;
  if (p.spark) {
    const [r, g, b] = rampColor(a * 0.5);
    const alpha2 = (1 - a) * (0.6 + 0.4 * Math.sin(p.age * 1.7 + p.phase));
    mgraphics.set_source_rgba(r, g, b, alpha2);
    mgraphics.ellipse(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    mgraphics.fill();
    return;
  }
  const radius = p.size * (1 - a * 0.7);
  const alpha = (1 - a) ** 1.2 * 0.8;
  for (const [scale, weight, cool] of BLOB_RINGS) {
    const [cr, cg, cb] = rampColor(a * cool);
    const rx = radius * scale;
    const ry = rx * 2;
    mgraphics.set_source_rgba(cr, cg, cb, alpha * weight);
    mgraphics.ellipse(p.x - rx, p.y - ry, rx * 2, ry * 2);
    mgraphics.fill();
  }
}
function paint() {
  const [width, height] = mgraphics.size;
  if (heat > 0) {
    drawBed(width, height);
  }
  for (const p of particles) {
    drawParticle(p);
  }
}
function notifydeleted() {
  ticker.cancel();
}
awaitms(4e3);
void awaitms;
void paint;
void notifydeleted;
