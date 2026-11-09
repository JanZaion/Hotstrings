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
  aug9: [0, 4, 8, 10, 14],
  major11: [0, 4, 7, 11, 14, 17],
  minor11: [0, 3, 7, 10, 14, 17],
  major13: [0, 4, 7, 11, 14, 17, 21],
  minor13: [0, 3, 7, 10, 14, 17, 21]
};
var MAJOR_FAMILY = {
  3: FIXED_CHORDS.major,
  4: FIXED_CHORDS.major7,
  5: FIXED_CHORDS.major9,
  6: FIXED_CHORDS.major11,
  7: FIXED_CHORDS.major13
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

// src/bindings.ts
var BINDINGS = {
  hotkeys: [
    { key: "`", bind: "cliploop", keys: "^j" },
    { key: "^Space", bind: "playFrom" },
    { key: "^!Left", bind: "chainLeft" },
    { key: "^!Right", bind: "chainRight" }
  ],
  hotstrings: [
    { key: "chord", bind: "chord" },
    { key: "chord7", bind: "chord7" },
    { key: "chord9", bind: "chord9" },
    { key: "chord11", bind: "chord11" },
    { key: "chord13", bind: "chord13" },
    { key: "bass1", bind: "bass1" },
    { key: "bass2", bind: "bass2" },
    { key: "bass3", bind: "bass3" },
    { key: "bass4", bind: "bass4" },
    { key: "bass5", bind: "bass5" },
    { key: "bass6", bind: "bass6" },
    ...Object.keys(FIXED_CHORDS).map((key) => ({ key, bind: key })),
    { key: "lead", bind: "lead" },
    { key: "up", bind: "up" },
    { key: "down", bind: "down" },
    { key: "dearp", bind: "dearp" },
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
    { key: "clip", bind: "clip", int: true },
    { key: "=", bind: "volup", int: true },
    { key: "-", bind: "voldown", int: true },
    { key: "headroom", bind: "headroom" },
    { key: "heat", bind: "heat" },
    { key: "low", bind: "low" },
    { key: "high", bind: "high" },
    { key: "notch", bind: "notch" },
    { key: "band", bind: "band" },
    { key: "eq", bind: "eq8" },
    ...Object.keys(NATIVE_DEVICES).map((key) => ({ key, bind: key }))
  ]
};

// src/hotstringCatalog.ts
var HOTKEY_DESC = {
  "`": "Loop the open clip",
  "^Space": "Play or stop from the start marker",
  "^!Left": "Nudge the selected device left",
  "^!Right": "Nudge the selected device right"
};
var HOTSTRING_DESC = {
  chord: "Diatonic triad from the clip scale",
  chord7: "Diatonic 7th from the clip scale",
  chord9: "Diatonic 9th from the clip scale",
  chord11: "Diatonic 11th from the clip scale",
  chord13: "Diatonic 13th from the clip scale",
  bass1: "Bass on each beat",
  bass2: "Eighth-note bass",
  bass3: "Triplet bass",
  bass4: "Offbeat 16th bass",
  bass5: "Syncopated bass pattern",
  bass6: "Second syncopated bass pattern",
  lead: "Voice-lead selected chords",
  up: "Arpeggiate selection up",
  down: "Arpeggiate selection down",
  dearp: "Collapse an arp into block chords",
  doub: "Double selected note lengths",
  half: "Halve selected note lengths",
  fit: "Fit selected notes to the clip",
  inv: "Invert selected notes",
  rev: "Reverse selected notes",
  first: "Select the first chain",
  last: "Select the last chain",
  col: "Collapse devices in the chain",
  exp: "Expand devices in the chain",
  sol: "Solo the selected effect",
  unsol: "Unsolo chain effects",
  loc: "Drop a locator, loc name to label it",
  clip: "New MIDI clip, clip n for n bars",
  "=": "Raise track volume, = n for track n",
  "-": "Lower track volume, - n for track n",
  headroom: "Drop volume on all regular tracks",
  heat: "Raise volume on all regular tracks",
  low: "EQ Eight lowpass",
  high: "EQ Eight highpass",
  notch: "EQ Eight notch",
  band: "EQ Eight bandpass",
  eq: "EQ Eight"
};
var INSTRUMENT_KEYS = [
  "ana",
  "colis",
  "dri",
  "drumr",
  "elec",
  "exti",
  "imp",
  "irack",
  "meld",
  "op",
  "samp",
  "simp",
  "ten",
  "wav"
];
var MIDI_KEYS = ["arp", "cc", "chordmidi", "mrack", "nlen", "pit", "rand", "sca", "vel"];
var CHORD_KEYS = [
  "chord",
  "chord7",
  "chord9",
  "chord11",
  "chord13",
  ...Object.keys(FIXED_CHORDS),
  "lead",
  "up",
  "down",
  "dearp"
];
var BASS_KEYS = ["bass1", "bass2", "bass3", "bass4", "bass5", "bass6"];
var CLIP_KEYS = ["doub", "half", "fit", "inv", "rev"];
var RACK_KEYS = ["first", "last", "col", "exp", "sol", "unsol"];
var MIXER_KEYS = ["=", "-", "headroom", "heat"];
var ARRANGE_KEYS = ["loc", "clip"];
var EQ_KEYS = ["eq", "low", "high", "notch", "band"];
function displayHotkey(key) {
  return key.replaceAll("^", "Ctrl+").replaceAll("!", "Alt+").replaceAll("#", "Win+");
}
function itemDesc(key, bind) {
  if (HOTSTRING_DESC[key]) {
    return HOTSTRING_DESC[key];
  }
  if (key in NATIVE_DEVICES) {
    return NATIVE_DEVICES[key];
  }
  if (bind in NATIVE_DEVICES) {
    return NATIVE_DEVICES[bind];
  }
  return bind;
}
function itemsFor(keys) {
  const byKey = new Map(BINDINGS.hotstrings.map((bind) => [bind.key, bind]));
  const items = [];
  for (const key of keys) {
    const bind = byKey.get(key);
    if (!bind) {
      continue;
    }
    items.push({ key, desc: itemDesc(key, bind.bind) });
  }
  return items;
}
function hotstringSections() {
  const used = /* @__PURE__ */ new Set();
  const sections = [];
  function add(title, items) {
    if (items.length === 0) {
      return;
    }
    sections.push({ title, items });
    for (const item of items) {
      used.add(item.key);
    }
  }
  add(
    "Hotkeys",
    BINDINGS.hotkeys.map((bind) => ({
      key: displayHotkey(bind.key),
      desc: HOTKEY_DESC[bind.key] ?? bind.bind
    }))
  );
  add("Chords", itemsFor(CHORD_KEYS));
  add("Bass", itemsFor(BASS_KEYS));
  add("Clip", itemsFor(CLIP_KEYS));
  add("Arrangement", itemsFor(ARRANGE_KEYS));
  add("Mixer", itemsFor(MIXER_KEYS));
  add("Rack", itemsFor(RACK_KEYS));
  add("EQ", itemsFor(EQ_KEYS));
  add("Instruments", itemsFor(INSTRUMENT_KEYS));
  const midi = new Set(MIDI_KEYS);
  const instruments = new Set(INSTRUMENT_KEYS);
  add(
    "Audio effects",
    itemsFor(Object.keys(NATIVE_DEVICES).filter((key) => !instruments.has(key) && !midi.has(key)))
  );
  add("MIDI effects", itemsFor(MIDI_KEYS));
  const leftover = BINDINGS.hotstrings.filter((bind) => !used.has(bind.key)).map((bind) => ({ key: bind.key, desc: itemDesc(bind.key, bind.bind) }));
  add("Other", leftover);
  return sections;
}

// src/jsui/hotstrings.ts
autowatch = 1;
inlets = 1;
outlets = 0;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;
var BG = [0.09, 0.088, 0.085];
var INK = [0.93, 0.91, 0.86];
var MUTED = [0.56, 0.54, 0.5];
var AMBER = [0.86, 0.52, 0.16];
var CAP_TOP = [0.27, 0.262, 0.248];
var CAP_BOTTOM = [0.2, 0.195, 0.186];
var SKIRT = [0.045, 0.043, 0.041];
var PRESSED_TOP = [0.97, 0.64, 0.27];
var PRESSED_BOTTOM = [0.84, 0.49, 0.14];
var PRESSED_INK = [0.13, 0.09, 0.05];
var TOP = 68;
var PAD_X = 16;
var GROUP_H = 36;
var ITEM_H = 28;
var LIST_PAD_BOTTOM = 18;
var CAP_H = 18;
var CAP_DEPTH = 3;
var CAP_R = 4;
var CAP_PAD = 7;
var CAP_MIN_W = 22;
var CAP_FONT = 10;
var PLUS_W = 13;
var DESC_GAP = 16;
var FADE_TOP = 16;
var FADE_BOTTOM = 22;
var SB_W = 5;
var SB_PAD = 5;
var rows = buildRows();
var contentH = rows.reduce((sum, row) => sum + row.h, 0) + LIST_PAD_BOTTOM;
var itemCount = rows.reduce((n, row) => n + (row.kind === "item" ? 1 : 0), 0);
var scrollY = 0;
var dragOrigin = 0;
var dragScroll = 0;
var draggingList = false;
var draggingThumb = false;
var hoverRow = -1;
var mouseX = -1;
var mouseY = -1;
var keyColW = 0;
function buildRows() {
  const out = [];
  for (const section of hotstringSections()) {
    out.push({ kind: "group", title: section.title, count: section.items.length, h: GROUP_H });
    const combos = section.title === "Hotkeys";
    for (const item of section.items) {
      out.push({
        kind: "item",
        caps: combos ? item.key.split("+") : [item.key],
        desc: item.desc,
        h: ITEM_H
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
function setScroll(next) {
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
  const thumbY = y + (maxScroll() === 0 ? 0 : scrollY / maxScroll() * travel);
  return { x, y, body, thumbH, thumbY, travel };
}
function fill(rgb, a = 1) {
  mgraphics.set_source_rgba(rgb[0], rgb[1], rgb[2], a);
}
function font(size, bold) {
  mgraphics.select_font_face(bold ? "Arial Bold" : "Arial");
  mgraphics.set_font_size(size);
}
function textAt(x, y, size, bold, rgb, text) {
  font(size, bold);
  fill(rgb);
  mgraphics.move_to(x, y);
  mgraphics.show_text(text);
}
function trackedText(x, y, size, rgb, text, tracking) {
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
function ellipsize(text, maxW) {
  if (mgraphics.text_measure(text)[0] <= maxW) {
    return text;
  }
  let s = text;
  while (s.length > 1 && mgraphics.text_measure(`${s}\u2026`)[0] > maxW) {
    s = s.slice(0, -1);
  }
  return `${s}\u2026`;
}
function verticalGradient(y0, y1, top, bottom, a0 = 1, a1 = 1) {
  const g = mgraphics.pattern_create_linear(0, y0, 0, y1);
  g.add_color_stop_rgba(0, top[0], top[1], top[2], a0);
  g.add_color_stop_rgba(1, bottom[0], bottom[1], bottom[2], a1);
  mgraphics.set_source(g);
}
function capWidth(label) {
  font(CAP_FONT, true);
  return Math.max(CAP_MIN_W, Math.ceil(mgraphics.text_measure(label)[0]) + CAP_PAD * 2);
}
function comboWidth(caps) {
  return caps.reduce((sum, cap) => sum + capWidth(cap), 0) + (caps.length - 1) * PLUS_W;
}
function capBaseline(capY) {
  return capY + (CAP_H + CAP_FONT * 0.72) / 2;
}
function drawKeycap(x, y, label, pressed) {
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
function drawKeyCombo(x, y, caps, pressed) {
  let cx = x;
  caps.forEach((cap, i) => {
    if (i > 0) {
      font(CAP_FONT, true);
      const pw = mgraphics.text_measure("+")[0];
      textAt(cx + (PLUS_W - pw) / 2, capBaseline(y), CAP_FONT, true, MUTED, "+");
      cx += PLUS_W;
    }
    cx += drawKeycap(cx, y, cap, pressed);
  });
}
function measureKeyColumn() {
  let max = 0;
  for (const row of rows) {
    if (row.kind === "item") {
      max = Math.max(max, comboWidth(row.caps));
    }
  }
  keyColW = max;
}
function contentRight() {
  return viewW() - SB_PAD * 2 - SB_W - 4;
}
function drawGroup(y, row) {
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
function drawItem(y, row, hovered) {
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
  trackedText(PAD_X, 22, 8, AMBER, "KEYBOARD WARRIOR", 2);
  textAt(PAD_X, 46, 20, true, INK, "Hotstrings");
  const label = String(itemCount);
  const badgeW = capWidth(label);
  const badgeX = contentRight() - badgeW;
  const badgeY = 31;
  drawKeycap(badgeX, badgeY, label, false);
  font(9, false);
  const caption = "commands";
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
      if (row.kind === "group") {
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
function inScrollbar(x) {
  return x >= viewW() - SB_PAD - SB_W - 4;
}
function rowAt(y) {
  if (y < TOP) {
    return -1;
  }
  let top = TOP - scrollY;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (y >= top && y < top + row.h) {
      return row.kind === "item" ? i : -1;
    }
    top += row.h;
  }
  return -1;
}
function updateHover() {
  const next = draggingList || draggingThumb || mouseX < 0 || inScrollbar(mouseX) ? -1 : rowAt(mouseY);
  if (next === hoverRow) {
    return false;
  }
  hoverRow = next;
  return true;
}
function scrollFromThumb(y) {
  const sb = sbGeom();
  const t = (y - sb.y - sb.thumbH / 2) / Math.max(1, sb.travel);
  setScroll(t * maxScroll());
}
function onclick(x, y) {
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
function ondrag(x, y, button) {
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
function onidle(x, y) {
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
function onwheel(x, y, _scrollx, scrolly, _mod1, shift) {
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
