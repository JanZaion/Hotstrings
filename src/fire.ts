autowatch = 1;
inlets = 1;
outlets = 0;

const MIN_AWAIT_MS = 500;
const MAX_AWAIT_MS = 12000;
const FRAME_MS = 33;
const CELL = 2;
const BG = 0.1411764705882353;
const COOL_BLUR_PASSES = 4;
const FIRE_H = 100;
const MAX_FLAME_H = 85;
const EMBERS_PER_PX = 0.004;
const MAX_EMBERS = 80;

type Rgb = [number, number, number];
type Rgba = [number, number, number, number];
type Ember = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  phase: number;
};

const PALETTE_STOPS: [number, Rgba][] = [
  [0, [0.2, 0.01, 0, 0]],
  [0.12, [0.45, 0.04, 0.01, 0.35]],
  [0.3, [0.8, 0.16, 0.02, 0.85]],
  [0.5, [0.98, 0.4, 0.04, 1]],
  [0.7, [1, 0.66, 0.14, 1]],
  [0.86, [1, 0.88, 0.45, 1]],
  [1, [1, 0.98, 0.85, 1]],
];

const PALETTE = Array.from({ length: 256 }, (_, i) => overBackground(paletteColor(i / 255)));

let heat = 0;
let peak = 0;
let cols = 0;
let rows = 0;
let scroll = 0;
let field = new Float32Array(0);
let source = new Float32Array(0);
let cooling = new Float32Array(0);
let image: Image | null = null;
let embers: Ember[] = [];

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

const ticker = new Task(tick);
ticker.interval = FRAME_MS;

function awaitms(ms: number) {
  const t = Math.min(1, Math.max(0, (ms - MIN_AWAIT_MS) / (MAX_AWAIT_MS - MIN_AWAIT_MS)));
  heat = (1 - t) ** 1.5;
  if (heat > 0 && !ticker.running) {
    ticker.repeat();
  }
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function paletteColor(v: number): Rgba {
  for (let i = 1; i < PALETTE_STOPS.length; i++) {
    const [stop, rgba] = PALETTE_STOPS[i];
    if (v <= stop) {
      const [prevStop, prev] = PALETTE_STOPS[i - 1];
      const k = (v - prevStop) / (stop - prevStop);
      return [
        prev[0] + (rgba[0] - prev[0]) * k,
        prev[1] + (rgba[1] - prev[1]) * k,
        prev[2] + (rgba[2] - prev[2]) * k,
        prev[3] + (rgba[3] - prev[3]) * k,
      ];
    }
  }
  return PALETTE_STOPS[PALETTE_STOPS.length - 1][1];
}

function overBackground([r, g, b, a]: Rgba): Rgb {
  return [BG + (r - BG) * a, BG + (g - BG) * a, BG + (b - BG) * a];
}

function smoothNoise(w: number, h: number) {
  let noise = Float32Array.from({ length: w * h }, () => Math.random());
  for (let pass = 0; pass < COOL_BLUR_PASSES; pass++) {
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += noise[((y + dy + h) % h) * w + ((x + dx + w) % w)];
          }
        }
        next[y * w + x] = sum / 9;
      }
    }
    noise = next;
  }
  let min = 1;
  let max = 0;
  for (const v of noise) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return noise.map(v => ((v - min) / (max - min)) ** 1.5);
}

function maxFlameHeight() {
  return MAX_FLAME_H * (0.35 + 0.65 * heat);
}

function resize(width: number, height: number) {
  const c = Math.ceil(width / CELL) + 1;
  const r = Math.ceil(Math.min(FIRE_H, height) / CELL);
  if ((c === cols && r === rows) || r < 2) {
    return;
  }
  cols = c;
  rows = r;
  scroll = 0;
  field = new Float32Array(c * r);
  source = new Float32Array(c);
  cooling = smoothNoise(c, r * 2);
  image = new Image(c, r);
}

