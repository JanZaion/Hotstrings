import { hotstringSections } from '../hotstringCatalog';

autowatch = 1;
inlets = 1;
outlets = 0;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

type RGB = [number, number, number];

const BG: RGB = [0.09, 0.088, 0.085];
const INK: RGB = [0.93, 0.91, 0.86];
const MUTED: RGB = [0.56, 0.54, 0.5];
const AMBER: RGB = [0.86, 0.52, 0.16];
const CAP_TOP: RGB = [0.27, 0.262, 0.248];
const CAP_BOTTOM: RGB = [0.2, 0.195, 0.186];
const SKIRT: RGB = [0.045, 0.043, 0.041];
const PRESSED_TOP: RGB = [0.97, 0.64, 0.27];
const PRESSED_BOTTOM: RGB = [0.84, 0.49, 0.14];
const PRESSED_INK: RGB = [0.13, 0.09, 0.05];

const TOP = 68;
const PAD_X = 16;
const GROUP_H = 36;
const ITEM_H = 28;
const LIST_PAD_BOTTOM = 18;
const CAP_H = 18;
const CAP_DEPTH = 3;
const CAP_R = 4;
const CAP_PAD = 7;
const CAP_MIN_W = 22;
const CAP_FONT = 10;
const PLUS_W = 13;
const DESC_GAP = 16;
const FADE_TOP = 16;
const FADE_BOTTOM = 22;
const SB_W = 5;
const SB_PAD = 5;

type DrawRow =
  | { kind: 'group'; title: string; count: number; h: number }
  | { kind: 'item'; caps: string[]; desc: string; h: number };

const rows = buildRows();
const contentH = rows.reduce((sum, row) => sum + row.h, 0) + LIST_PAD_BOTTOM;
const itemCount = rows.reduce((n, row) => n + (row.kind === 'item' ? 1 : 0), 0);

let scrollY = 0;
let dragOrigin = 0;
let dragScroll = 0;
let draggingList = false;
let draggingThumb = false;
let hoverRow = -1;
let mouseX = -1;
let mouseY = -1;
let keyColW = 0;

