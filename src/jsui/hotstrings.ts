import { hotstringSections } from '../hotstringCatalog';

autowatch = 1;
inlets = 1;
outlets = 0;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

type RGB = [number, number, number];

const BG: RGB = [0.106, 0.106, 0.118];
const TEXT: RGB = [0.93, 0.93, 0.95];
const SUBTLE: RGB = [0.56, 0.56, 0.6];
const FAINT: RGB = [0.38, 0.38, 0.42];
const ACCENT: RGB = [0.49, 0.54, 0.98];
const ACCENT_TEXT: RGB = [0.78, 0.8, 1];

const IS_WINDOWS = max.os === 'windows';
const UI_FONT = IS_WINDOWS ? 'Segoe UI' : 'Helvetica Neue';
const UI_FONT_MEDIUM = IS_WINDOWS ? 'Segoe UI Semibold' : 'Helvetica Neue Medium';

const TOP = 62;
const PAD_X = 10;
const ROW_INSET = 10;
const GROUP_H = 34;
const ITEM_H = 32;
const LIST_PAD_BOTTOM = 10;
const PILL_H = 20;
const PILL_PAD = 7;
const PILL_MIN_W = 20;
const PILL_GAP = 4;
const PILL_FONT = 11;
const FADE_H = 12;
const SB_W = 8;
const SB_PAD = 4;

type DrawRow =
  | { kind: 'group'; title: string; count: number; h: number }
  | { kind: 'item'; keys: string[]; desc: string; h: number };

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

function buildRows() {
  const out: DrawRow[] = [];
  for (const section of hotstringSections()) {
    out.push({ kind: 'group', title: section.title, count: section.items.length, h: GROUP_H });
    const combos = section.title === 'Hotkeys';
    for (const item of section.items) {
      out.push({
        kind: 'item',
        keys: combos ? item.key.split('+') : [item.key],
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
  const body = Math.max(0, trackH - 8);
  const thumbH = Math.max(28, body * (trackH / Math.max(trackH, contentH)));
  const travel = Math.max(0, body - thumbH);
  const thumbY = y + (maxScroll() === 0 ? 0 : (scrollY / maxScroll()) * travel);
  return { x, y, body, thumbH, thumbY, travel };
}

function rowRight() {
  return viewW() - SB_PAD * 2 - SB_W - 2;
}

function fill(rgb: RGB, a = 1) {
  mgraphics.set_source_rgba(rgb[0], rgb[1], rgb[2], a);
}

function font(face: string, size: number) {
  mgraphics.select_font_face(face);
  mgraphics.set_font_size(size);
}

function measure(face: string, size: number, text: string) {
  font(face, size);
  return mgraphics.text_measure(text)[0];
}

function textAt(x: number, y: number, face: string, size: number, rgb: RGB, text: string) {
  font(face, size);
  fill(rgb);
  mgraphics.move_to(x, y);
  mgraphics.show_text(text);
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

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  mgraphics.rectangle_rounded(x, y, w, h, r * 2, r * 2);
}

function baselineIn(y: number, h: number, size: number) {
  return y + (h + size * 0.7) / 2;
}

function pillWidth(key: string) {
  return Math.max(PILL_MIN_W, Math.ceil(measure(UI_FONT_MEDIUM, PILL_FONT, key)) + PILL_PAD * 2);
}

function pillsWidth(keys: string[]) {
  return keys.reduce((sum, key) => sum + pillWidth(key), 0) + (keys.length - 1) * PILL_GAP;
}

function drawPills(right: number, y: number, keys: string[], active: boolean) {
  let x = right - pillsWidth(keys);
  for (const key of keys) {
    const w = pillWidth(key);
    fill(active ? ACCENT : [1, 1, 1], active ? 0.22 : 0.07);
    roundRect(x, y, w, PILL_H, 5);
    mgraphics.fill();
    const tw = measure(UI_FONT_MEDIUM, PILL_FONT, key);
    textAt(
      x + (w - tw) / 2,
      baselineIn(y, PILL_H, PILL_FONT),
      UI_FONT_MEDIUM,
      PILL_FONT,
      active ? ACCENT_TEXT : SUBTLE,
      key
    );
    x += w + PILL_GAP;
  }
}

function drawGroup(y: number, row: Extract<DrawRow, { kind: 'group' }>) {
  const baseline = y + GROUP_H - 10;
  const x = PAD_X + ROW_INSET;
  textAt(x, baseline, UI_FONT_MEDIUM, 11, SUBTLE, row.title);
  const count = String(row.count);
  const cw = measure(UI_FONT, 11, count);
  textAt(rowRight() - ROW_INSET - cw, baseline, UI_FONT, 11, FAINT, count);
}

function drawItem(y: number, row: Extract<DrawRow, { kind: 'item' }>, hovered: boolean) {
  const left = PAD_X;
  const right = rowRight();
  if (hovered) {
    fill([1, 1, 1], 0.06);
    roundRect(left, y + 1, right - left, row.h - 2, 7);
    mgraphics.fill();
  }

  const pillsRight = right - ROW_INSET;
  drawPills(pillsRight, y + (row.h - PILL_H) / 2, row.keys, hovered);

  const textX = left + ROW_INSET;
  const textW = pillsRight - pillsWidth(row.keys) - 16 - textX;
  font(UI_FONT, 13);
  const desc = ellipsize(row.desc, textW);
  textAt(textX, baselineIn(y, row.h, 13), UI_FONT, 13, TEXT, desc);
}

function drawHeader() {
  const w = viewW();
  fill(BG);
  mgraphics.rectangle(0, 0, w, TOP);
  mgraphics.fill();

  const x = PAD_X + ROW_INSET;
  textAt(x, 30, UI_FONT_MEDIUM, 16, TEXT, 'Hotstrings');
  textAt(x, 48, UI_FONT, 12, SUBTLE, `${itemCount} commands`);

  fill([1, 1, 1], 0.07);
  mgraphics.rectangle(0, TOP - 1, w, 1);
  mgraphics.fill();
}

function drawFade() {
  const w = viewW();
  const g = mgraphics.pattern_create_linear(0, TOP, 0, TOP + FADE_H);
  g.add_color_stop_rgba(0, BG[0], BG[1], BG[2], 1);
  g.add_color_stop_rgba(1, BG[0], BG[1], BG[2], 0);
  mgraphics.set_source(g);
  mgraphics.rectangle(0, TOP, w, FADE_H);
  mgraphics.fill();
}

function drawScrollbar() {
  if (maxScroll() <= 0) {
    return;
  }
  const sb = sbGeom();
  fill([1, 1, 1], draggingThumb ? 0.32 : 0.16);
  roundRect(sb.x, sb.thumbY, SB_W, sb.thumbH, SB_W / 2);
  mgraphics.fill();
}

function paint() {
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

  if (scrollY > 0) {
    drawFade();
  }
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
    dy *= ITEM_H * 6;
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
