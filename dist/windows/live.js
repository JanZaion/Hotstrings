// src/actions/arrangementView.ts
var CUE_EPS = 0.01;
var detailClip = new LiveAPI();
var song = new LiveAPI();
var cue = new LiveAPI();
function liveValue(raw) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}
function getDetailClip() {
  detailClip.path = "live_set view detail_clip";
  if (!detailClip.id || detailClip.id == 0) {
    return null;
  }
  return detailClip;
}
function findCueAt(time) {
  const n = song.getcount("cue_points");
  let bestIndex = -1;
  let bestDist = CUE_EPS;
  for (let i = 0; i < n; i++) {
    cue.path = "live_set cue_points " + i;
    const t = Number(liveValue(cue.get("time")));
    const d = Math.abs(t - time);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) {
    return null;
  }
  cue.path = "live_set cue_points " + bestIndex;
  return cue;
}
function cliploop() {
  const clip = getDetailClip();
  if (!clip) {
    return;
  }
  clip.set("looping", 1);
}
function loc(name) {
  song.path = "live_set";
  if (!song.id || song.id == 0) {
    return;
  }
  const marker = Number(liveValue(song.get("start_time")));
  if (!Number.isFinite(marker)) {
    return;
  }
  const label = name == null || name === "" ? "" : String(name);
  const existing = findCueAt(marker);
  if (existing) {
    if (label) {
      existing.set("name", label);
    }
    return;
  }
  const playhead = Number(liveValue(song.get("current_song_time")));
  song.set("current_song_time", marker);
  song.call("set_or_delete_cue");
  if (Number.isFinite(playhead)) {
    song.set("current_song_time", playhead);
  }
  song.set("start_time", marker);
  if (!label) {
    return;
  }
  const created = findCueAt(marker);
  if (created) {
    created.set("name", label);
  }
}

