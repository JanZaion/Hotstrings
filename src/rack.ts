import type { LiveClip } from './sharedTypes';

type LiveObj = LiveClip & { type: string };

const SCROLL_PAGES = 16;
const SCROLL_LEFT = 2;
const SCROLL_RIGHT = 3;

const appView = new LiveAPI() as unknown as LiveObj;
const songView = new LiveAPI() as unknown as LiveObj;
const track = new LiveAPI() as unknown as LiveObj;
const device = new LiveAPI() as unknown as LiveObj;
const parent = new LiveAPI() as unknown as LiveObj;

function liveId(raw: unknown) {
  const items = raw instanceof Array ? raw : raw == null || raw === '' ? [] : [raw];
  for (const item of items) {
    if (typeof item === 'string' && item !== '' && Number.isNaN(Number(item))) {
      continue;
    }
    const n = Number(item);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return 0;
}

function currentChain() {
  track.path = 'live_set view selected_track';
  if (!track.id || track.id == 0) {
    return null;
  }
  device.path = track.path + ' view selected_device';
  if (device.id && device.id != 0) {
    const id = liveId(device.get('canonical_parent'));
    if (id) {
      parent.id = id;
      if (parent.type === 'Chain') {
        return parent;
      }
    }
  }
  return track;
}

function selectChainEnd(which: 0 | -1) {
  const chain = currentChain();
  if (!chain) {
    return;
  }
  const n = chain.getcount('devices');
  if (n < 1) {
    return;
  }
  const index = which === 0 ? 0 : n - 1;
  device.path = chain.path + ' devices ' + index;
  if (!device.id || device.id == 0) {
    return;
  }
  const id = device.id;
  appView.path = 'live_app view';
  appView.call('focus_view', 'Detail/DeviceChain');
  songView.path = 'live_set view';
  songView.call('select_device', 'id', id);
  const dir = which === 0 ? SCROLL_LEFT : SCROLL_RIGHT;
  for (let i = 0; i < SCROLL_PAGES; i++) {
    appView.call('scroll_view', dir, 'Detail/DeviceChain', 0);
  }
  songView.call('select_device', 'id', id);
}

function setChainCollapsed(collapsed: 0 | 1) {
  const chain = currentChain();
  if (!chain) {
    return;
  }
  const n = chain.getcount('devices');
  for (let i = 0; i < n; i++) {
    device.path = chain.path + ' devices ' + i + ' view';
    if (!device.id || device.id == 0) {
      continue;
    }
    device.set('is_collapsed', collapsed);
  }
}

export function first() {
  selectChainEnd(0);
}

export function last() {
  selectChainEnd(-1);
}

export function col() {
  setChainCollapsed(1);
}

export function exp() {
  setChainCollapsed(0);
}
