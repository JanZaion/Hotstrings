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
var MASCOT_FALLBACK_W = 363;
var MASCOT_FALLBACK_H = 512;
var FPS = 30;
var EASE = 0.08;
var MAX_PARTICLES = 120;
var GRADE_STEPS = 12;
var BOB_HZ_COLD = 0.3;
var BOB_HZ_HOT = 2.4;
var HOP_HOT = 0.09;
var SQUASH_HOT = 0.14;
var AURA_COLD = [0.42, 0.5, 0.64];
var AURA_HOT = [1, 0.6, 0.12];
var AURA_PLAYFUL = [1, 0.28, 0.66];
var RAY_COLOR = [1, 0.92, 0.55];
var SMOKE_COLOR = [0.56, 0.58, 0.63];
var Z_COLOR = [0.66, 0.72, 0.84];
var EMBER_COLORS = [
  [1, 0.95, 0.6],
  [1, 0.72, 0.16],
  [1, 0.42, 0.1],
  [1, 0.4, 0.72],
  [1, 1, 1]
];
var SPARKLE_COLORS = [
  [1, 1, 1],
  [1, 0.95, 0.55],
  [1, 0.6, 0.85],
  [0.6, 0.9, 1]
];
var source = new Image("nhb.png");
var graded = [];
var target = idleToIntensity(DEFAULT_MS);
var shown = target;
var time = 0;
var phase = 0;
var lastTick = Date.now();
var particles = [];
var spawnDebt = { ember: 0, sparkle: 0, smoke: 0, z: 0 };
var motion = computeMotion();
var anim = new Task(tick);
anim.interval = 1e3 / FPS;
anim.repeat();
function idleToIntensity(ms) {
  const t = Math.min(1, Math.max(0, (ms - MIN_MS) / (MAX_MS - MIN_MS)));
  return 1 - t;
}
function setIdle(ms) {
  target = idleToIntensity(ms);
}
function msg_float(v) {
  setIdle(v);
}
function msg_int(v) {
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
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function mix(a, b, t) {
  const out = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  return out;
}
function smoothstep(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function rand(a, b) {
  return a + Math.random() * (b - a);
}
function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}
function sourceSize() {
  const s = source.size;
  if (s && s[0] > 1 && s[1] > 1) {
    return { iw: s[0], ih: s[1] };
  }
  return { iw: MASCOT_FALLBACK_W, ih: MASCOT_FALLBACK_H };
}
function mascotLayout(w, h) {
  const { iw, ih } = sourceSize();
  const maxW = w * 0.68;
  const maxH = h * 0.72;
  const aspect = iw / ih;
  let dw = maxW;
  let dh = dw / aspect;
  if (dh > maxH) {
    dh = maxH;
    dw = dh * aspect;
  }
  const x = (w - dw) * 0.5;
  const y = h - h * 0.09 - dh;
  return { x, y, dw, dh };
}
function applyGrade(img, ht) {
  const desat = (1 - ht) * 0.8;
  if (desat > 0.01) {
    img.blendchannel(source, desat, "green", "red");
    img.blendchannel(source, desat, "green", "blue");
  }
  img.adjustchannel("red", lerp(0.48, 1.14, ht), lerp(0.02, 0, ht));
  img.adjustchannel("green", lerp(0.5, 1.08, ht), lerp(0.03, 0.02, ht));
  img.adjustchannel("blue", lerp(0.64, 0.88, ht), lerp(0.07, 0, ht));
}
function gradedImage() {
  const s = source.size;
  if (!s || s[0] <= 1 || s[1] <= 1) {
    return null;
  }
  const step = Math.round(shown * GRADE_STEPS);
  const cached = graded[step];
  if (cached) {
    return cached;
  }
  const img = new Image(source);
  applyGrade(img, step / GRADE_STEPS);
  graded[step] = img;
  return img;
}
function freeGraded() {
  for (const img of graded) {
    if (img) {
      img.freepeer();
    }
  }
  graded.length = 0;
}
function computeMotion() {
  const hot = shown;
  const cold = 1 - hot;
  const air = Math.abs(Math.sin(Math.PI * phase));
  const contact = Math.pow(1 - air, 6);
  const hopAmp = HOP_HOT * Math.pow(hot, 1.5);
  const squash = SQUASH_HOT * hot;
  const breath = Math.sin(2 * Math.PI * phase) * 0.025 * cold;
  const sag = lerp(0.88, 1, hot);
  const sx = (1 + contact * squash - air * squash * 0.3 + breath * 0.5) * lerp(1.06, 1, hot);
  const sy = (1 - contact * squash + air * squash * 0.4 + breath) * sag;
  const wobble = Math.sin(time * lerp(1.2, 9, hot)) * lerp(0.02, 0.09, hot);
  const droop = -0.07 * Math.pow(cold, 2);
  return { hop: air * hopAmp, sx, sy, rot: wobble + droop, air };
}
function spawn(kind) {
  if (particles.length >= MAX_PARTICLES) {
    return;
  }
  const lift = -motion.hop;
  const hot = shown;
  if (kind === "ember") {
    particles.push({
      kind,
      x: rand(0.15, 0.85),
      y: rand(0.05, 0.4) + lift,
      vx: rand(-0.12, 0.12),
      vy: -rand(0.25, 0.7) * lerp(0.6, 1.4, hot),
      age: 0,
      life: rand(0.5, 1.2),
      size: rand(8e-3, 0.022),
      color: pick(EMBER_COLORS),
      seed: Math.random() * 10
    });
    return;
  }
  if (kind === "sparkle") {
    const a = rand(0, Math.PI * 2);
    const r = rand(0.45, 0.7);
    particles.push({
      kind,
      x: 0.5 + Math.cos(a) * r,
      y: 0.45 + Math.sin(a) * r * 0.75 + lift,
      vx: Math.cos(a) * 0.05,
      vy: -rand(0.02, 0.1),
      age: 0,
      life: rand(0.5, 0.9),
      size: rand(0.03, 0.06),
      color: pick(SPARKLE_COLORS),
      seed: Math.random() * 10
    });
    return;
  }
  if (kind === "smoke") {
    particles.push({
      kind,
      x: rand(0.3, 0.7),
      y: rand(0.02, 0.15) + lift,
      vx: rand(-0.03, 0.03),
      vy: -rand(0.05, 0.11),
      age: 0,
      life: rand(2.5, 4),
      size: rand(0.04, 0.07),
      color: SMOKE_COLOR,
      seed: Math.random() * 10
    });
    return;
  }
  particles.push({
    kind,
    x: 0.78,
    y: 0.25 + lift,
    vx: 0.06,
    vy: -0.09,
    age: 0,
    life: 3.2,
    size: rand(0.07, 0.1),
    color: Z_COLOR,
    seed: Math.random() * 10
  });
}
function spawnRates() {
  const hot = shown;
  const rates = {
    ember: 50 * smoothstep(0.12, 1, hot),
    sparkle: 7 * smoothstep(0.55, 1, hot),
    smoke: 2.5 * (1 - smoothstep(0, 0.5, hot)),
    z: 0.55 * (1 - smoothstep(0.05, 0.25, hot))
  };
  return rates;
}
function stepParticles(dt) {
  const rates = spawnRates();
  for (const kind of Object.keys(rates)) {
    spawnDebt[kind] += rates[kind] * dt;
    while (spawnDebt[kind] >= 1) {
      spawnDebt[kind] -= 1;
      spawn(kind);
    }
  }
  particles = particles.filter((p) => {
    p.age += dt;
    if (p.age >= p.life) {
      return false;
    }
    const sway = p.kind === "smoke" || p.kind === "z" ? Math.sin(time * 2 + p.seed) * 0.04 : 0;
    p.x += (p.vx + sway) * dt;
    p.y += p.vy * dt;
    if (p.kind === "ember") {
      p.vx += Math.sin(time * 6 + p.seed) * 0.4 * dt;
    }
    return true;
  });
}
function tick() {
  const now = Date.now();
  const dt = Math.min(0.1, Math.max(1e-3, (now - lastTick) / 1e3));
  lastTick = now;
  shown += (target - shown) * EASE;
  if (Math.abs(target - shown) < 5e-4) {
    shown = target;
  }
  time += dt;
  phase += dt * lerp(BOB_HZ_COLD, BOB_HZ_HOT, shown);
  motion = computeMotion();
  stepParticles(dt);
  mgraphics.redraw();
}
function drawAura(cx, cy, w, h) {
  const hot = shown;
  const pulse = Math.sin(time * lerp(1, 6, hot)) * lerp(0.01, 0.07, hot);
  const r = Math.min(w, h) * lerp(0.22, 0.52, hot) * (1 + pulse);
  const playful = smoothstep(0.75, 1, hot) * (0.5 + 0.5 * Math.sin(time * 2.2)) * 0.65;
  const c = mix(AURA_COLD, mix(AURA_HOT, AURA_PLAYFUL, playful), hot);
  const a = lerp(0.06, 0.72, hot) * (1 + pulse);
  const pat = mgraphics.pattern_create_radial(cx, cy, 0, cx, cy, r);
  pat.add_color_stop_rgba(0, c[0], c[1], c[2], a);
  pat.add_color_stop_rgba(0.45, c[0], c[1], c[2], a * 0.4);
  pat.add_color_stop_rgba(1, c[0], c[1], c[2], 0);
  mgraphics.set_source(pat);
  mgraphics.rectangle(0, 0, w, h);
  mgraphics.fill();
}
function drawRays(cx, cy, w, h) {
  const k = smoothstep(0.6, 1, shown);
  if (k <= 0) {
    return;
  }
  const count = 12;
  const len = Math.min(w, h) * 0.6;
  const spin = time * 0.6;
  for (let i = 0; i < count; i++) {
    const a = spin + i / count * Math.PI * 2;
    const l = len * (i % 2 === 0 ? 1 : 0.7) * (1 + 0.08 * Math.sin(time * 5 + i));
    const hw = 0.08;
    mgraphics.move_to(cx, cy);
    mgraphics.line_to(cx + Math.cos(a - hw) * l, cy + Math.sin(a - hw) * l);
    mgraphics.line_to(cx + Math.cos(a + hw) * l, cy + Math.sin(a + hw) * l);
    mgraphics.close_path();
  }
  const pat = mgraphics.pattern_create_radial(cx, cy, 0, cx, cy, len);
  pat.add_color_stop_rgba(0, RAY_COLOR[0], RAY_COLOR[1], RAY_COLOR[2], 0.4 * k);
  pat.add_color_stop_rgba(1, RAY_COLOR[0], RAY_COLOR[1], RAY_COLOR[2], 0);
  mgraphics.set_source(pat);
  mgraphics.fill();
}
function drawShadow(layout) {
  const sw = layout.dw * 0.62 * (1 - motion.air * 0.3) * motion.sx;
  const sh = layout.dh * 0.06 * (1 - motion.air * 0.3);
  const cx = layout.x + layout.dw * 0.5;
  const cy = layout.y + layout.dh;
  mgraphics.set_source_rgba(0, 0, 0, lerp(0.18, 0.3, shown) * (1 - motion.air * 0.4));
  mgraphics.ellipse(cx - sw * 0.5, cy - sh * 0.5, sw, sh);
  mgraphics.fill();
}
function drawMascot(layout, img) {
  const s = img.size;
  if (!s || s[0] <= 1 || s[1] <= 1) {
    return;
  }
  mgraphics.save();
  mgraphics.translate(layout.x + layout.dw * 0.5, layout.y + layout.dh - motion.hop * layout.dh);
  mgraphics.rotate(motion.rot);
  mgraphics.scale(motion.sx, motion.sy);
  mgraphics.translate(-layout.dw * 0.5, -layout.dh);
  mgraphics.scale(layout.dw / s[0], layout.dh / s[1]);
  mgraphics.image_surface_draw(img);
  mgraphics.restore();
}
function drawSparkle(x, y, r) {
  const t = r * 0.18;
  mgraphics.move_to(x, y - r);
  mgraphics.line_to(x + t, y - t);
  mgraphics.line_to(x + r, y);
  mgraphics.line_to(x + t, y + t);
  mgraphics.line_to(x, y + r);
  mgraphics.line_to(x - t, y + t);
  mgraphics.line_to(x - r, y);
  mgraphics.line_to(x - t, y - t);
  mgraphics.close_path();
  mgraphics.fill();
}
function drawParticles(layout) {
  const unit = layout.dh;
  for (const p of particles) {
    const f = p.age / p.life;
    const x = layout.x + p.x * layout.dw;
    const y = layout.y + p.y * layout.dh;
    const [r, g, b] = p.color;
    if (p.kind === "ember") {
      const size = p.size * unit * (1 - f * 0.6);
      const a = (1 - f) * (0.7 + 0.3 * Math.sin(time * 20 + p.seed));
      mgraphics.set_source_rgba(r, g * 0.8, b * 0.6, a * 0.25);
      mgraphics.ellipse(x - size * 2, y - size * 2, size * 4, size * 4);
      mgraphics.fill();
      mgraphics.set_source_rgba(r, g, b, a);
      mgraphics.ellipse(x - size, y - size, size * 2, size * 2);
      mgraphics.fill();
    } else if (p.kind === "sparkle") {
      const size = p.size * unit * Math.sin(Math.PI * f);
      mgraphics.set_source_rgba(r, g, b, 0.9);
      drawSparkle(x, y, size);
    } else if (p.kind === "smoke") {
      const size = p.size * unit * (1 + f * 2.2);
      mgraphics.set_source_rgba(r, g, b, 0.22 * Math.sin(Math.PI * f));
      mgraphics.ellipse(x - size, y - size, size * 2, size * 2);
      mgraphics.fill();
    } else {
      const size = p.size * unit * (0.6 + f * 0.8);
      mgraphics.set_source_rgba(r, g, b, 0.85 * Math.sin(Math.PI * f));
      mgraphics.select_font_face("Arial Bold");
      mgraphics.set_font_size(size);
      mgraphics.move_to(x, y);
      mgraphics.show_text("z");
    }
  }
}
function paint() {
  const w = viewW();
  const h = viewH();
  if (w <= 1 || h <= 1) {
    return;
  }
  const img = gradedImage();
  if (!img) {
    return;
  }
  const layout = mascotLayout(w, h);
  const cx = layout.x + layout.dw * 0.5;
  const cy = layout.y + layout.dh * (0.55 - motion.hop * 0.5);
  drawAura(cx, cy, w, h);
  drawRays(cx, cy, w, h);
  drawShadow(layout);
  drawMascot(layout, img);
  drawParticles(layout);
}
function loadbang() {
  box.setattr("border", 0);
  lastTick = Date.now();
  anim.cancel();
  anim.repeat();
}
function notifydeleted() {
  anim.cancel();
  freeGraded();
}
void msg_float;
void msg_int;
void paint;
void loadbang;
void notifydeleted;
