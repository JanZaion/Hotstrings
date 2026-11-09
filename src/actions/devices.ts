import { NATIVE_DEVICES } from '../constants';
import type { LiveClip } from '../sharedTypes';

type LiveObj = LiveClip & { type: string };

const SCROLL_PAGES = 16;
const SCROLL_RIGHT = 3;

const appView = new LiveAPI() as unknown as LiveObj;
const songView = new LiveAPI() as unknown as LiveObj;
const track = new LiveAPI() as unknown as LiveObj;
const device = new LiveAPI() as unknown as LiveObj;
const parent = new LiveAPI() as unknown as LiveObj;
const param = new LiveAPI() as unknown as LiveObj;

const INSTRUMENT_TYPE = 1;

const INSTRUMENT_NAMES = new Set<string>([
  NATIVE_DEVICES.ana,
  NATIVE_DEVICES.colis,
  NATIVE_DEVICES.dri,
  NATIVE_DEVICES.drumr,
  NATIVE_DEVICES.elec,
  NATIVE_DEVICES.exti,
  NATIVE_DEVICES.imp,
  NATIVE_DEVICES.irack,
  NATIVE_DEVICES.meld,
  NATIVE_DEVICES.op,
  NATIVE_DEVICES.samp,
  NATIVE_DEVICES.simp,
  NATIVE_DEVICES.ten,
  NATIVE_DEVICES.wav,
]);

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
      if (parent.type === 'Chain' || parent.type === 'DrumChain') {
        return parent;
      }
    }
  }
  return track;
}

function findInstrumentIndex(chain: LiveObj) {
  const n = chain.getcount('devices');
  for (let i = 0; i < n; i++) {
    device.path = chain.path + ' devices ' + i;
    if (!device.id || device.id == 0) {
      continue;
    }
    const kind = liveValue(device.get('type'));
    if (kind == INSTRUMENT_TYPE || kind === 'instrument') {
      return i;
    }
  }
  return -1;
}

function selectInserted(chain: LiveObj, index: number, scrollEnd: boolean) {
  device.path = chain.path + ' devices ' + index;
  if (!device.id || device.id == 0) {
    return;
  }
  const id = device.id;
  appView.path = 'live_app view';
  appView.call('focus_view', 'Detail/DeviceChain');
  songView.path = 'live_set view';
  songView.call('select_device', 'id', id);
  if (!scrollEnd) {
    return;
  }
  for (let i = 0; i < SCROLL_PAGES; i++) {
    appView.call('scroll_view', SCROLL_RIGHT, 'Detail/DeviceChain', 0);
  }
  songView.call('select_device', 'id', id);
}

function insertAtChainEnd(name: string) {
  const chain = currentChain();
  if (!chain) {
    return false;
  }
  let index = -1;
  let scrollEnd = true;
  try {
    if (INSTRUMENT_NAMES.has(name)) {
      index = findInstrumentIndex(chain);
      if (index >= 0) {
        chain.call('delete_device', index);
        chain.call('insert_device', name, index);
        scrollEnd = false;
      } else {
        chain.call('insert_device', name);
      }
    } else {
      chain.call('insert_device', name);
    }
  } catch {
    return false;
  }
  const n = chain.getcount('devices');
  if (n < 1) {
    return false;
  }
  if (index < 0) {
    index = n - 1;
  }
  selectInserted(chain, index, scrollEnd);
  return !!(device.id && device.id != 0);
}

export function ana() {
  insertAtChainEnd(NATIVE_DEVICES.ana);
}

export function colis() {
  insertAtChainEnd(NATIVE_DEVICES.colis);
}

export function dri() {
  insertAtChainEnd(NATIVE_DEVICES.dri);
}

export function drumr() {
  insertAtChainEnd(NATIVE_DEVICES.drumr);
}

export function elec() {
  insertAtChainEnd(NATIVE_DEVICES.elec);
}

export function exti() {
  insertAtChainEnd(NATIVE_DEVICES.exti);
}

export function imp() {
  insertAtChainEnd(NATIVE_DEVICES.imp);
}

export function irack() {
  insertAtChainEnd(NATIVE_DEVICES.irack);
}

export function meld() {
  insertAtChainEnd(NATIVE_DEVICES.meld);
}

