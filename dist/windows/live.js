// src/arrangementView.ts
var detailClip = new LiveAPI();
function getDetailClip() {
  detailClip.path = "live_set view detail_clip";
  if (!detailClip.id || detailClip.id == 0) {
    return null;
  }
  return detailClip;
}
function cliploop() {
  const clip = getDetailClip();
  if (!clip) {
    return;
  }
  clip.set("looping", 1);
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
    { key: "down", bind: "down" }
  ]
};

// src/chords.ts
var live = new LiveAPI();
var detailClip2 = new LiveAPI();
function liveApi(path) {
  live.path = path;
  return live;
}
function liveValue(raw) {
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
  const songView = liveApi("live_set view");
  if (!songView.id || songView.id == 0) {
    return null;
  }
  if (songView.call("is_view_visible", "Detail/Clip") != 1) {
    return null;
  }
  detailClip2.path = "live_set view detail_clip";
  if (!detailClip2.id || detailClip2.id == 0) {
    return null;
  }
  if (liveValue(detailClip2.get("is_midi_clip")) != 1) {
    return null;
  }
  return detailClip2;
}
function gridStepBeats(clip) {
  const clipView = liveApi(clip.path + " view");
  if (!clipView.id || clipView.id == 0) {
    return 1;
  }
  const grid = Number(liveValue(clipView.get("grid_quantization")));
  const beats = GRID_BEATS[grid] ?? 1;
  if (liveValue(clipView.get("grid_is_triplet")) == 1) {
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
  const tonic = Number(liveValue(clip.get("root_note")));
  const tonicPc = Number.isFinite(tonic) ? (tonic % 12 + 12) % 12 : 0;
  const intervals = liveInts(clip.get("scale_intervals")).filter((n) => n >= 0 && n < 12);
  if (intervals.length >= 2) {
    const scale = { tonicPc, intervals };
    return scale;
  }
  const named = scaleIntervalsForName(String(liveValue(clip.get("scale_name")) ?? ""));
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
    const last = groups[groups.length - 1];
    if (last && last[0].start_time === note.start_time) {
      last.push(note);
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
    for (let col = 0; col < columnCount; col++) {
      const remaining = span - used;
      const duration = col === columnCount - 1 ? remaining : Math.min(step, remaining);
      if (duration <= 0) {
        break;
      }
      const tone = ordered[col % ordered.length];
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