// src/actions/devices.ts
var SCROLL_PAGES = 16;
var SCROLL_RIGHT = 3;
var appView = new LiveAPI();
var songView = new LiveAPI();
var track = new LiveAPI();
var device = new LiveAPI();
var parent = new LiveAPI();
var param = new LiveAPI();
var NATIVE_DEVICES = {
  ana: "Analog",
  colis: "Collision",
  dri: "Drift",
  drumr: "Drum Rack",
  elec: "Electric",
  exti: "External Instrument",
  imp: "Impulse",
  irack: "Instrument Rack",
  meld: "Meld",
  op: "Operator",
  samp: "Sampler",
  simp: "Simpler",
  ten: "Tension",
  wav: "Wavetable",
  amp: "Amp",
  arack: "Audio Effect Rack",
  af: "Auto Filter",
  apan: "Auto Pan-Tremolo",
  ash: "Auto Shift",
  beat: "Beat Repeat",
  cab: "Cabinet",
  cheq: "Channel EQ",
  ens: "Chorus-Ensemble",
  comp: "Compressor",
  corp: "Corpus",
  del: "Delay",
  drumb: "Drum Buss",
  tube: "Dynamic Tube",
  echo: "Echo",
  eq8: "EQ Eight",
  eq3: "EQ Three",
  eros: "Erosion",
  exta: "External Audio Effect",
  fdel: "Filter Delay",
  gate: "Gate",
  glue: "Glue Compressor",
  grain: "Grain Delay",
  hyb: "Hybrid Reverb",
  lim: "Limiter",
  loop: "Looper",
  mbd: "Multiband Dynamics",
  od: "Overdrive",
  ped: "Pedal",
  phas: "Phaser-Flanger",
  red: "Redux",
  reso: "Resonators",
  verb: "Reverb",
  roar: "Roar",
  sat: "Saturator",
  shif: "Shifter",
  sres: "Spectral Resonator",
  stime: "Spectral Time",
  spec: "Spectrum",
  tun: "Tuner",
  ut: "Utility",
  vin: "Vinyl Distortion",
  voc: "Vocoder",
  arp: "Arpeggiator",
  cc: "CC Control",
  chordmidi: "Chord",
  mrack: "MIDI Effect Rack",
  nlen: "Note Length",
  pit: "Pitch",
  rand: "Random",
  sca: "Scale",
  vel: "Velocity"
};
var INSTRUMENT_TYPE = 1;
var INSTRUMENT_NAMES = /* @__PURE__ */ new Set([
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
  NATIVE_DEVICES.wav
]);
function liveValue2(raw) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}
function liveId(raw) {
  const items = raw instanceof Array ? raw : raw == null || raw === "" ? [] : [raw];
  for (const item of items) {
    if (typeof item === "string" && item !== "" && Number.isNaN(Number(item))) {
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
  track.path = "live_set view selected_track";
  if (!track.id || track.id == 0) {
    return null;
  }
  device.path = track.path + " view selected_device";
  if (device.id && device.id != 0) {
    const id = liveId(device.get("canonical_parent"));
    if (id) {
      parent.id = id;
      if (parent.type === "Chain" || parent.type === "DrumChain") {
        return parent;
      }
    }
  }
  return track;
}
function findInstrumentIndex(chain) {
  const n = chain.getcount("devices");
  for (let i = 0; i < n; i++) {
    device.path = chain.path + " devices " + i;
    if (!device.id || device.id == 0) {
      continue;
    }
    const kind = liveValue2(device.get("type"));
    if (kind == INSTRUMENT_TYPE || kind === "instrument") {
      return i;
    }
  }
  return -1;
}
function selectInserted(chain, index, scrollEnd) {
  device.path = chain.path + " devices " + index;
  if (!device.id || device.id == 0) {
    return;
  }
  const id = device.id;
  appView.path = "live_app view";
  appView.call("focus_view", "Detail/DeviceChain");
  songView.path = "live_set view";
  songView.call("select_device", "id", id);
  if (!scrollEnd) {
    return;
  }
  for (let i = 0; i < SCROLL_PAGES; i++) {
    appView.call("scroll_view", SCROLL_RIGHT, "Detail/DeviceChain", 0);
  }
  songView.call("select_device", "id", id);
}
function insertAtChainEnd(name) {
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
        chain.call("delete_device", index);
        chain.call("insert_device", name, index);
        scrollEnd = false;
      } else {
        chain.call("insert_device", name);
      }
    } else {
      chain.call("insert_device", name);
    }
  } catch {
    return false;
  }
  const n = chain.getcount("devices");
  if (n < 1) {
    return false;
  }
  if (index < 0) {
    index = n - 1;
  }
  selectInserted(chain, index, scrollEnd);
  return !!(device.id && device.id != 0);
}
function ana() {
  insertAtChainEnd(NATIVE_DEVICES.ana);
}
function colis() {
  insertAtChainEnd(NATIVE_DEVICES.colis);
}
function dri() {
  insertAtChainEnd(NATIVE_DEVICES.dri);
}
function drumr() {
  insertAtChainEnd(NATIVE_DEVICES.drumr);
}
function elec() {
  insertAtChainEnd(NATIVE_DEVICES.elec);
}
function exti() {
  insertAtChainEnd(NATIVE_DEVICES.exti);
}
function imp() {
  insertAtChainEnd(NATIVE_DEVICES.imp);
}
function irack() {
  insertAtChainEnd(NATIVE_DEVICES.irack);
}
function meld() {
  insertAtChainEnd(NATIVE_DEVICES.meld);
}
function op() {
  insertAtChainEnd(NATIVE_DEVICES.op);
}
function samp() {
  insertAtChainEnd(NATIVE_DEVICES.samp);
}
function simp() {
  insertAtChainEnd(NATIVE_DEVICES.simp);
}
function ten() {
  insertAtChainEnd(NATIVE_DEVICES.ten);
}
function wav() {
  insertAtChainEnd(NATIVE_DEVICES.wav);
}
function amp() {
  insertAtChainEnd(NATIVE_DEVICES.amp);
}
function arack() {
  insertAtChainEnd(NATIVE_DEVICES.arack);
}
function af() {
  insertAtChainEnd(NATIVE_DEVICES.af);
}
function apan() {
  insertAtChainEnd(NATIVE_DEVICES.apan);
}
function ash() {
  insertAtChainEnd(NATIVE_DEVICES.ash);
}
function beat() {
  insertAtChainEnd(NATIVE_DEVICES.beat);
}
function cab() {
  insertAtChainEnd(NATIVE_DEVICES.cab);
}
function cheq() {
  insertAtChainEnd(NATIVE_DEVICES.cheq);
}
function ens() {
  insertAtChainEnd(NATIVE_DEVICES.ens);
}
function comp() {
  insertAtChainEnd(NATIVE_DEVICES.comp);
}
function corp() {
  insertAtChainEnd(NATIVE_DEVICES.corp);
}
function del() {
  insertAtChainEnd(NATIVE_DEVICES.del);
}
function drumb() {
  insertAtChainEnd(NATIVE_DEVICES.drumb);
}
function tube() {
  insertAtChainEnd(NATIVE_DEVICES.tube);
}
function echo() {
  insertAtChainEnd(NATIVE_DEVICES.echo);
}
var EQ8_LOW_CUT_12 = 1;
var EQ8_NOTCH = 4;
var EQ8_HIGH_CUT_12 = 6;
var EQ8_HIGHPASS_HZ = 130;
var EQ8_LOWPASS_HZ = 1e4;
var EQ8_FREQ_MIN_HZ = 10;
var EQ8_FREQ_MAX_HZ = 22e3;
function eq8ParamPaths() {
  const paths = {};
  const path = device.path;
  const n = device.getcount("parameters");
  for (let i = 0; i < n; i++) {
    param.path = path + " parameters " + i;
    if (!param.id || param.id == 0) {
      continue;
    }
    const name = liveValue2(param.get("name"));
    if (typeof name === "string" && name !== "") {
      paths[name] = param.path;
    }
  }
  return paths;
}
function setEq8Param(path, value) {
  if (!path) {
    return;
  }
  param.path = path;
  if (!param.id || param.id == 0) {
    return;
  }
  param.set("value", value);
}
function hzToEq8Value(hz) {
  const min = Number(liveValue2(param.get("min")));
  const max = Number(liveValue2(param.get("max")));
  if (Number.isFinite(min) && Number.isFinite(max) && max > 1.5) {
    return Math.max(min, Math.min(max, hz));
  }
  const t = Math.log(hz / EQ8_FREQ_MIN_HZ) / Math.log(EQ8_FREQ_MAX_HZ / EQ8_FREQ_MIN_HZ);
  return Math.max(0, Math.min(1, t));
}
function setEq8Freq(path, hz) {
  if (!path) {
    return;
  }
  param.path = path;
  if (!param.id || param.id == 0) {
    return;
  }
  param.set("value", hzToEq8Value(hz));
}
function configureEq8(bands) {
  if (!device.id || device.id == 0) {
    return;
  }
  const paths = eq8ParamPaths();
  for (const band2 of bands) {
    for (const side of ["A", "B"]) {
      setEq8Param(paths[band2.band + " Filter On " + side], 1);
      setEq8Param(paths[band2.band + " Filter Type " + side], band2.type);
      if (band2.freq != null) {
        setEq8Freq(paths[band2.band + " Frequency " + side], band2.freq);
      }
    }
  }
}
function insertEq8Preset(bands) {
  if (!insertAtChainEnd(NATIVE_DEVICES.eq8)) {
    return;
  }
  configureEq8(bands);
}
function eq8() {
  insertAtChainEnd(NATIVE_DEVICES.eq8);
}
function low() {
  insertEq8Preset([{ band: 4, type: EQ8_HIGH_CUT_12, freq: EQ8_LOWPASS_HZ }]);
}
function high() {
  insertEq8Preset([{ band: 1, type: EQ8_LOW_CUT_12, freq: EQ8_HIGHPASS_HZ }]);
}
function notch() {
  insertEq8Preset([{ band: 2, type: EQ8_NOTCH }]);
}
function band() {
  insertEq8Preset([
    { band: 1, type: EQ8_LOW_CUT_12, freq: EQ8_HIGHPASS_HZ },
    { band: 4, type: EQ8_HIGH_CUT_12, freq: EQ8_LOWPASS_HZ }
  ]);
}
function eq3() {
  insertAtChainEnd(NATIVE_DEVICES.eq3);
}
function eros() {
  insertAtChainEnd(NATIVE_DEVICES.eros);
}
function exta() {
  insertAtChainEnd(NATIVE_DEVICES.exta);
}
function fdel() {
  insertAtChainEnd(NATIVE_DEVICES.fdel);
}
function gate() {
  insertAtChainEnd(NATIVE_DEVICES.gate);
}
function glue() {
  insertAtChainEnd(NATIVE_DEVICES.glue);
}
function grain() {
  insertAtChainEnd(NATIVE_DEVICES.grain);
}
function hyb() {
  insertAtChainEnd(NATIVE_DEVICES.hyb);
}
function lim() {
  insertAtChainEnd(NATIVE_DEVICES.lim);
}
function loop() {
  insertAtChainEnd(NATIVE_DEVICES.loop);
}
function mbd() {
  insertAtChainEnd(NATIVE_DEVICES.mbd);
}
function od() {
  insertAtChainEnd(NATIVE_DEVICES.od);
}
function ped() {
  insertAtChainEnd(NATIVE_DEVICES.ped);
}
function phas() {
  insertAtChainEnd(NATIVE_DEVICES.phas);
}
function red() {
  insertAtChainEnd(NATIVE_DEVICES.red);
}
function reso() {
  insertAtChainEnd(NATIVE_DEVICES.reso);
}
function verb() {
  insertAtChainEnd(NATIVE_DEVICES.verb);
}
function roar() {
  insertAtChainEnd(NATIVE_DEVICES.roar);
}
function sat() {
  insertAtChainEnd(NATIVE_DEVICES.sat);
}
function shif() {
  insertAtChainEnd(NATIVE_DEVICES.shif);
}
function sres() {
  insertAtChainEnd(NATIVE_DEVICES.sres);
}
function stime() {
  insertAtChainEnd(NATIVE_DEVICES.stime);
}
function spec() {
  insertAtChainEnd(NATIVE_DEVICES.spec);
}
function tun() {
  insertAtChainEnd(NATIVE_DEVICES.tun);
}
function ut() {
  insertAtChainEnd(NATIVE_DEVICES.ut);
}
function vin() {
  insertAtChainEnd(NATIVE_DEVICES.vin);
}
function voc() {
  insertAtChainEnd(NATIVE_DEVICES.voc);
}
function arp() {
  insertAtChainEnd(NATIVE_DEVICES.arp);
}
function cc() {
  insertAtChainEnd(NATIVE_DEVICES.cc);
}
function chordmidi() {
  insertAtChainEnd(NATIVE_DEVICES.chordmidi);
}
function mrack() {
  insertAtChainEnd(NATIVE_DEVICES.mrack);
}
function nlen() {
  insertAtChainEnd(NATIVE_DEVICES.nlen);
}
function pit() {
  insertAtChainEnd(NATIVE_DEVICES.pit);
}
function rand() {
  insertAtChainEnd(NATIVE_DEVICES.rand);
}
function sca() {
  insertAtChainEnd(NATIVE_DEVICES.sca);
}
function vel() {
  insertAtChainEnd(NATIVE_DEVICES.vel);
}