export function op() {
  insertAtChainEnd(NATIVE_DEVICES.op);
}

export function samp() {
  insertAtChainEnd(NATIVE_DEVICES.samp);
}

export function simp() {
  insertAtChainEnd(NATIVE_DEVICES.simp);
}

export function ten() {
  insertAtChainEnd(NATIVE_DEVICES.ten);
}

export function wav() {
  insertAtChainEnd(NATIVE_DEVICES.wav);
}

export function amp() {
  insertAtChainEnd(NATIVE_DEVICES.amp);
}

export function arack() {
  insertAtChainEnd(NATIVE_DEVICES.arack);
}

export function af() {
  insertAtChainEnd(NATIVE_DEVICES.af);
}

export function apan() {
  insertAtChainEnd(NATIVE_DEVICES.apan);
}

export function ash() {
  insertAtChainEnd(NATIVE_DEVICES.ash);
}

export function beat() {
  insertAtChainEnd(NATIVE_DEVICES.beat);
}

export function cab() {
  insertAtChainEnd(NATIVE_DEVICES.cab);
}

export function cheq() {
  insertAtChainEnd(NATIVE_DEVICES.cheq);
}

export function ens() {
  insertAtChainEnd(NATIVE_DEVICES.ens);
}

export function comp() {
  insertAtChainEnd(NATIVE_DEVICES.comp);
}

export function corp() {
  insertAtChainEnd(NATIVE_DEVICES.corp);
}

export function del() {
  insertAtChainEnd(NATIVE_DEVICES.del);
}

export function drumb() {
  insertAtChainEnd(NATIVE_DEVICES.drumb);
}

export function tube() {
  insertAtChainEnd(NATIVE_DEVICES.tube);
}

export function echo() {
  insertAtChainEnd(NATIVE_DEVICES.echo);
}

const EQ8_LOW_CUT_12 = 1;
const EQ8_NOTCH = 4;
const EQ8_HIGH_CUT_12 = 6;
const EQ8_HIGHPASS_HZ = 130;
const EQ8_LOWPASS_HZ = 10000;
const EQ8_FREQ_MIN_HZ = 10;
const EQ8_FREQ_MAX_HZ = 22000;

type Eq8Band = {
  band: number;
  type: number;
  freq?: number;
};

function eq8ParamPaths() {
  const paths: Record<string, string> = {};
  const path = device.path;
  const n = device.getcount('parameters');
  for (let i = 0; i < n; i++) {
    param.path = path + ' parameters ' + i;
    if (!param.id || param.id == 0) {
      continue;
    }
    const name = liveValue(param.get('name'));
    if (typeof name === 'string' && name !== '') {
      paths[name] = param.path;
    }
  }
  return paths;
}

function setEq8Param(path: string | undefined, value: number) {
  if (!path) {
    return;
  }
  param.path = path;
  if (!param.id || param.id == 0) {
    return;
  }
  param.set('value', value);
}

function hzToEq8Value(hz: number) {
  const min = Number(liveValue(param.get('min')));
  const max = Number(liveValue(param.get('max')));
  if (Number.isFinite(min) && Number.isFinite(max) && max > 1.5) {
    return Math.max(min, Math.min(max, hz));
  }
  const t = Math.log(hz / EQ8_FREQ_MIN_HZ) / Math.log(EQ8_FREQ_MAX_HZ / EQ8_FREQ_MIN_HZ);
  return Math.max(0, Math.min(1, t));
}

function setEq8Freq(path: string | undefined, hz: number) {
  if (!path) {
    return;
  }
  param.path = path;
  if (!param.id || param.id == 0) {
    return;
  }
  param.set('value', hzToEq8Value(hz));
}

function configureEq8(bands: Eq8Band[]) {
  if (!device.id || device.id == 0) {
    return;
  }
  const paths = eq8ParamPaths();
  for (const band of bands) {
    for (const side of ['A', 'B']) {
      setEq8Param(paths[band.band + ' Filter On ' + side], 1);
      setEq8Param(paths[band.band + ' Filter Type ' + side], band.type);
      if (band.freq != null) {
        setEq8Freq(paths[band.band + ' Frequency ' + side], band.freq);
      }
    }
  }
}

