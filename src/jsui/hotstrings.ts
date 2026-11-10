import { hotstringSections } from '../hotstringCatalog';

autowatch = 1;
inlets = 1;
outlets = 1;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

type RGB = [number, number, number];

const BG: RGB = [0.11, 0.106, 0.1];
const TEXT: RGB = [0.95, 0.93, 0.9];
const SUBTLE: RGB = [0.6, 0.57, 0.53];
const FAINT: RGB = [0.41, 0.38, 0.35];
const ACCENT: RGB = [0.95, 0.56, 0.18];
const ACCENT_TEXT: RGB = [1, 0.76, 0.5];

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
const FIELD_Y = 14;
const FIELD_H = 34;
const FIELD_TEXT_X = 34;
const FADE_H = 12;
const SB_W = 8;
const SB_PAD = 4;

type DrawRow =
  | { kind: 'group'; title: string; count: number; h: number }
  | { kind: 'item'; keys: string[]; desc: string; keyMatch: boolean; h: number };

type PillState = 'idle' | 'match' | 'hover';

const sections = buildSections();
const totalCount = sections.reduce((n, section) => n + section.entries.length, 0);

let query = '';
let editing = false;
let rows: DrawRow[] = [];
let contentH = 0;
let matchCount = 0;
let clearRect: [number, number, number, number] | null = null;
let scrollY = 0;
let dragOrigin = 0;
let dragScroll = 0;
let draggingList = false;
let draggingThumb = false;
let hoverRow = -1;
let mouseX = -1;
let mouseY = -1;

rebuildRows();

function buildSections() {
  return hotstringSections().map(section => {
    const combos = section.title === 'Hotkeys';
    const entries = section.items.map(item => ({
      keys: combos ? item.key.split('+') : [item.key],
      desc: item.desc,
      keyText: item.key.toLowerCase(),
      search: `${item.key} ${item.desc}`.toLowerCase(),
    }));
    return { title: section.title, search: section.title.toLowerCase(), entries };
  });
}

function needle() {
  return query.trim().toLowerCase();
}

function rebuildRows() {
  const q = needle();
  const out: DrawRow[] = [];
  for (const section of sections) {
    const entries =
      q === '' || section.search.includes(q)
        ? section.entries
        : section.entries.filter(entry => entry.search.includes(q));
    if (entries.length === 0) {
      continue;
    }
    out.push({ kind: 'group', title: section.title, count: entries.length, h: GROUP_H });
    for (const entry of entries) {
      out.push({
        kind: 'item',
        keys: entry.keys,
        desc: entry.desc,
        keyMatch: q !== '' && entry.keyText.includes(q),
        h: ITEM_H,
      });
    }
  }
  rows = out;
  contentH = rows.reduce((sum, row) => sum + row.h, 0) + LIST_PAD_BOTTOM;
  matchCount = rows.reduce((n, row) => n + (row.kind === 'item' ? 1 : 0), 0);
}

