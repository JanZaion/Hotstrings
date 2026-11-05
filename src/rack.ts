import type { LiveClip } from './sharedTypes';

type LiveObj = LiveClip & { type: string };

const SCROLL_PAGES = 16;
const SCROLL_LEFT = 2;
const SCROLL_RIGHT = 3;

const appView = new LiveAPI() as unknown as LiveObj;
const songView = new LiveAPI() as unknown as LiveObj;
const song = new LiveAPI() as unknown as LiveObj;
const track = new LiveAPI() as unknown as LiveObj;
const device = new LiveAPI() as unknown as LiveObj;
const parent = new LiveAPI() as unknown as LiveObj;
const thisDev = new LiveAPI() as unknown as LiveObj;
const param = new LiveAPI() as unknown as LiveObj;

function liveValue(raw: unknown) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}

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

function selectedDeviceIndex(chain: LiveObj, selectedId: number) {
  const n = chain.getcount('devices');
  for (let i = 0; i < n; i++) {
    device.path = chain.path + ' devices ' + i;
    if (device.id == selectedId) {
      return i;
    }
  }
  return -1;
}

function moveSelected(delta: -1 | 1) {
  const chain = currentChain();
  if (!chain) {
    return;
  }
  const selectedId = device.id && device.id != 0 ? device.id : 0;
  if (!selectedId) {
    return;
  }
  const n = chain.getcount('devices');
  const index = selectedDeviceIndex(chain, selectedId);
  if (index < 0) {
    return;
  }
  const drop = delta < 0 ? index - 1 : index + 2;
  if (drop < 0 || drop > n) {
    return;
  }
  song.path = 'live_set';
  if (!song.id || song.id == 0) {
    return;
  }
  song.call('move_device', 'id', selectedId, 'id', chain.id, drop);
  songView.path = 'live_set view';
  songView.call('select_device', 'id', selectedId);
}

export function chainLeft() {
  moveSelected(-1);
}

export function chainRight() {
  moveSelected(1);
}

function setDeviceOn(path: string, on: 0 | 1) {
  param.path = path + ' parameters 0';
  if (!param.id || param.id == 0) {
    return;
  }
  param.set('value', on);
}

function applyChainEffects(onFor: (id: number, selectedId: number) => 0 | 1) {
  const chain = currentChain();
  if (!chain) {
    return;
  }
  const selectedId = device.id && device.id != 0 ? device.id : 0;
  thisDev.path = 'this_device';
  const selfId = thisDev.id;
  const n = chain.getcount('devices');
  for (let i = 0; i < n; i++) {
    device.path = chain.path + ' devices ' + i;
    if (!device.id || device.id == 0 || device.id == selfId) {
      continue;
    }
    const kind = Number(liveValue(device.get('type')));
    if (kind != 2 && kind != 4) {
      continue;
    }
    setDeviceOn(device.path, onFor(device.id, selectedId));
  }
}

export function col() {
  setChainCollapsed(1);
}

export function exp() {
  setChainCollapsed(0);
}

export function sol() {
  applyChainEffects((id, selectedId) => (id == selectedId ? 1 : 0));
}

export function unsol() {
  applyChainEffects(() => 1);
}
