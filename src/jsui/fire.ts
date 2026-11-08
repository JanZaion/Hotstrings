autowatch = 1;
inlets = 1;
outlets = 0;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;
box.setattr('border', 0);

const MIN_MS = 500;
const MAX_MS = 12000;
const DEFAULT_MS = 4000;
const MAX_SPARKS = 48;
const FPS_MS = 33;

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  hot: number;
};

type Tongue = {
  lean: number;
  width: number;
  height: number;
  phase: number;
  kind: 'halo' | 'body' | 'core';
};

let intensity = idleToIntensity(DEFAULT_MS);
const sparks: Spark[] = [];
let spawnAcc = 0;
let tickCount = 0;
let running = false;
const tsk = new Task(tick);

function idleToIntensity(ms: number) {
  const t = Math.min(1, Math.max(0, (ms - MIN_MS) / (MAX_MS - MIN_MS)));
  return 1 - t;
}

function setIdle(ms: number) {
  intensity = idleToIntensity(ms);
}

function msg_float(v: number) {
  setIdle(v);
}

function msg_int(v: number) {
  setIdle(v);
}

function viewW() {
  const s = mgraphics.size;
  if (s && s[0] > 0) {
    return s[0];
  }
  return box.rect[2] - box.rect[0];
}

function viewH() {
  const s = mgraphics.size;
  if (s && s[1] > 0) {
    return s[1];
  }
  return box.rect[3] - box.rect[1];
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function heat() {
  return 0.12 + intensity * 0.88;
}

function fbm(x: number, y: number) {
  return (
    Math.sin(x) * 0.5 + Math.sin(x * 2.17 + y * 1.3) * 0.32 + Math.sin(x * 4.9 - y * 0.8) * 0.18
  );
}

function teardrop(t: number) {
  const tip = Math.pow(1 - t, 1.28);
  const bulge = 0.42 + 0.58 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.72);
  return tip * bulge;
}

function spawnSpark(w: number, h: number) {
  const ht = heat();
  const cx = w * 0.5;
  const baseY = h * 0.93;
  const flameH = h * (0.3 + ht * 0.6);
  const t = rand(0.05, 0.72);
  const spread = w * (0.04 + ht * 0.1) * teardrop(t);
  sparks.push({
    x: cx + rand(-spread, spread),
    y: baseY - t * flameH + rand(-2, 2),
    vx: rand(-0.22, 0.22) * (0.4 + ht),
    vy: -rand(0.45, 1.6) * (0.35 + ht * 1.1),
    life: 1,
    decay: rand(0.012, 0.03) / (0.45 + ht * 0.7),
    size: rand(0.45, 1.35) * (0.55 + ht * 0.7),
    hot: Math.random() < 0.35 + ht * 0.4 ? 1 : 0,
  });
}

function tick() {
  const w = viewW();
  const h = viewH();
  const ht = heat();
  tickCount += 1;
  const wind = Math.sin(tickCount * 0.041) * 0.32 + Math.sin(tickCount * 0.093) * 0.16;

  spawnAcc += 0.12 + ht * 1.55;
  while (spawnAcc >= 1 && sparks.length < MAX_SPARKS) {
    spawnAcc -= 1;
    spawnSpark(w, h);
  }
  if (spawnAcc > 3) {
    spawnAcc = 3;
  }

  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];
    p.vx += wind * 0.02;
    p.x += p.vx;
    p.y += p.vy;
    p.vy -= 0.008 * (0.3 + ht);
    p.x += (w * 0.5 - p.x) * 0.008;
    p.life -= p.decay;
    if (p.life <= 0 || p.y < -4) {
      sparks.splice(i, 1);
    }
  }

  mgraphics.redraw();
}

function fillRadial(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  inner: number[],
  outer: number[]
) {
  if (rx <= 0 || ry <= 0) {
    return;
  }
  const rad = Math.max(rx, ry);
  const grad = mgraphics.pattern_create_radial(cx, cy, 0, cx, cy, rad);
  grad.add_color_stop_rgba(0, inner[0], inner[1], inner[2], inner[3]);
  grad.add_color_stop_rgba(0.45, inner[0], inner[1] * 0.55, inner[2] * 0.3, inner[3] * 0.4);
  grad.add_color_stop_rgba(1, outer[0], outer[1], outer[2], outer[3]);
  mgraphics.set_source(grad);
  mgraphics.ellipse(cx - rx, cy - ry, rx * 2, ry * 2);
  mgraphics.fill();
}

