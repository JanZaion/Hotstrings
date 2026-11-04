import { diatonicPitches, FIXED_CHORDS, scaleIntervalsForName } from './theory';
import type { FixedQuality } from './theory';

autowatch = 1;
inlets = 1;
outlets = 1;

type Bind = {
  key: string;
  bind: string;
  value?: number;
  keys?: string;
};

type Bindings = {
  hotkeys: Bind[];
  hotstrings: Bind[];
};

type MidiNote = {
  note_id?: number;
  pitch: number;
  start_time: number;
  velocity?: number;
  mute?: number;
  probability?: number;
  velocity_deviation?: number;
  release_velocity?: number;
};

type NoteSpec = {
  pitch: number;
  start_time: number;
  duration: number;
  velocity?: number;
  mute?: number;
  probability?: number;
  velocity_deviation?: number;
  release_velocity?: number;
};

type LiveClip = {
  id: number;
  path: string;
  get: (property: string) => unknown;
  set: (property: string, value: unknown) => unknown;
  call: (func: string, ...args: unknown[]) => unknown;
};

type ClipScale = {
  tonicPc: number;
  intervals: readonly number[];
};

const live = new LiveAPI() as unknown as LiveClip;
const detailClip = new LiveAPI() as unknown as LiveClip;

function liveApi(path: string) {
  live.path = path;
  return live;
}

const BINDINGS: Bindings = {
  hotkeys: [{ key: '`', bind: 'cliploop', keys: '^j' }],
  hotstrings: [
    { key: 'chord', bind: 'chord' },
    { key: 'chord7', bind: 'chord7' },
    { key: 'chord9', bind: 'chord9' },
    ...Object.keys(FIXED_CHORDS).map(key => ({ key, bind: key })),
  ],
};

const GRID_BEATS: Record<number, number> = {
  0: 1,
  1: 32,
  2: 16,
  3: 8,
  4: 4,
  5: 2,
  6: 1,
  7: 0.5,
  8: 0.25,
  9: 0.125,
};

function loadbang() {
  sendBinds();
}

function bang() {
  sendBinds();
}

function sendBinds() {
  outlet(0, JSON.stringify(BINDINGS));
}

function getDetailClip() {
  detailClip.path = 'live_set view detail_clip';
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
  clip.set('looping', 1);
}

function liveValue(raw: unknown) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}

function liveInts(raw: unknown) {
  const items = raw instanceof Array ? raw : raw == null || raw === '' ? [] : [raw];
  const out: number[] = [];
  for (const item of items) {
    if (typeof item === 'string' && item !== '' && Number.isNaN(Number(item))) {
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
  const songView = liveApi('live_set view');
  if (!songView.id || songView.id == 0) {
    return null;
  }
  if (songView.call('is_view_visible', 'Detail/Clip') != 1) {
    return null;
  }
  detailClip.path = 'live_set view detail_clip';
  if (!detailClip.id || detailClip.id == 0) {
    return null;
  }
  if (liveValue(detailClip.get('is_midi_clip')) != 1) {
    return null;
  }
  return detailClip;
}

function gridStepBeats(clip: LiveClip) {
  const clipView = liveApi(clip.path + ' view');
  if (!clipView.id || clipView.id == 0) {
    return 1;
  }
  const grid = Number(liveValue(clipView.get('grid_quantization')));
  const beats = GRID_BEATS[grid] ?? 1;
  if (liveValue(clipView.get('grid_is_triplet')) == 1) {
    return beats * (2 / 3);
  }
  return beats;
}

function selectedNotes(clip: LiveClip) {
  const raw = clip.call('get_selected_notes_extended');
  if (!raw) {
    return [];
  }
  const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { notes?: MidiNote[] };
  return parsed && parsed.notes ? parsed.notes : [];
}

function noteSpecFromRoot(root: MidiNote, pitch: number, duration: number) {
  const spec: NoteSpec = {
    pitch,
    start_time: root.start_time,
    duration,
  };
  if (root.velocity !== undefined) {
    spec.velocity = root.velocity;
  }
  if (root.mute !== undefined) {
    spec.mute = root.mute;
  }
  if (root.probability !== undefined) {
    spec.probability = root.probability;
  }
  if (root.velocity_deviation !== undefined) {
    spec.velocity_deviation = root.velocity_deviation;
  }
  if (root.release_velocity !== undefined) {
    spec.release_velocity = root.release_velocity;
  }
  return spec;
}

function pushTone(notes: NoteSpec[], root: MidiNote, pitch: number, duration: number) {
  if (pitch < 0 || pitch > 127) {
    return;
  }
  notes.push(noteSpecFromRoot(root, pitch, duration));
}

function clipScale(clip: LiveClip) {
  const tonic = Number(liveValue(clip.get('root_note')));
  const tonicPc = Number.isFinite(tonic) ? ((tonic % 12) + 12) % 12 : 0;
  const intervals = liveInts(clip.get('scale_intervals')).filter(n => n >= 0 && n < 12);
  if (intervals.length >= 2) {
    const scale: ClipScale = { tonicPc, intervals };
    return scale;
  }
  const named = scaleIntervalsForName(String(liveValue(clip.get('scale_name')) ?? ''));
  if (named && named.length >= 2) {
    const scale: ClipScale = { tonicPc, intervals: named };
    return scale;
  }
  return null;
}

function rewriteSelected(pitchesFromRoot: (root: MidiNote, clip: LiveClip) => number[]) {
  const clip = getDetailMidiClip();
  if (!clip) {
    return;
  }
  const roots = selectedNotes(clip);
  if (roots.length === 0) {
    return;
  }
  const duration = gridStepBeats(clip);
  const ids: number[] = [];
  const notes: NoteSpec[] = [];
  for (const root of roots) {
    if (root.note_id !== undefined) {
      ids.push(root.note_id);
    }
    for (const pitch of pitchesFromRoot(root, clip)) {
      pushTone(notes, root, pitch, duration);
    }
  }
  if (ids.length) {
    clip.call('remove_notes_by_id', ids);
  }
  clip.call('add_new_notes', { notes });
}

function fixedChord(quality: FixedQuality) {
  const intervals = FIXED_CHORDS[quality];
  rewriteSelected(root => intervals.map(interval => root.pitch + interval));
}

function scaleChord(toneCount: number) {
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
  fixedChord('major');
}

function minor() {
  fixedChord('minor');
}

function sus2() {
  fixedChord('sus2');
}

function sus4() {
  fixedChord('sus4');
}

function aug() {
  fixedChord('aug');
}

function dim() {
  fixedChord('dim');
}

function pow() {
  fixedChord('pow');
}

function major7() {
  fixedChord('major7');
}

function minor7() {
  fixedChord('minor7');
}

function dim7() {
  fixedChord('dim7');
}

function aug7() {
  fixedChord('aug7');
}

function major9() {
  fixedChord('major9');
}

function minor9() {
  fixedChord('minor9');
}

function dim9() {
  fixedChord('dim9');
}

function aug9() {
  fixedChord('aug9');
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