function feedSource() {
  const bottom = (rows - 1) * cols;
  for (let x = 0; x < cols; x++) {
    source[x] = clamp(source[x] + rand(-0.35, 0.35), 0, 1);
  }
  for (let x = 0; x < cols; x++) {
    const left = source[Math.max(0, x - 1)];
    const right = source[Math.min(cols - 1, x + 1)];
    const s = (left + source[x] * 2 + right) / 4;
    field[bottom + x] = heat > 0 ? (0.6 + 0.4 * s) * (0.85 + 0.15 * heat) : field[bottom + x] * 0.7;
  }
}

function step() {
  feedSource();
  const decay = CELL / (maxFlameHeight() * 0.75);
  const coolRows = rows * 2;
  scroll = (scroll + 1) % coolRows;
  peak = 0;
  for (let y = 0; y < rows - 1; y++) {
    const below = (y + 1) * cols;
    const below2 = Math.min(y + 2, rows - 1) * cols;
    const coolRow = ((y + scroll) % coolRows) * cols;
    for (let x = 0; x < cols; x++) {
      const sx = Math.random() < 0.3 ? clamp(x + (Math.random() < 0.5 ? -1 : 1), 0, cols - 1) : x;
      const l = Math.max(0, sx - 1);
      const r = Math.min(cols - 1, sx + 1);
      const avg =
        (field[below + l] + field[below + sx] * 2 + field[below + r] + field[below2 + sx]) / 5;
      const v = Math.max(0, avg - decay * (0.15 + 1.7 * cooling[coolRow + x]));
      field[y * cols + x] = v;
      if (v > peak) {
        peak = v;
      }
    }
  }
}

function writeImage() {
  if (!image) {
    return;
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const [r, g, b] = PALETTE[Math.min(255, Math.floor(field[y * cols + x] * 255))];
      image.setpixel(x, y, r, g, b, 1);
    }
  }
}

function spawnEmber(width: number, height: number) {
  embers.push({
    x: rand(0, width),
    y: height - rand(maxFlameHeight() * 0.3, maxFlameHeight() * 0.7),
    vx: rand(-0.3, 0.3),
    vy: -rand(0.7, 1.6) * (0.6 + 0.6 * heat),
    age: 0,
    life: rand(30, 70),
    size: rand(0.5, 1.1),
    phase: rand(0, Math.PI * 2),
  });
}

function tick() {
  const [width, height] = mgraphics.size;
  resize(width, height);
  if (rows > 0) {
    step();
    writeImage();
  }
  if (heat > 0) {
    const count = heat * EMBERS_PER_PX * width + Math.random() * 0.4;
    for (let i = 0; i < Math.floor(count) && embers.length < MAX_EMBERS; i++) {
      spawnEmber(width, height);
    }
  }
  for (const e of embers) {
    e.age++;
    e.x += e.vx + Math.sin(e.phase + e.age * 0.2) * 0.4;
    e.y += e.vy;
  }
  embers = embers.filter(e => e.age < e.life);
  mgraphics.redraw();
  if (heat <= 0 && peak < 0.01 && embers.length === 0) {
    ticker.cancel();
  }
}

function drawEmber(e: Ember) {
  const a = e.age / e.life;
  const alpha = (1 - a) * (0.6 + 0.4 * Math.sin(e.age * 1.3 + e.phase));
  mgraphics.set_source_rgba(1, 0.8 - a * 0.4, 0.35 - a * 0.3, alpha);
  mgraphics.ellipse(e.x - e.size, e.y - e.size, e.size * 2, e.size * 2);
  mgraphics.fill();
}

function paint() {
  const height = mgraphics.size[1];
  if (image && peak > 0.01) {
    mgraphics.save();
    mgraphics.translate(0, height - rows * CELL);
    mgraphics.scale(CELL, CELL);
    mgraphics.image_surface_draw(image);
    mgraphics.restore();
  }
  for (const e of embers) {
    drawEmber(e);
  }
}

function notifydeleted() {
  ticker.cancel();
}

awaitms(4000);

void awaitms;
void paint;
void notifydeleted;