// src/constants.ts
var FIXED_CHORDS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  aug: [0, 4, 8],
  dim: [0, 3, 6],
  pow: [0, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dim7: [0, 3, 6, 9],
  aug7: [0, 4, 8, 10],
  major9: [0, 4, 7, 11, 14],
  minor9: [0, 3, 7, 10, 14],
  dim9: [0, 3, 6, 9, 14],
  aug9: [0, 4, 8, 10, 14]
};
var MAJOR_FAMILY = {
  3: FIXED_CHORDS.major,
  4: FIXED_CHORDS.major7,
  5: FIXED_CHORDS.major9
};
var GRID_BEATS = {
  0: 1,
  1: 32,
  2: 16,
  3: 8,
  4: 4,
  5: 2,
  6: 1,
  7: 0.5,
  8: 0.25,
  9: 0.125
};
var IONIAN = [0, 2, 4, 5, 7, 9, 11];
var AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
var DORIAN = [0, 2, 3, 5, 7, 9, 10];
var MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];
var LYDIAN = [0, 2, 4, 6, 7, 9, 11];
var PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
var LOCRIAN = [0, 1, 3, 5, 6, 8, 10];
var WHOLE_TONE = [0, 2, 4, 6, 8, 10];
var HALF_WHOLE = [0, 1, 3, 4, 6, 7, 9, 10];
var WHOLE_HALF = [0, 2, 3, 5, 6, 8, 9, 11];
var MINOR_BLUES = [0, 3, 5, 6, 7, 10];
var MINOR_PENT = [0, 3, 5, 7, 10];
var MAJOR_PENT = [0, 2, 4, 7, 9];
var HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
var HARMONIC_MAJOR = [0, 2, 4, 5, 7, 8, 11];
var DORIAN_SHARP4 = [0, 2, 3, 6, 7, 9, 10];
var PHRYGIAN_DOM = [0, 1, 4, 5, 7, 8, 10];
var MELODIC_MINOR = [0, 2, 3, 5, 7, 9, 11];
var LYDIAN_AUG = [0, 2, 4, 6, 8, 9, 11];
var LYDIAN_DOM = [0, 2, 4, 6, 7, 9, 10];
var ALTERED = [0, 1, 3, 4, 6, 8, 10];
var EIGHT_TONE_SPANISH = [0, 1, 3, 4, 5, 6, 8, 10];
var SPANISH_HEPTATONIC = [0, 1, 3, 4, 5, 8, 10];
var BHAIRAV = [0, 1, 4, 5, 7, 8, 11];
var HUNGARIAN_MINOR = [0, 2, 3, 6, 7, 8, 11];
var HIRAJOSHI = [0, 2, 3, 7, 8];
var IN_SEN = [0, 1, 5, 7, 10];
var IWATO = [0, 1, 5, 6, 10];
var KUMOI = [0, 2, 3, 7, 9];
var PELOG_SELISIR = [0, 1, 3, 7, 8];
var PELOG_TEMBUNG = [0, 2, 3, 7, 10];
var MESSIAEN_3 = [0, 2, 3, 4, 6, 7, 8, 10, 11];
var MESSIAEN_4 = [0, 1, 2, 5, 6, 7, 8, 11];
var MESSIAEN_5 = [0, 1, 5, 6, 7, 11];
var MESSIAEN_6 = [0, 2, 4, 5, 6, 8, 10, 11];
var MESSIAEN_7 = [0, 1, 2, 3, 5, 6, 7, 8, 9, 11];
var SCALE_INTERVALS = {
  major: IONIAN,
  minor: AEOLIAN,
  dorian: DORIAN,
  mixolydian: MIXOLYDIAN,
  lydian: LYDIAN,
  phrygian: PHRYGIAN,
  locrian: LOCRIAN,
  "whole tone": WHOLE_TONE,
  "half-whole dim.": HALF_WHOLE,
  "half-whole diminished": HALF_WHOLE,
  "whole-half dim.": WHOLE_HALF,
  "whole-half diminished": WHOLE_HALF,
  "whole-half": WHOLE_HALF,
  "minor blues": MINOR_BLUES,
  "minor pentatonic": MINOR_PENT,
  "major pentatonic": MAJOR_PENT,
  "harmonic minor": HARMONIC_MINOR,
  "harmonic major": HARMONIC_MAJOR,
  "dorian #4": DORIAN_SHARP4,
  "phrygian dominant": PHRYGIAN_DOM,
  "melodic minor": MELODIC_MINOR,
  "lydian augmented": LYDIAN_AUG,
  "lydian dominant": LYDIAN_DOM,
  "super locrian": ALTERED,
  altered: ALTERED,
  "8-tone spanish": EIGHT_TONE_SPANISH,
  "spanish heptatonic": SPANISH_HEPTATONIC,
  bhairav: BHAIRAV,
  "double harmonic major": BHAIRAV,
  "hungarian minor": HUNGARIAN_MINOR,
  hirajoshi: HIRAJOSHI,
  "in-sen": IN_SEN,
  iwato: IWATO,
  kumoi: KUMOI,
  "flat three pentatonic": KUMOI,
  "pelog selisir": PELOG_SELISIR,
  pelog: PELOG_SELISIR,
  "pelog tembung": PELOG_TEMBUNG,
  "messiaen 3": MESSIAEN_3,
  "messiaen's mode #3": MESSIAEN_3,
  "messiaen 4": MESSIAEN_4,
  "messiaen's mode #4": MESSIAEN_4,
  "messiaen 5": MESSIAEN_5,
  "messiaen's mode #5": MESSIAEN_5,
  "messiaen 6": MESSIAEN_6,
  "messiaen's mode #6": MESSIAEN_6,
  "messiaen 7": MESSIAEN_7,
  "messiaen's mode #7": MESSIAEN_7
};
var SCALE_ALIASES = {
  diminished: "half-whole diminished",
  hirojoshi: "hirajoshi",
  spanish: "phrygian dominant",
  "minor gypsy": "hungarian minor"
};

