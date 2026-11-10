autowatch = 1;
inlets = 1;
outlets = 0;

const MIN_AWAIT_MS = 500;
const MAX_AWAIT_MS = 12000;
const MAX_HEIGHT = 0.34;
const TONGUES = 9;
const FRAME_MS = 40;

type Layer = { rgb: readonly [number, number, number]; scale: number; alpha: number };

const LAYERS: Layer[] = [
  { rgb: [0.85, 0.2, 0.05], scale: 1, alpha: 0.5 },
  { rgb: [1, 0.5, 0.1], scale: 0.7, alpha: 0.55 },
  { rgb: [1, 0.82, 0.35], scale: 0.4, alpha: 0.5 },
];

let heat = 0;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

const ticker = new Task(() => mgraphics.redraw());
ticker.interval = FRAME_MS;

function awaitms(ms: number) {
  const t = Math.min(1, Math.max(0, (ms - MIN_AWAIT_MS) / (MAX_AWAIT_MS - MIN_AWAIT_MS)));
  heat = (1 - t) ** 1.5;
  if (heat > 0 && !ticker.running) {
    ticker.repeat();
  } else if (heat <= 0 && ticker.running) {
    ticker.cancel();
  }
  mgraphics.redraw();
}

function flicker(i: number, time: number) {
  return (
    0.5 +
    0.25 * Math.sin(time * 7.3 + i * 2.1) +
    0.15 * Math.sin(time * 13.7 + i * 5.3) +
    0.1 * Math.sin(time * 3.1 + i * 1.7)
  );
}

function tongue(x: number, base: number, halfWidth: number, h: number, sway: number) {
  const tip = base - h;
  mgraphics.move_to(x - halfWidth, base);
  mgraphics.curve_to(
    x - halfWidth,
    base - h * 0.5,
    x + sway - halfWidth * 0.25,
    tip + h * 0.3,
    x + sway,
    tip
  );
  mgraphics.curve_to(
    x + sway + halfWidth * 0.25,
    tip + h * 0.3,
    x + halfWidth,
    base - h * 0.5,
    x + halfWidth,
    base
  );
  mgraphics.close_path();
}

function paint() {
  if (heat <= 0) {
    return;
  }
  const [width, height] = mgraphics.size;
  const time = Date.now() / 1000;
  const maxH = height * MAX_HEIGHT * heat;
  const step = width / TONGUES;

  for (const { rgb, scale, alpha } of LAYERS) {
    const [r, g, b] = rgb;
    const fade = mgraphics.pattern_create_linear(0, height, 0, height - maxH * scale);
    fade.add_color_stop_rgba(0, r, g, b, alpha * (0.5 + 0.5 * heat));
    fade.add_color_stop_rgba(1, r, g, b, 0);
    for (let i = 0; i < TONGUES; i++) {
      const h = maxH * scale * (0.45 + 0.55 * flicker(i + scale * 10, time));
      const sway = step * 0.35 * Math.sin(time * 2.3 + i * 1.3);
      tongue((i + 0.5) * step, height, step * 0.75, h, sway);
    }
    mgraphics.set_source(fade);
    mgraphics.fill();
  }
}

function notifydeleted() {
  ticker.cancel();
}

awaitms(4000);

void awaitms;
void paint;
void notifydeleted;