function buildRows() {
  const out: DrawRow[] = [];
  for (const section of hotstringSections()) {
    out.push({ kind: 'group', title: section.title, count: section.items.length, h: GROUP_H });
    const combos = section.title === 'Hotkeys';
    for (const item of section.items) {
      out.push({
        kind: 'item',
        caps: combos ? item.key.split('+') : [item.key],
        desc: item.desc,
        h: ITEM_H,
      });
    }
  }
  return out;
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

function listH() {
  return Math.max(0, viewH() - TOP);
}

function maxScroll() {
  return Math.max(0, contentH - listH());
}

function setScroll(next: number) {
  const max = maxScroll();
  scrollY = Math.min(max, Math.max(0, next));
  updateHover();
  mgraphics.redraw();
}

function sbGeom() {
  const trackH = listH();
  const x = viewW() - SB_PAD - SB_W;
  const y = TOP + 4;
  const body = Math.max(0, trackH - 12);
  const thumbH = Math.max(24, body * (trackH / Math.max(trackH, contentH)));
  const travel = Math.max(0, body - thumbH);
  const thumbY = y + (maxScroll() === 0 ? 0 : (scrollY / maxScroll()) * travel);
  return { x, y, body, thumbH, thumbY, travel };
}

function fill(rgb: RGB, a = 1) {
  mgraphics.set_source_rgba(rgb[0], rgb[1], rgb[2], a);
}

function font(size: number, bold: boolean) {
  mgraphics.select_font_face(bold ? 'Arial Bold' : 'Arial');
  mgraphics.set_font_size(size);
}

function textAt(x: number, y: number, size: number, bold: boolean, rgb: RGB, text: string) {
  font(size, bold);
  fill(rgb);
  mgraphics.move_to(x, y);
  mgraphics.show_text(text);
}

function trackedText(x: number, y: number, size: number, rgb: RGB, text: string, tracking: number) {
  font(size, true);
  fill(rgb);
  let cx = x;
  for (const ch of text) {
    mgraphics.move_to(cx, y);
    mgraphics.show_text(ch);
    cx += mgraphics.text_measure(ch)[0] + tracking;
  }
  return cx - x;
}

function ellipsize(text: string, maxW: number) {
  if (mgraphics.text_measure(text)[0] <= maxW) {
    return text;
  }
  let s = text;
  while (s.length > 1 && mgraphics.text_measure(`${s}…`)[0] > maxW) {
    s = s.slice(0, -1);
  }
  return `${s}…`;
}

function verticalGradient(y0: number, y1: number, top: RGB, bottom: RGB, a0 = 1, a1 = 1) {
  const g = mgraphics.pattern_create_linear(0, y0, 0, y1);
  g.add_color_stop_rgba(0, top[0], top[1], top[2], a0);
  g.add_color_stop_rgba(1, bottom[0], bottom[1], bottom[2], a1);
  mgraphics.set_source(g);
}

function capWidth(label: string) {
  font(CAP_FONT, true);
  return Math.max(CAP_MIN_W, Math.ceil(mgraphics.text_measure(label)[0]) + CAP_PAD * 2);
}

function comboWidth(caps: string[]) {
  return caps.reduce((sum, cap) => sum + capWidth(cap), 0) + (caps.length - 1) * PLUS_W;
}

function capBaseline(capY: number) {
  return capY + (CAP_H + CAP_FONT * 0.72) / 2;
}

function drawKeycap(x: number, y: number, label: string, pressed: boolean) {
  const w = capWidth(label);
  const faceY = pressed ? y + CAP_DEPTH - 1 : y;

  fill(SKIRT);
  mgraphics.rectangle_rounded(x, y + CAP_DEPTH, w, CAP_H, CAP_R * 2, CAP_R * 2);
  mgraphics.fill();

  verticalGradient(
    faceY,
    faceY + CAP_H,
    pressed ? PRESSED_TOP : CAP_TOP,
    pressed ? PRESSED_BOTTOM : CAP_BOTTOM
  );
  mgraphics.rectangle_rounded(x, faceY, w, CAP_H, CAP_R * 2, CAP_R * 2);
  mgraphics.fill();

  mgraphics.set_source_rgba(1, 1, 1, pressed ? 0.35 : 0.13);
  mgraphics.set_line_width(1);
  mgraphics.move_to(x + CAP_R, faceY + 0.5);
  mgraphics.line_to(x + w - CAP_R, faceY + 0.5);
  mgraphics.stroke();

  font(CAP_FONT, true);
  const tw = mgraphics.text_measure(label)[0];
  textAt(x + (w - tw) / 2, capBaseline(faceY), CAP_FONT, true, pressed ? PRESSED_INK : INK, label);
  return w;
}

function drawKeyCombo(x: number, y: number, caps: string[], pressed: boolean) {
  let cx = x;
  caps.forEach((cap, i) => {
    if (i > 0) {
      font(CAP_FONT, true);
      const pw = mgraphics.text_measure('+')[0];
      textAt(cx + (PLUS_W - pw) / 2, capBaseline(y), CAP_FONT, true, MUTED, '+');
      cx += PLUS_W;
    }
    cx += drawKeycap(cx, y, cap, pressed);
  });
}

function measureKeyColumn() {
  let max = 0;
  for (const row of rows) {
    if (row.kind === 'item') {
      max = Math.max(max, comboWidth(row.caps));
    }
  }
  keyColW = max;
}

function contentRight() {
  return viewW() - SB_PAD * 2 - SB_W - 4;
}

function drawGroup(y: number, row: Extract<DrawRow, { kind: 'group' }>) {
  const baseline = y + 25;
  const titleW = trackedText(PAD_X, baseline, 9, AMBER, row.title.toUpperCase(), 1.4);
  const countX = PAD_X + titleW + 6;
  textAt(countX, baseline, 9, false, MUTED, String(row.count));
  font(9, false);
  const ruleX = countX + mgraphics.text_measure(String(row.count))[0] + 10;
  const ruleRight = contentRight();
  if (ruleRight > ruleX) {
    mgraphics.set_source_rgba(1, 1, 1, 0.08);
    mgraphics.set_line_width(1);
    mgraphics.move_to(ruleX, baseline - 3.5);
    mgraphics.line_to(ruleRight, baseline - 3.5);
    mgraphics.stroke();
  }
}

function drawItem(y: number, row: Extract<DrawRow, { kind: 'item' }>, hovered: boolean) {
  const w = viewW();
  if (hovered) {
    fill(AMBER, 0.07);
    mgraphics.rectangle(0, y, w, row.h);
    mgraphics.fill();
    fill(AMBER);
    mgraphics.rectangle(0, y + 5, 2, row.h - 10);
    mgraphics.fill();
  }
  const capY = y + Math.floor((row.h - CAP_H - CAP_DEPTH) / 2);
  drawKeyCombo(PAD_X, capY, row.caps, hovered);

  const descX = PAD_X + keyColW + DESC_GAP;
  const descW = contentRight() - descX;
  font(10, false);
  textAt(
    descX,
    capBaseline(capY) + 0.5,
    10,
    false,
    hovered ? INK : MUTED,
    ellipsize(row.desc, descW)
  );
}

function drawHeader() {
  const w = viewW();
  fill(BG);
  mgraphics.rectangle(0, 0, w, TOP);
  mgraphics.fill();

  trackedText(PAD_X, 22, 8, AMBER, 'KEYBOARD WARRIOR', 2);
  textAt(PAD_X, 46, 20, true, INK, 'Hotstrings');

  const label = String(itemCount);
  const badgeW = capWidth(label);
  const badgeX = contentRight() - badgeW;
  const badgeY = 31;
  drawKeycap(badgeX, badgeY, label, false);
  font(9, false);
  const caption = 'commands';
  const cw = mgraphics.text_measure(caption)[0];
  textAt(badgeX - cw - 8, capBaseline(badgeY), 9, false, MUTED, caption);

  if (scrollY > 0) {
    mgraphics.set_source_rgba(1, 1, 1, 0.06);
    mgraphics.set_line_width(1);
    mgraphics.move_to(0, TOP - 0.5);
    mgraphics.line_to(w, TOP - 0.5);
    mgraphics.stroke();
  }
}

function drawFades() {
  const w = viewW();
  const h = viewH();
  verticalGradient(TOP, TOP + FADE_TOP, BG, BG, 1, 0);
  mgraphics.rectangle(0, TOP, w, FADE_TOP);
  mgraphics.fill();
  verticalGradient(h - FADE_BOTTOM, h, BG, BG, 0, 1);
  mgraphics.rectangle(0, h - FADE_BOTTOM, w, FADE_BOTTOM);
  mgraphics.fill();
}

function drawScrollbar() {
  if (maxScroll() <= 0) {
    return;
  }
  const sb = sbGeom();
  mgraphics.set_source_rgba(1, 1, 1, 0.05);
  mgraphics.rectangle_rounded(sb.x, sb.y, SB_W, sb.body, SB_W, SB_W);
  mgraphics.fill();
  fill(draggingThumb ? PRESSED_TOP : AMBER, draggingThumb ? 1 : 0.8);
  mgraphics.rectangle_rounded(sb.x, sb.thumbY, SB_W, sb.thumbH, SB_W, SB_W);
  mgraphics.fill();
}

function paint() {
  if (keyColW === 0) {
    measureKeyColumn();
  }
  const w = viewW();
  const h = viewH();
  fill(BG);
  mgraphics.rectangle(0, 0, w, h);
  mgraphics.fill();

  let y = TOP - scrollY;
  rows.forEach((row, i) => {
    const next = y + row.h;
    if (next >= TOP && y <= h) {
      if (row.kind === 'group') {
        drawGroup(y, row);
      } else {
        drawItem(y, row, i === hoverRow);
      }
    }
    y = next;
  });

  drawFades();
  drawHeader();
  drawScrollbar();
}

function inScrollbar(x: number) {
  return x >= viewW() - SB_PAD - SB_W - 4;
}

function rowAt(y: number) {
  if (y < TOP) {
    return -1;
  }
  let top = TOP - scrollY;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (y >= top && y < top + row.h) {
      return row.kind === 'item' ? i : -1;
    }
    top += row.h;
  }
  return -1;
}