function drawTongue(
  cx: number,
  baseY: number,
  flameW: number,
  flameH: number,
  time: number,
  tongue: Tongue,
  ht: number
) {
  const steps = 16;
  const leanAmt = tongue.lean * flameW * 1.15;
  const width = flameW * tongue.width;
  const height = flameH * tongue.height;
  if (width < 0.5 || height < 2) {
    return;
  }

  const tipX = cx + leanAmt + fbm(time * 0.9 + tongue.phase, 0.2) * width * 0.35;
  const tipY = baseY - height;

  mgraphics.move_to(cx, baseY);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const y = baseY - t * height;
    const wobble = fbm(time * 1.15 + tongue.phase, t * 6.2) * 0.22;
    const half = width * teardrop(t) * (1 + wobble);
    const x = cx + leanAmt * t * t + half;
    mgraphics.line_to(x, y);
  }
  mgraphics.line_to(tipX, tipY);
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const y = baseY - t * height;
    const wobble = fbm(time * 1.15 + tongue.phase + 2.1, t * 6.2) * 0.22;
    const half = width * teardrop(t) * (1 + wobble);
    const x = cx + leanAmt * t * t - half;
    mgraphics.line_to(x, y);
  }
  mgraphics.close_path();

  const grad = mgraphics.pattern_create_linear(cx, baseY, tipX, tipY);
  if (tongue.kind === 'halo') {
    grad.add_color_stop_rgba(0, 1, 0.22, 0.02, 0.2 * ht);
    grad.add_color_stop_rgba(0.4, 0.95, 0.12, 0.01, 0.1 * ht);
    grad.add_color_stop_rgba(1, 0.35, 0.02, 0, 0);
  } else if (tongue.kind === 'core') {
    grad.add_color_stop_rgba(0, 1, 0.98, 0.88, 0.92 * ht);
    grad.add_color_stop_rgba(0.35, 1, 0.88, 0.42, 0.72 * ht);
    grad.add_color_stop_rgba(0.75, 1, 0.55, 0.12, 0.22 * ht);
    grad.add_color_stop_rgba(1, 1, 0.35, 0.05, 0);
  } else {
    grad.add_color_stop_rgba(0, 1, 0.72, 0.22, 0.82 * ht);
    grad.add_color_stop_rgba(0.28, 1, 0.48, 0.06, 0.78 * ht);
    grad.add_color_stop_rgba(0.62, 1, 0.28, 0.02, 0.42 * ht);
    grad.add_color_stop_rgba(1, 0.55, 0.06, 0, 0);
  }
  mgraphics.set_source(grad);
  mgraphics.fill();
}

function paintSparks() {
  for (const p of sparks) {
    const a = p.life * (0.35 + p.hot * 0.45);
    if (a <= 0) {
      continue;
    }
    const g = p.hot ? 0.92 : 0.45 + p.life * 0.3;
    const b = p.hot ? 0.55 : 0.06;
    const rx = p.size * (0.55 + (1 - p.life) * 0.4);
    const ry = p.size * (1.4 + (1 - p.life) * 1.1);
    mgraphics.set_source_rgba(1, g, b, a * 0.35);
    mgraphics.ellipse(p.x - rx * 1.8, p.y - ry * 1.8, rx * 3.6, ry * 3.6);
    mgraphics.fill();
    mgraphics.set_source_rgba(1, Math.min(1, g + 0.15), b + 0.15, a);
    mgraphics.ellipse(p.x - rx, p.y - ry, rx * 2, ry * 2);
    mgraphics.fill();
  }
}

function paint() {
  const w = viewW();
  const h = viewH();
  if (w <= 1 || h <= 1) {
    return;
  }

  const ht = heat();
  const time = tickCount * 0.07;
  const sway = Math.sin(time * 0.85) * 0.42 + Math.sin(time * 1.63) * 0.2;
  const cx = w * 0.5 + sway * w * 0.02;
  const baseY = h * 0.94;
  const flameW = w * (0.13 + ht * 0.2);
  const flameH = h * (0.28 + ht * 0.64);

  fillRadial(
    cx,
    baseY,
    flameW * (1.8 + ht * 1.4),
    flameH * (0.22 + ht * 0.12),
    [1, 0.32, 0.04, 0.22 * ht],
    [0.4, 0.04, 0, 0]
  );

  const tongues: Tongue[] = [
    { lean: sway * 0.15, width: 1.7, height: 0.88, phase: 0.2, kind: 'halo' },
    { lean: -0.72 + sway * 0.35, width: 0.52, height: 0.7, phase: 1.4, kind: 'body' },
    { lean: 0.8 + sway * 0.28, width: 0.46, height: 0.62, phase: 2.7, kind: 'body' },
    { lean: sway * 0.55, width: 1, height: 1, phase: 0.6, kind: 'body' },
    { lean: sway * 0.35, width: 0.38, height: 0.52, phase: 3.1, kind: 'core' },
  ];

  for (const tongue of tongues) {
    drawTongue(cx, baseY, flameW, flameH, time, tongue, ht);
  }

  fillRadial(
    cx,
    baseY - flameH * 0.08,
    flameW * 0.34,
    flameH * 0.16,
    [1, 0.96, 0.82, 0.55 * ht],
    [1, 0.5, 0.08, 0]
  );

  paintSparks();
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
  box.setattr('border', 0);
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