function setQuery(next: string) {
  if (next === query) {
    return;
  }
  query = next;
  rebuildRows();
  setScroll(0);
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

function drawPills(right: number, y: number, keys: string[], state: PillState) {
  let x = right - pillsWidth(keys);
  for (const key of keys) {
    const w = pillWidth(key);
    if (state === 'idle') {
      fill([1, 1, 1], 0.07);
    } else {
      fill(ACCENT, state === 'hover' ? 0.32 : 0.18);
    }
    roundRect(x, y, w, PILL_H, 5);
    mgraphics.fill();
    const tw = measure(UI_FONT_MEDIUM, PILL_FONT, key);
    textAt(
      x + (w - tw) / 2,
      baselineIn(y, PILL_H, PILL_FONT),
      UI_FONT_MEDIUM,
      PILL_FONT,
      state === 'idle' ? SUBTLE : ACCENT_TEXT,
      key
    );
    x += w + PILL_GAP;
  }
}

function drawHighlighted(x: number, y: number, h: number, text: string) {
  const baseline = baselineIn(y, h, 13);
  const q = needle();
  const at = q === '' ? -1 : text.toLowerCase().indexOf(q);
  if (at < 0) {
    textAt(x, baseline, UI_FONT, 13, TEXT, text);
    return;
  }
  const pre = text.slice(0, at);
  const mid = text.slice(at, at + q.length);
  const post = text.slice(at + q.length);
  const preW = measure(UI_FONT, 13, pre);
  const midW = measure(UI_FONT, 13, mid);
  fill(ACCENT, 0.2);
  roundRect(x + preW - 1, y + 7, midW + 2, h - 14, 3);
  mgraphics.fill();
  textAt(x, baseline, UI_FONT, 13, TEXT, pre);
  textAt(x + preW, baseline, UI_FONT, 13, ACCENT_TEXT, mid);
  textAt(x + preW + midW, baseline, UI_FONT, 13, TEXT, post);
}

function drawGroup(y: number, row: Extract<DrawRow, { kind: 'group' }>) {
  const baseline = y + GROUP_H - 10;
  const x = PAD_X + ROW_INSET;
  textAt(x, baseline, UI_FONT_MEDIUM, 11, ACCENT_TEXT, row.title);
  const count = String(row.count);
  const cw = measure(UI_FONT, 11, count);
  textAt(rowRight() - ROW_INSET - cw, baseline, UI_FONT, 11, FAINT, count);
}

function drawItem(y: number, row: Extract<DrawRow, { kind: 'item' }>, hovered: boolean) {
  const left = PAD_X;
  const right = rowRight();
  if (hovered) {
    fill(ACCENT, 0.12);
    roundRect(left, y + 1, right - left, row.h - 2, 7);
    mgraphics.fill();
  }

  const pillsRight = right - ROW_INSET;
  let pillState: PillState = 'idle';
  if (hovered) {
    pillState = 'hover';
  } else if (row.keyMatch) {
    pillState = 'match';
  }
  drawPills(pillsRight, y + (row.h - PILL_H) / 2, row.keys, pillState);

  const textX = left + ROW_INSET;
  const textW = pillsRight - pillsWidth(row.keys) - 16 - textX;
  font(UI_FONT, 13);
  drawHighlighted(textX, y, row.h, ellipsize(row.desc, textW));
}

function drawSearchIcon(cx: number, cy: number, rgb: RGB) {
  fill(rgb);
  mgraphics.set_line_width(1.6);
  mgraphics.ellipse(cx - 5, cy - 5, 10, 10);
  mgraphics.stroke();
  mgraphics.move_to(cx + 3.6, cy + 3.6);
  mgraphics.line_to(cx + 7, cy + 7);
  mgraphics.stroke();
}

function drawClearButton(x: number, y: number, size: number) {
  fill([1, 1, 1], 0.1);
  mgraphics.ellipse(x, y, size, size);
  mgraphics.fill();
  const c = size / 2;
  const arm = 3;
  fill(TEXT, 0.8);
  mgraphics.set_line_width(1.4);
  mgraphics.move_to(x + c - arm, y + c - arm);
  mgraphics.line_to(x + c + arm, y + c + arm);
  mgraphics.move_to(x + c + arm, y + c - arm);
  mgraphics.line_to(x + c - arm, y + c + arm);
  mgraphics.stroke();
}

function drawSearchField() {
  const x = PAD_X;
  const y = FIELD_Y;
  const w = rowRight() - PAD_X;
  const h = FIELD_H;
  const active = query !== '';

  fill([1, 1, 1], 0.06);
  roundRect(x, y, w, h, 9);
  mgraphics.fill();
  fill(active ? ACCENT : [1, 1, 1], active ? 0.55 : 0.1);
  mgraphics.set_line_width(1);
  roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 8.5);
  mgraphics.stroke();

  drawSearchIcon(x + 17, y + h / 2 - 1, active ? ACCENT : SUBTLE);

  let right = x + w - 10;
  clearRect = null;
  if (active) {
    const size = 16;
    const bx = right - size;
    drawClearButton(bx, y + (h - size) / 2, size);
    clearRect = [bx - 4, y, size + 8, h];
    right = bx - 8;
  }

  const count = active ? `${matchCount} of ${totalCount}` : String(totalCount);
  const countW = measure(UI_FONT, 11, count);
  textAt(right - countW, baselineIn(y, h, 11), UI_FONT, 11, FAINT, count);
  right -= countW + 12;

  const textX = x + FIELD_TEXT_X;
  const baseline = baselineIn(y, h, 13);
  let caretX = textX - 1;
  if (active) {
    font(UI_FONT, 13);
    let shown = query;
    while (shown.length > 1 && mgraphics.text_measure(shown)[0] > right - textX) {
      shown = shown.slice(1);
    }
    textAt(textX, baseline, UI_FONT, 13, TEXT, shown);
    caretX = textX + measure(UI_FONT, 13, shown) + 1;
  } else {
    textAt(textX, baseline, UI_FONT, 13, FAINT, 'Search hotstrings');
  }
  if (editing) {
    fill(ACCENT);
    mgraphics.rectangle(caretX, y + 9, 1.5, h - 18);
    mgraphics.fill();
  }
}

function drawEmptyState() {
  const center = (PAD_X + rowRight()) / 2;
  const title = `No matches for "${query.trim()}"`;
  const hint = 'Press Esc to clear the search';
  textAt(center - measure(UI_FONT, 13, title) / 2, TOP + 44, UI_FONT, 13, SUBTLE, title);
  textAt(center - measure(UI_FONT, 11, hint) / 2, TOP + 64, UI_FONT, 11, FAINT, hint);
}

function drawHeader() {
  const w = viewW();
  fill(BG);
  mgraphics.rectangle(0, 0, w, TOP);
  mgraphics.fill();

  const glow = mgraphics.pattern_create_radial(40, 0, 0, 40, 0, 260);
  glow.add_color_stop_rgba(0, ACCENT[0], ACCENT[1], ACCENT[2], 0.24);
  glow.add_color_stop_rgba(1, ACCENT[0], ACCENT[1], ACCENT[2], 0);
  mgraphics.set_source(glow);
  mgraphics.rectangle(0, 0, w, TOP);
  mgraphics.fill();

  drawSearchField();

  const rule = mgraphics.pattern_create_linear(0, 0, w, 0);
  rule.add_color_stop_rgba(0, ACCENT[0], ACCENT[1], ACCENT[2], 0.7);
  rule.add_color_stop_rgba(1, ACCENT[0], ACCENT[1], ACCENT[2], 0.05);
  mgraphics.set_source(rule);
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
  fill(ACCENT, draggingThumb ? 0.9 : 0.5);
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

  if (rows.length === 0) {
    drawEmptyState();
  }
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
    if (clearRect && hitRect(clearRect, x, y)) {
      outlet(0, 'clear');
      setQuery('');
    }
    outlet(0, 'select');
    editing = true;
    mgraphics.redraw();
    return;
  }
  editing = false;
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

function hitRect(rect: [number, number, number, number], x: number, y: number) {
  return x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3];
}

function text(...words: (string | number)[]) {
  editing = true;
  setQuery(words.join(' '));
  mgraphics.redraw();
}

void paint;
void text;
void onclick;
void ondrag;
void onidle;
void onidleout;
void onwheel;
void onresize;