function updateHover() {
  const next =
    draggingList || draggingThumb || mouseX < 0 || inScrollbar(mouseX) ? -1 : rowAt(mouseY);
  if (next === hoverRow) {
    return false;
  }
  hoverRow = next;
  return true;
}

function scrollFromThumb(y: number) {
  const sb = sbGeom();
  const t = (y - sb.y - sb.thumbH / 2) / Math.max(1, sb.travel);
  setScroll(t * maxScroll());
}

function onclick(x: number, y: number) {
  mouseX = x;
  mouseY = y;
  if (y < TOP) {
    return;
  }
  if (inScrollbar(x)) {
    draggingThumb = true;
    scrollFromThumb(y);
    return;
  }
  draggingList = true;
  dragOrigin = y;
  dragScroll = scrollY;
  updateHover();
  mgraphics.redraw();
}

function ondrag(x: number, y: number, button: number) {
  mouseX = x;
  mouseY = y;
  if (button === 0) {
    draggingList = false;
    draggingThumb = false;
    updateHover();
    mgraphics.redraw();
    return;
  }
  if (draggingThumb) {
    scrollFromThumb(y);
    return;
  }
  if (draggingList) {
    setScroll(dragScroll + (dragOrigin - y));
  }
}

function onidle(x: number, y: number) {
  mouseX = x;
  mouseY = y;
  if (updateHover()) {
    mgraphics.redraw();
  }
}

function onidleout() {
  mouseX = -1;
  mouseY = -1;
  if (updateHover()) {
    mgraphics.redraw();
  }
}

function onwheel(
  x: number,
  y: number,
  _scrollx: number,
  scrolly: number,
  _mod1?: number,
  shift?: number
) {
  mouseX = x;
  mouseY = y;
  let dy = scrolly;
  if (Math.abs(dy) <= 1) {
    dy *= ITEM_H * 8;
  } else if (Math.abs(dy) < 8) {
    dy *= 48;
  }
  if (shift) {
    dy *= 3;
  }
  setScroll(scrollY - dy);
}

function onresize() {
  setScroll(scrollY);
}

void paint;
void onclick;
void ondrag;
void onidle;
void onidleout;
void onwheel;
void onresize;