// src/bindings.ts
var BINDINGS = {
  hotkeys: [
    { key: "`", bind: "cliploop", keys: "^j" },
    { key: "^!Left", bind: "chainLeft" },
    { key: "^!Right", bind: "chainRight" }
  ],
  hotstrings: [
    { key: "chord", bind: "chord" },
    { key: "chord7", bind: "chord7" },
    { key: "chord9", bind: "chord9" },
    ...Object.keys(FIXED_CHORDS).map((key) => ({ key, bind: key })),
    { key: "lead", bind: "lead" },
    { key: "up", bind: "up" },
    { key: "down", bind: "down" },
    { key: "doub", bind: "doub" },
    { key: "half", bind: "half" },
    { key: "fit", bind: "fit" },
    { key: "inv", bind: "inv" },
    { key: "rev", bind: "rev" },
    { key: "first", bind: "first" },
    { key: "last", bind: "last" },
    { key: "col", bind: "col" },
    { key: "exp", bind: "exp" },
    { key: "sol", bind: "sol" },
    { key: "unsol", bind: "unsol" },
    { key: "loc", bind: "loc", str: true },
    { key: "=", bind: "volup", int: true },
    { key: "-", bind: "voldown", int: true },
    { key: "low", bind: "low" },
    { key: "high", bind: "high" },
    { key: "notch", bind: "notch" },
    { key: "band", bind: "band" },
    ...Object.keys(NATIVE_DEVICES).map((key) => ({ key, bind: key }))
  ]
};

