// src/arrangementView.ts
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
  hotkeys: [{ key: "`", bind: "cliploop", keys: "^j" }],
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
    { key: "loc", bind: "loc", str: true }
  ]
};

// src/chords.ts
var live = new LiveAPI();
var detailClip2 = new LiveAPI();
function liveApi(path) {
  live.path = path;
  return live;
}
function liveValue2(raw) {
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
  const songView2 = liveApi("live_set view");
  if (!songView2.id || songView2.id == 0) {
    return null;
  }
  if (songView2.call("is_view_visible", "Detail/Clip") != 1) {
    return null;
  }
  detailClip2.path = "live_set view detail_clip";
  if (!detailClip2.id || detailClip2.id == 0) {
    return null;
  }
  if (liveValue2(detailClip2.get("is_midi_clip")) != 1) {
    return null;
  }
  return detailClip2;
}
function gridStepBeats(clip) {
  const clipView = liveApi(clip.path + " view");
  if (!clipView.id || clipView.id == 0) {
    return 1;
  }
  const grid = Number(liveValue2(clipView.get("grid_quantization")));
  const beats = GRID_BEATS[grid] ?? 1;
  if (liveValue2(clipView.get("grid_is_triplet")) == 1) {
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
  const spec = {
    pitch,
    start_time: startTime === void 0 ? root.start_time : startTime,
    duration
  };
  if (root.velocity !== void 0) {
    spec.velocity = root.velocity;
  }
  if (root.mute !== void 0) {
    spec.mute = root.mute;
  }
  if (root.probability !== void 0) {
    spec.probability = root.probability;
  }
  if (root.velocity_deviation !== void 0) {
    spec.velocity_deviation = root.velocity_deviation;
  }
  if (root.release_velocity !== void 0) {
    spec.release_velocity = root.release_velocity;
  }
  return spec;
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
  const tonic = Number(liveValue2(clip.get("root_note")));
  const tonicPc = Number.isFinite(tonic) ? (tonic % 12 + 12) % 12 : 0;
  const intervals = liveInts(clip.get("scale_intervals")).filter((n) => n >= 0 && n < 12);
  if (intervals.length >= 2) {
    const scale = { tonicPc, intervals };
    return scale;
  }
  const named = scaleIntervalsForName(String(liveValue2(clip.get("scale_name")) ?? ""));
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

// src/rack.ts
var SCROLL_PAGES = 16;
var SCROLL_LEFT = 2;
var SCROLL_RIGHT = 3;
var appView = new LiveAPI();
var songView = new LiveAPI();
var track = new LiveAPI();
var device = new LiveAPI();
var parent = new LiveAPI();
var thisDev = new LiveAPI();
var param = new LiveAPI();
function liveValue3(raw) {
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
      if (parent.type === "Chain") {
        return parent;
      }
    }
  }
  return track;
}
function selectChainEnd(which) {
  const chain = currentChain();
  if (!chain) {
    return;
  }
  const n = chain.getcount("devices");
  if (n < 1) {
    return;
  }
  const index = which === 0 ? 0 : n - 1;
  device.path = chain.path + " devices " + index;
  if (!device.id || device.id == 0) {
    return;
  }
  const id = device.id;
  appView.path = "live_app view";
  appView.call("focus_view", "Detail/DeviceChain");
  songView.path = "live_set view";
  songView.call("select_device", "id", id);
  const dir = which === 0 ? SCROLL_LEFT : SCROLL_RIGHT;
  for (let i = 0; i < SCROLL_PAGES; i++) {
    appView.call("scroll_view", dir, "Detail/DeviceChain", 0);
  }
  songView.call("select_device", "id", id);
}
function setChainCollapsed(collapsed) {
  const chain = currentChain();
  if (!chain) {
    return;
  }
  const n = chain.getcount("devices");
  for (let i = 0; i < n; i++) {
    device.path = chain.path + " devices " + i + " view";
    if (!device.id || device.id == 0) {
      continue;
    }
    device.set("is_collapsed", collapsed);
  }
}
function first() {
  selectChainEnd(0);
}
function last() {
  selectChainEnd(-1);
}
function setDeviceOn(path, on) {
  param.path = path + " parameters 0";
  if (!param.id || param.id == 0) {
    return;
  }
  param.set("value", on);
}
function applyChainEffects(onFor) {
  const chain = currentChain();
  if (!chain) {
    return;
  }
  const selectedId = device.id && device.id != 0 ? device.id : 0;
  thisDev.path = "this_device";
  const selfId = thisDev.id;
  const n = chain.getcount("devices");
  for (let i = 0; i < n; i++) {
    device.path = chain.path + " devices " + i;
    if (!device.id || device.id == 0 || device.id == selfId) {
      continue;
    }
    const kind = Number(liveValue3(device.get("type")));
    if (kind != 2 && kind != 4) {
      continue;
    }
    setDeviceOn(device.path, onFor(device.id, selectedId));
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

// src/midiClip.ts
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
  const songView2 = liveApi2("live_set view");
  if (!songView2.id || songView2.id == 0) {
    return null;
  }
  if (songView2.call("is_view_visible", "Detail/Clip") != 1) {
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
void col;
void exp;
void sol;
void unsol;
