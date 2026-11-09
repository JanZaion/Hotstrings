import { hotstringSections } from '../hotstringCatalog';

autowatch = 1;
inlets = 1;
outlets = 0;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

const TOP = 44;
const PAD_X = 14;
const GROUP_H = 26;
const ITEM_H = 20;
const KEY_W = 108;
const SB_W = 7;
const SB_PAD = 5;
const BG: [number, number, number] = [0.1, 0.1, 0.105];
const INK: [number, number, number] = [0.93, 0.91, 0.86];
const MUTED: [number, number, number] = [0.58, 0.56, 0.52];
const AMBER: [number, number, number] = [0.86, 0.52, 0.16];

type DrawRow =
  | { kind: 'group'; title: string; h: number }
  | { kind: 'item'; key: string; desc: string; h: number; stripe: boolean };

const rows = buildRows();
const contentH = rows.reduce((sum, row) => sum + row.h, 0);
const itemCount = rows.reduce((n, row) => n + (row.kind === 'item' ? 1 : 0), 0);

let scrollY = 0;
let dragOrigin = 0;
let dragScroll = 0;
let draggingList = false;
let draggingThumb = false;

function buildRows() {
  const out: DrawRow[] = [];
  for (const section of hotstringSections()) {
    out.push({ kind: 'group', title: section.title, h: GROUP_H });
    section.items.forEach((item, i) => {
      out.push({
        kind: 'item',
        key: item.key,
        desc: item.desc,
        h: ITEM_H,
        stripe: i % 2 === 1,
      });
    });
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
  mgraphics.redraw();
}

function sbGeom() {
  const trackH = listH();
  const x = viewW() - SB_PAD - SB_W;
  const y = TOP + 4;
  const body = Math.max(0, trackH - 8);
  const thumbH = Math.max(18, body * (trackH / Math.max(trackH, contentH)));
  const travel = Math.max(0, body - thumbH);
  const thumbY = y + (maxScroll() === 0 ? 0 : (scrollY / maxScroll()) * travel);
  return { x, y, body, thumbH, thumbY, travel };
}

function fill(rgb: [number, number, number], a = 1) {
  mgraphics.set_source_rgba(rgb[0], rgb[1], rgb[2], a);
}

function textAt(
  x: number,
  y: number,
  size: number,
  bold: boolean,
  rgb: [number, number, number],
  text: string
) {
  mgraphics.select_font_face(bold ? 'Arial Bold' : 'Arial');
  mgraphics.set_font_size(size);
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

function paint() {
  const w = viewW();
  const h = viewH();
  fill(BG);
  mgraphics.rectangle(0, 0, w, h);
  mgraphics.fill();

  const listTop = TOP;
  const listBottom = h;
  let y = listTop - scrollY;
  for (const row of rows) {
    const next = y + row.h;
    if (next >= listTop && y <= listBottom) {
      if (row.kind === 'group') {
        fill([0.14, 0.13, 0.12]);
        mgraphics.rectangle(0, y, w, row.h);
        mgraphics.fill();
        fill(AMBER);
        mgraphics.rectangle(0, y + 6, 3, row.h - 10);
        mgraphics.fill();
        textAt(PAD_X, y + 18, 10, true, AMBER, row.title.toUpperCase());
      } else {
        if (row.stripe) {
          fill([0.12, 0.12, 0.125]);
          mgraphics.rectangle(0, y, w, row.h);
          mgraphics.fill();
        }
        textAt(PAD_X, y + 14, 11, true, INK, row.key);
        mgraphics.select_font_face('Arial');
        mgraphics.set_font_size(10);
        const descX = PAD_X + KEY_W;
        const descW = w - descX - SB_W - SB_PAD * 2 - 4;
        textAt(descX, y + 14, 10, false, MUTED, ellipsize(row.desc, descW));
      }
    }
    y = next;
  }

  fill(BG);
  mgraphics.rectangle(0, 0, w, TOP);
  mgraphics.fill();
  textAt(PAD_X, 20, 13, true, INK, 'Hotstrings');
  textAt(PAD_X, 36, 10, false, MUTED, `${itemCount} commands`);

  if (maxScroll() <= 0) {
    return;
  }
  const sb = sbGeom();
  fill([1, 1, 1], 0.08);
  mgraphics.rectangle(sb.x, sb.y, SB_W, sb.body);
  mgraphics.fill();
  fill(AMBER, 0.85);
  mgraphics.rectangle(sb.x, sb.thumbY, SB_W, sb.thumbH);
  mgraphics.fill();
}

function inScrollbar(x: number) {
  return x >= viewW() - SB_PAD - SB_W - 4;
}

function scrollFromThumb(y: number) {
  const sb = sbGeom();
  const t = (y - sb.y - sb.thumbH / 2) / Math.max(1, sb.travel);
  setScroll(t * maxScroll());
}

function onclick(x: number, y: number) {
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
}

function ondrag(_x: number, y: number, button: number) {
  if (button === 0) {
    draggingList = false;
    draggingThumb = false;
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

function onwheel(
  _x: number,
  _y: number,
  _scrollx: number,
  scrolly: number,
  _mod1?: number,
  shift?: number
) {
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
void onwheel;
void onresize;