// src/actions/chords.ts
var live = new LiveAPI();
var detailClip2 = new LiveAPI();
function liveApi(path) {
  live.path = path;
  return live;
}
function liveValue3(raw) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}
function liveInts(raw) {
  const items = raw instanceof Array ? raw : raw == null || raw === "" ? [] : [raw];
  const out = [];
  for (const item of items) {
    if (typeof item === "string" && item !== "" && Number.isNaN(Number(item))) {
      continue;
    }
    const n = Number(item);
    if (Number.isFinite(n)) {
      out.push(n);
    }
  }
  return out;
}
function getDetailMidiClip() {
  const songView3 = liveApi("live_set view");
  if (!songView3.id || songView3.id == 0) {
    return null;
  }
  if (songView3.call("is_view_visible", "Detail/Clip") != 1) {
    return null;
  }
  detailClip2.path = "live_set view detail_clip";
  if (!detailClip2.id || detailClip2.id == 0) {
    return null;
  }
  if (liveValue3(detailClip2.get("is_midi_clip")) != 1) {
    return null;
  }
  return detailClip2;
}
function gridStepBeats(clip) {
  const clipView = liveApi(clip.path + " view");
  if (!clipView.id || clipView.id == 0) {
    return 1;
  }
  const grid = Number(liveValue3(clipView.get("grid_quantization")));
  const beats = GRID_BEATS[grid] ?? 1;
  if (liveValue3(clipView.get("grid_is_triplet")) == 1) {
    return beats * (2 / 3);
  }
  return beats;
}
function selectedNotes(clip) {
  const raw = clip.call("get_selected_notes_extended");
  if (!raw) {
    return [];
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return parsed && parsed.notes ? parsed.notes : [];
}
function noteSpecFromRoot(root, pitch, duration, startTime) {
  const spec2 = {
    pitch,
    start_time: startTime === void 0 ? root.start_time : startTime,
    duration
  };
  if (root.velocity !== void 0) {
    spec2.velocity = root.velocity;
  }
  if (root.mute !== void 0) {
    spec2.mute = root.mute;
  }
  if (root.probability !== void 0) {
    spec2.probability = root.probability;
  }
  if (root.velocity_deviation !== void 0) {
    spec2.velocity_deviation = root.velocity_deviation;
  }
  if (root.release_velocity !== void 0) {
    spec2.release_velocity = root.release_velocity;
  }
  return spec2;
}
function pushTone(notes, root, pitch, duration, startTime) {
  if (pitch < 0 || pitch > 127) {
    return;
  }
  notes.push(noteSpecFromRoot(root, pitch, duration, startTime));
}
function normalizeScaleName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
function scaleIntervalsForName(name) {
  const normalized = normalizeScaleName(name);
  return SCALE_INTERVALS[normalized] ?? SCALE_INTERVALS[SCALE_ALIASES[normalized] ?? ""];
}
function pitchClass(pitch) {
  return (pitch % 12 + 12) % 12;
}
function pitchAbove(from, pc) {
  let pitch = from;
  while (pitchClass(pitch) !== pc) {
    pitch += 1;
  }
  return pitch;
}
function majorFamily(toneCount) {
  if (toneCount >= 5) {
    return MAJOR_FAMILY[5];
  }
  if (toneCount >= 4) {
    return MAJOR_FAMILY[4];
  }
  return MAJOR_FAMILY[3];
}
function diatonicPitches(rootPitch, tonicPc, scaleIntervals, toneCount) {
  const fallback = majorFamily(toneCount);
  if (scaleIntervals.length < 2) {
    return fallback.map((interval) => rootPitch + interval);
  }
  const pcs = scaleIntervals.map((interval) => pitchClass(tonicPc + interval));
  const degree = pcs.indexOf(pitchClass(rootPitch));
  if (degree === -1) {
    return fallback.map((interval) => rootPitch + interval);
  }
  const count = Math.max(1, Math.min(5, toneCount));
  const pitches = [];
  let prev = rootPitch;
  for (let i = 0; i < count; i++) {
    const pc = pcs[(degree + i * 2) % pcs.length];
    const pitch = i === 0 ? rootPitch : pitchAbove(prev + 1, pc);
    pitches.push(pitch);
    prev = pitch;
  }
  return pitches;
}
function clipScale(clip) {
  const tonic = Number(liveValue3(clip.get("root_note")));
  const tonicPc = Number.isFinite(tonic) ? (tonic % 12 + 12) % 12 : 0;
  const intervals = liveInts(clip.get("scale_intervals")).filter((n) => n >= 0 && n < 12);
  if (intervals.length >= 2) {
    const scale = { tonicPc, intervals };
    return scale;
  }
  const named = scaleIntervalsForName(String(liveValue3(clip.get("scale_name")) ?? ""));
  if (named && named.length >= 2) {
    const scale = { tonicPc, intervals: named };
    return scale;
  }
  return null;
}
function groupSelectedByStartTime(notes) {
  const sorted = notes.slice().sort((a, b) => a.start_time - b.start_time || a.pitch - b.pitch);
  const groups = [];
  for (const note of sorted) {
    const last2 = groups[groups.length - 1];
    if (last2 && last2[0].start_time === note.start_time) {
      last2.push(note);
    } else {
      groups.push([note]);
    }
  }
  return groups;
}
function selectedNoteIds(notes) {
  const ids = [];
  for (const note of notes) {
    if (note.note_id !== void 0) {
      ids.push(note.note_id);
    }
  }
  return ids;
}
function replaceSelectedNotes(clip, selected, notes) {
  const ids = selectedNoteIds(selected);
  if (ids.length) {
    clip.call("remove_notes_by_id", ids);
  }
  if (notes.length) {
    clip.call("add_new_notes", { notes });
  }
}
function nearestPitchInterval(pitch, otherPitches) {
  let nearest = Infinity;
  for (const other of otherPitches) {
    const interval = Math.abs(pitch - other);
    if (interval < nearest) {
      nearest = interval;
    }
  }
  return nearest;
}
function solarCandidatePitch(pitch, referencePitches) {
  const stayInterval = nearestPitchInterval(pitch, referencePitches);
  const upPitch = pitch + 12;
  const upInterval = nearestPitchInterval(upPitch, referencePitches);
  let chosenPitch = pitch;
  let chosenInterval = stayInterval;
  if (upInterval <= chosenInterval) {
    chosenPitch = upPitch;
    chosenInterval = upInterval;
  }
  const downPitch = pitch - 12;
  const downInterval = nearestPitchInterval(downPitch, referencePitches);
  if (downInterval < chosenInterval) {
    chosenPitch = downPitch;
  }
  return chosenPitch;
}
function voiceLeadGroups(groups) {
  const firstPitches = [];
  for (const note of groups[0]) {
    firstPitches.push(note.pitch);
  }
  const notes = [];
  for (let index = 0; index < groups.length; index++) {
    for (const note of groups[index]) {
      const pitch = index === 0 ? note.pitch : solarCandidatePitch(note.pitch, firstPitches);
      pushTone(notes, note, pitch, note.duration ?? 0);
    }
  }
  return notes;
}
function groupSpanBeats(group) {
  let span = 0;
  for (const note of group) {
    if (note.duration !== void 0 && note.duration > span) {
      span = note.duration;
    }
  }
  return span;
}
function arpeggiateGroups(groups, direction, stepBeats) {
  const notes = [];
  const step = stepBeats > 0 ? stepBeats : 1;
  for (const group of groups) {
    if (group.length === 0) {
      continue;
    }
    const span = groupSpanBeats(group);
    if (span <= 0) {
      continue;
    }
    const ordered = direction === "down" ? group.slice().reverse() : group;
    const columnCount = Math.max(1, Math.ceil(span / step));
    let used = 0;
    for (let col2 = 0; col2 < columnCount; col2++) {
      const remaining = span - used;
      const duration = col2 === columnCount - 1 ? remaining : Math.min(step, remaining);
      if (duration <= 0) {
        break;
      }
      const tone = ordered[col2 % ordered.length];
      pushTone(notes, tone, tone.pitch, duration, group[0].start_time + used);
      used += duration;
    }
  }
  return notes;
}
function rewriteSelected(pitchesFromRoot) {
  const clip = getDetailMidiClip();
  if (!clip) {
    return;
  }
  const roots = selectedNotes(clip);
  if (roots.length === 0) {
    return;
  }
  const duration = gridStepBeats(clip);
  const ids = [];
  const notes = [];
  for (const root of roots) {
    if (root.note_id !== void 0) {
      ids.push(root.note_id);
    }
    for (const pitch of pitchesFromRoot(root, clip)) {
      pushTone(notes, root, pitch, duration);
    }
  }
  if (ids.length) {
    clip.call("remove_notes_by_id", ids);
  }
  clip.call("add_new_notes", { notes });
}
function fixedChord(quality) {
  const intervals = FIXED_CHORDS[quality];
  rewriteSelected((root) => intervals.map((interval) => root.pitch + interval));
}
function scaleChord(toneCount) {
  rewriteSelected((root, clip) => {
    const scale = clipScale(clip);
    if (!scale) {
      return diatonicPitches(root.pitch, 0, [], toneCount);
    }
    return diatonicPitches(root.pitch, scale.tonicPc, scale.intervals, toneCount);
  });
}
function chord() {
  scaleChord(3);
}
function chord7() {
  scaleChord(4);
}
function chord9() {
  scaleChord(5);
}
function major() {
  fixedChord("major");
}
function minor() {
  fixedChord("minor");
}
function sus2() {
  fixedChord("sus2");
}
function sus4() {
  fixedChord("sus4");
}
function aug() {
  fixedChord("aug");
}
function dim() {
  fixedChord("dim");
}
function pow() {
  fixedChord("pow");
}
function major7() {
  fixedChord("major7");
}
function minor7() {
  fixedChord("minor7");
}
function dim7() {
  fixedChord("dim7");
}
function aug7() {
  fixedChord("aug7");
}
function major9() {
  fixedChord("major9");
}
function minor9() {
  fixedChord("minor9");
}
function dim9() {
  fixedChord("dim9");
}
function aug9() {
  fixedChord("aug9");
}
function lead() {
  const clip = getDetailMidiClip();
  if (!clip) {
    return;
  }
  const selected = selectedNotes(clip);
  if (selected.length === 0) {
    return;
  }
  const groups = groupSelectedByStartTime(selected);
  if (groups.length <= 1) {
    return;
  }
  const notes = voiceLeadGroups(groups);
  if (notes.length === 0) {
    return;
  }
  replaceSelectedNotes(clip, selected, notes);
}
function arpeggiateSelected(direction) {
  const clip = getDetailMidiClip();
  if (!clip) {
    return;
  }
  const selected = selectedNotes(clip);
  if (selected.length === 0) {
    return;
  }
  const notes = arpeggiateGroups(
    groupSelectedByStartTime(selected),
    direction,
    gridStepBeats(clip)
  );
  if (notes.length === 0) {
    return;
  }
  replaceSelectedNotes(clip, selected, notes);
}
function up() {
  arpeggiateSelected("up");
}
function down() {
  arpeggiateSelected("down");
}

// src/actions/midiClip.ts
var live2 = new LiveAPI();
var detailClip3 = new LiveAPI();
function liveApi2(path) {
  live2.path = path;
  return live2;
}
function liveValue4(raw) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}
function liveInts2(raw) {
  const items = raw instanceof Array ? raw : raw == null || raw === "" ? [] : [raw];
  const out = [];
  for (const item of items) {
    if (typeof item === "string" && item !== "" && Number.isNaN(Number(item))) {
      continue;
    }
    const n = Number(item);
    if (Number.isFinite(n)) {
      out.push(n);
    }
  }
  return out;
}
function getDetailMidiClip2() {
  const songView3 = liveApi2("live_set view");
  if (!songView3.id || songView3.id == 0) {
    return null;
  }
  if (songView3.call("is_view_visible", "Detail/Clip") != 1) {
    return null;
  }
  detailClip3.path = "live_set view detail_clip";
  if (!detailClip3.id || detailClip3.id == 0) {
    return null;
  }
  if (liveValue4(detailClip3.get("is_midi_clip")) != 1) {
    return null;
  }
  return detailClip3;
}
function parseNotes(raw) {
  if (!raw) {
    return [];
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return parsed && parsed.notes ? parsed.notes : [];
}
function selectedNotes2(clip) {
  return parseNotes(clip.call("get_selected_notes_extended"));
}
function applySelected(update) {
  const clip = getDetailMidiClip2();
  if (!clip) {
    return;
  }
  const selected = selectedNotes2(clip);
  if (selected.length === 0) {
    return;
  }
  const notes = update(selected, clip);
  if (notes.length === 0) {
    return;
  }
  clip.call("apply_note_modifications", { notes });
}
function scaleDuration(notes, factor) {
  const out = [];
  for (const note of notes) {
    if (note.note_id === void 0) {
      continue;
    }
    const duration = (note.duration ?? 0) * factor;
    if (duration <= 0) {
      continue;
    }
    const next = { ...note, duration };
    out.push(next);
  }
  return out;
}
function normalizeScaleName2(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
function scaleIntervalsForName2(name) {
  const normalized = normalizeScaleName2(name);
  return SCALE_INTERVALS[normalized] ?? SCALE_INTERVALS[SCALE_ALIASES[normalized] ?? ""];
}
function pitchClass2(pitch) {
  return (pitch % 12 + 12) % 12;
}
function clipScale2(clip) {
  const tonic = Number(liveValue4(clip.get("root_note")));
  const tonicPc = Number.isFinite(tonic) ? (tonic % 12 + 12) % 12 : 0;
  const intervals = liveInts2(clip.get("scale_intervals")).filter((n) => n >= 0 && n < 12);
  if (intervals.length >= 2) {
    const scale = { tonicPc, intervals };
    return scale;
  }
  const named = scaleIntervalsForName2(String(liveValue4(clip.get("scale_name")) ?? ""));
  if (named && named.length >= 2) {
    const scale = { tonicPc, intervals: named };
    return scale;
  }
  return null;
}
function scalePitchClasses(scale) {
  const pcs = [];
  for (const interval of scale.intervals) {
    const pc = pitchClass2(scale.tonicPc + interval);
    if (!pcs.includes(pc)) {
      pcs.push(pc);
    }
  }
  return pcs;
}
function nearestScalePitch(pitch, pcs) {
  if (pcs.length === 0) {
    return pitch;
  }
  for (let dist = 0; dist <= 12; dist++) {
    const lower = pitch - dist;
    if (lower >= 0 && lower <= 127 && pcs.includes(pitchClass2(lower))) {
      return lower;
    }
    const upper = pitch + dist;
    if (dist > 0 && upper >= 0 && upper <= 127 && pcs.includes(pitchClass2(upper))) {
      return upper;
    }
  }
  return pitch;
}
function fitNotes(notes, clip) {
  const scale = clipScale2(clip);
  if (!scale) {
    return [];
  }
  const pcs = scalePitchClasses(scale);
  if (pcs.length === 0) {
    return [];
  }
  const out = [];
  for (const note of notes) {
    if (note.note_id === void 0) {
      continue;
    }
    const next = { ...note, pitch: nearestScalePitch(note.pitch, pcs) };
    out.push(next);
  }
  return out;
}
function invertChromatic(notes) {
  let minPitch = 127;
  let maxPitch = 0;
  for (const note of notes) {
    if (note.pitch < minPitch) {
      minPitch = note.pitch;
    }
    if (note.pitch > maxPitch) {
      maxPitch = note.pitch;
    }
  }
  const out = [];
  for (const note of notes) {
    if (note.note_id === void 0) {
      continue;
    }
    const pitch = Math.max(0, Math.min(127, minPitch + maxPitch - note.pitch));
    const next = { ...note, pitch };
    out.push(next);
  }
  return out;
}
function scalePitches(pcs) {
  const pitches = [];
  for (let pitch = 0; pitch <= 127; pitch++) {
    if (pcs.includes(pitchClass2(pitch))) {
      pitches.push(pitch);
    }
  }
  return pitches;
}
function nearestScaleIndex(pitch, pitches) {
  let best = 0;
  let bestDist = Infinity;
  for (let index = 0; index < pitches.length; index++) {
    const candidate = pitches[index];
    const dist = Math.abs(candidate - pitch);
    if (dist < bestDist || dist === bestDist && candidate < pitches[best]) {
      bestDist = dist;
      best = index;
    }
  }
  return best;
}
function invertScale(notes, scale) {
  const pitches = scalePitches(scalePitchClasses(scale));
  if (pitches.length === 0) {
    return invertChromatic(notes);
  }
  const indices = [];
  for (const note of notes) {
    indices.push(nearestScaleIndex(note.pitch, pitches));
  }
  let minIndex = indices[0];
  let maxIndex = indices[0];
  for (const index of indices) {
    if (index < minIndex) {
      minIndex = index;
    }
    if (index > maxIndex) {
      maxIndex = index;
    }
  }
  const out = [];
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (note.note_id === void 0) {
      continue;
    }
    const pitch = pitches[minIndex + maxIndex - indices[i]];
    if (pitch === void 0) {
      continue;
    }
    const next = { ...note, pitch };
    out.push(next);
  }
  return out;
}
function invertNotes(notes, clip) {
  const scale = clipScale2(clip);
  if (!scale) {
    return invertChromatic(notes);
  }
  return invertScale(notes, scale);
}
function reverseNotes(notes) {
  let minStart = Infinity;
  let maxStart = -Infinity;
  for (const note of notes) {
    if (note.start_time < minStart) {
      minStart = note.start_time;
    }
    if (note.start_time > maxStart) {
      maxStart = note.start_time;
    }
  }
  const out = [];
  for (const note of notes) {
    if (note.note_id === void 0) {
      continue;
    }
    const next = { ...note, start_time: minStart + maxStart - note.start_time };
    out.push(next);
  }
  return out;
}
function doub() {
  applySelected((notes) => scaleDuration(notes, 2));
}
function half() {
  applySelected((notes) => scaleDuration(notes, 0.5));
}
function fit() {
  applySelected(fitNotes);
}
function inv() {
  applySelected(invertNotes);
}
function rev() {
  applySelected(reverseNotes);
}

// src/actions/mixer.ts
var STEP_DB = 3;
var MAX_DB = 6;
var MIN_DB = -70;
var LINEAR_MIN_DB = -18;
var LINEAR_MIN_VALUE = 0.4;
var MID_MIN_DB = -41;
var MID_MIN_VALUE = 0.15;
var MID_ALPHA = 799.503788;
var MID_BETA = 12630.61132;
var MID_GAMMA = 201.871345;
var MID_DELTA = 399.751894;
var LOW_ALPHA = 70;
var LOW_BETA = 118.426374;
var LOW_GAMMA = 7504 / 5567;
var song2 = new LiveAPI();
var volume = new LiveAPI();
function liveValue5(raw) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}
function parseTrackNumber(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) {
    return 0;
  }
  return n;
}
function liveToDb(value) {
  if (value <= 0) {
    return MIN_DB;
  }
  if (value >= LINEAR_MIN_VALUE) {
    return 40 * value - 34;
  }
  if (value >= MID_MIN_VALUE) {
    const x = MID_DELTA * value - MID_GAMMA;
    return -(x * x + MID_BETA) / MID_ALPHA;
  }
  return LOW_BETA * Math.pow(value, 1 / LOW_GAMMA) - LOW_ALPHA;
}
function dbToLive(db) {
  if (db >= MAX_DB) {
    return 1;
  }
  if (db >= LINEAR_MIN_DB) {
    return (db + 34) / 40;
  }
  if (db >= MID_MIN_DB) {
    return -(Math.sqrt(-MID_ALPHA * db - MID_BETA) - MID_GAMMA) / MID_DELTA;
  }
  if (db <= MIN_DB) {
    return 0;
  }
  return Math.pow((db + LOW_ALPHA) / LOW_BETA, LOW_GAMMA);
}
function bumpTrack(trackNumber, deltaDb) {
  const n = parseTrackNumber(trackNumber);
  if (n < 1) {
    return;
  }
  song2.path = "live_set";
  if (!song2.id || song2.id == 0) {
    return;
  }
  const count = song2.getcount("tracks");
  if (n > count) {
    return;
  }
  volume.path = "live_set tracks " + (n - 1) + " mixer_device volume";
  if (!volume.id || volume.id == 0) {
    return;
  }
  const current = Number(liveValue5(volume.get("value")));
  if (!Number.isFinite(current)) {
    return;
  }
  const min = Number(liveValue5(volume.get("min")));
  const max = Number(liveValue5(volume.get("max")));
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) ? max : 1;
  const next = dbToLive(liveToDb(current) + deltaDb);
  volume.set("value", Math.max(lo, Math.min(hi, next)));
}
function volup(trackNumber) {
  bumpTrack(trackNumber, STEP_DB);
}
function voldown(trackNumber) {
  bumpTrack(trackNumber, -STEP_DB);
}