function insertEq8Preset(bands: Eq8Band[]) {
  if (!insertAtChainEnd(NATIVE_DEVICES.eq8)) {
    return;
  }
  configureEq8(bands);
}

export function eq8() {
  insertAtChainEnd(NATIVE_DEVICES.eq8);
}

export function low() {
  insertEq8Preset([{ band: 4, type: EQ8_HIGH_CUT_12, freq: EQ8_LOWPASS_HZ }]);
}

export function high() {
  insertEq8Preset([{ band: 1, type: EQ8_LOW_CUT_12, freq: EQ8_HIGHPASS_HZ }]);
}

export function notch() {
  insertEq8Preset([{ band: 2, type: EQ8_NOTCH }]);
}

export function band() {
  insertEq8Preset([
    { band: 1, type: EQ8_LOW_CUT_12, freq: EQ8_HIGHPASS_HZ },
    { band: 4, type: EQ8_HIGH_CUT_12, freq: EQ8_LOWPASS_HZ },
  ]);
}

export function eq3() {
  insertAtChainEnd(NATIVE_DEVICES.eq3);
}

export function eros() {
  insertAtChainEnd(NATIVE_DEVICES.eros);
}

export function exta() {
  insertAtChainEnd(NATIVE_DEVICES.exta);
}

export function fdel() {
  insertAtChainEnd(NATIVE_DEVICES.fdel);
}

export function gate() {
  insertAtChainEnd(NATIVE_DEVICES.gate);
}

export function glue() {
  insertAtChainEnd(NATIVE_DEVICES.glue);
}

export function grain() {
  insertAtChainEnd(NATIVE_DEVICES.grain);
}

export function hyb() {
  insertAtChainEnd(NATIVE_DEVICES.hyb);
}

export function lim() {
  insertAtChainEnd(NATIVE_DEVICES.lim);
}

export function loop() {
  insertAtChainEnd(NATIVE_DEVICES.loop);
}

export function mbd() {
  insertAtChainEnd(NATIVE_DEVICES.mbd);
}

export function od() {
  insertAtChainEnd(NATIVE_DEVICES.od);
}

export function ped() {
  insertAtChainEnd(NATIVE_DEVICES.ped);
}

export function phas() {
  insertAtChainEnd(NATIVE_DEVICES.phas);
}

export function red() {
  insertAtChainEnd(NATIVE_DEVICES.red);
}

export function reso() {
  insertAtChainEnd(NATIVE_DEVICES.reso);
}

export function verb() {
  insertAtChainEnd(NATIVE_DEVICES.verb);
}

export function roar() {
  insertAtChainEnd(NATIVE_DEVICES.roar);
}

export function sat() {
  insertAtChainEnd(NATIVE_DEVICES.sat);
}

export function shif() {
  insertAtChainEnd(NATIVE_DEVICES.shif);
}

export function sres() {
  insertAtChainEnd(NATIVE_DEVICES.sres);
}

export function stime() {
  insertAtChainEnd(NATIVE_DEVICES.stime);
}

export function spec() {
  insertAtChainEnd(NATIVE_DEVICES.spec);
}

export function tun() {
  insertAtChainEnd(NATIVE_DEVICES.tun);
}

export function ut() {
  insertAtChainEnd(NATIVE_DEVICES.ut);
}

export function vin() {
  insertAtChainEnd(NATIVE_DEVICES.vin);
}

export function voc() {
  insertAtChainEnd(NATIVE_DEVICES.voc);
}

export function arp() {
  insertAtChainEnd(NATIVE_DEVICES.arp);
}

export function cc() {
  insertAtChainEnd(NATIVE_DEVICES.cc);
}

export function chordmidi() {
  insertAtChainEnd(NATIVE_DEVICES.chordmidi);
}

export function mrack() {
  insertAtChainEnd(NATIVE_DEVICES.mrack);
}

export function nlen() {
  insertAtChainEnd(NATIVE_DEVICES.nlen);
}

export function pit() {
  insertAtChainEnd(NATIVE_DEVICES.pit);
}

export function rand() {
  insertAtChainEnd(NATIVE_DEVICES.rand);
}

export function sca() {
  insertAtChainEnd(NATIVE_DEVICES.sca);
}

export function vel() {
  insertAtChainEnd(NATIVE_DEVICES.vel);
}