// src/actions/rack.ts
var SCROLL_PAGES2 = 16;
var SCROLL_LEFT = 2;
var SCROLL_RIGHT2 = 3;
var appView2 = new LiveAPI();
var songView2 = new LiveAPI();
var song3 = new LiveAPI();
var track2 = new LiveAPI();
var device2 = new LiveAPI();
var parent2 = new LiveAPI();
var thisDev = new LiveAPI();
var param2 = new LiveAPI();
function liveValue6(raw) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}
function liveId2(raw) {
  const items = raw instanceof Array ? raw : raw == null || raw === "" ? [] : [raw];
  for (const item of items) {
    if (typeof item === "string" && item !== "" && Number.isNaN(Number(item))) {
      continue;
    }
    const n = Number(item);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return 0;
}
function currentChain2() {
  track2.path = "live_set view selected_track";
  if (!track2.id || track2.id == 0) {
    return null;
  }
  device2.path = track2.path + " view selected_device";
  if (device2.id && device2.id != 0) {
    const id = liveId2(device2.get("canonical_parent"));
    if (id) {
      parent2.id = id;
      if (parent2.type === "Chain") {
        return parent2;
      }
    }
  }
  return track2;
}
function selectChainEnd(which) {
  const chain = currentChain2();
  if (!chain) {
    return;
  }
  const n = chain.getcount("devices");
  if (n < 1) {
    return;
  }
  const index = which === 0 ? 0 : n - 1;
  device2.path = chain.path + " devices " + index;
  if (!device2.id || device2.id == 0) {
    return;
  }
  const id = device2.id;
  appView2.path = "live_app view";
  appView2.call("focus_view", "Detail/DeviceChain");
  songView2.path = "live_set view";
  songView2.call("select_device", "id", id);
  const dir = which === 0 ? SCROLL_LEFT : SCROLL_RIGHT2;
  for (let i = 0; i < SCROLL_PAGES2; i++) {
    appView2.call("scroll_view", dir, "Detail/DeviceChain", 0);
  }
  songView2.call("select_device", "id", id);
}
function setChainCollapsed(collapsed) {
  const chain = currentChain2();
  if (!chain) {
    return;
  }
  const n = chain.getcount("devices");
  for (let i = 0; i < n; i++) {
    device2.path = chain.path + " devices " + i + " view";
    if (!device2.id || device2.id == 0) {
      continue;
    }
    device2.set("is_collapsed", collapsed);
  }
}
function first() {
  selectChainEnd(0);
}
function last() {
  selectChainEnd(-1);
}
function selectedDeviceIndex(chain, selectedId) {
  const n = chain.getcount("devices");
  for (let i = 0; i < n; i++) {
    device2.path = chain.path + " devices " + i;
    if (device2.id == selectedId) {
      return i;
    }
  }
  return -1;
}
function moveSelected(delta) {
  const chain = currentChain2();
  if (!chain) {
    return;
  }
  const selectedId = device2.id && device2.id != 0 ? device2.id : 0;
  if (!selectedId) {
    return;
  }
  const n = chain.getcount("devices");
  const index = selectedDeviceIndex(chain, selectedId);
  if (index < 0) {
    return;
  }
  const drop = delta < 0 ? index - 1 : index + 2;
  if (drop < 0 || drop > n) {
    return;
  }
  song3.path = "live_set";
  if (!song3.id || song3.id == 0) {
    return;
  }
  song3.call("move_device", "id", selectedId, "id", chain.id, drop);
  songView2.path = "live_set view";
  songView2.call("select_device", "id", selectedId);
}
function chainLeft() {
  moveSelected(-1);
}
function chainRight() {
  moveSelected(1);
}
function setDeviceOn(path, on) {
  param2.path = path + " parameters 0";
  if (!param2.id || param2.id == 0) {
    return;
  }
  param2.set("value", on);
}
function applyChainEffects(onFor) {
  const chain = currentChain2();
  if (!chain) {
    return;
  }
  const selectedId = device2.id && device2.id != 0 ? device2.id : 0;
  thisDev.path = "this_device";
  const selfId = thisDev.id;
  const n = chain.getcount("devices");
  for (let i = 0; i < n; i++) {
    device2.path = chain.path + " devices " + i;
    if (!device2.id || device2.id == 0 || device2.id == selfId) {
      continue;
    }
    const kind = Number(liveValue6(device2.get("type")));
    if (kind != 2 && kind != 4) {
      continue;
    }
    setDeviceOn(device2.path, onFor(device2.id, selectedId));
  }
}
function col() {
  setChainCollapsed(1);
}
function exp() {
  setChainCollapsed(0);
}
function sol() {
  applyChainEffects((id, selectedId) => id == selectedId ? 1 : 0);
}
function unsol() {
  applyChainEffects(() => 1);
}

// src/live.ts
autowatch = 1;
inlets = 1;
outlets = 1;
function loadbang() {
  sendBinds();
}
function bang() {
  sendBinds();
}
function sendBinds() {
  outlet(0, JSON.stringify(BINDINGS));
}
void loadbang;
void bang;
void cliploop;
void loc;
void volup;
void voldown;
void chord;
void chord7;
void chord9;
void major;
void minor;
void sus2;
void sus4;
void aug;
void dim;
void pow;
void major7;
void minor7;
void dim7;
void aug7;
void major9;
void minor9;
void dim9;
void aug9;
void lead;
void up;
void down;
void doub;
void half;
void fit;
void inv;
void rev;
void first;
void last;
void chainLeft;
void chainRight;
void col;
void exp;
void sol;
void unsol;
void ana;
void colis;
void dri;
void drumr;
void elec;
void exti;
void imp;
void irack;
void meld;
void op;
void samp;
void simp;
void ten;
void wav;
void amp;
void arack;
void af;
void apan;
void ash;
void beat;
void cab;
void cheq;
void ens;
void comp;
void corp;
void del;
void drumb;
void tube;
void echo;
void eq8;
void low;
void high;
void notch;
void band;
void eq3;
void eros;
void exta;
void fdel;
void gate;
void glue;
void grain;
void hyb;
void lim;
void loop;
void mbd;
void od;
void ped;
void phas;
void red;
void reso;
void verb;
void roar;
void sat;
void shif;
void sres;
void stime;
void spec;
void tun;
void ut;
void vin;
void voc;
void arp;
void cc;
void chordmidi;
void mrack;
void nlen;
void pit;
void rand;
void sca;
void vel;
