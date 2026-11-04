import {
  FIXED_CHORDS,
  GRID_BEATS,
  MAJOR_FAMILY,
  SCALE_ALIASES,
  SCALE_INTERVALS,
} from './constants';
import type { ClipScale, FixedQuality, LiveClip, MidiNote, NoteSpec } from './sharedTypes';

const live = new LiveAPI() as unknown as LiveClip;
const detailClip = new LiveAPI() as unknown as LiveClip;

function liveApi(path: string) {
  live.path = path;
  return live;
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

function normalizeScaleName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function scaleIntervalsForName(name: string) {
  const normalized = normalizeScaleName(name);
  return SCALE_INTERVALS[normalized] ?? SCALE_INTERVALS[SCALE_ALIASES[normalized] ?? ''];
}

function pitchClass(pitch: number) {
  return ((pitch % 12) + 12) % 12;
}

function pitchAbove(from: number, pc: number) {
  let pitch = from;
  while (pitchClass(pitch) !== pc) {
    pitch += 1;
  }
  return pitch;
}

function majorFamily(toneCount: number) {
  if (toneCount >= 5) {
    return MAJOR_FAMILY[5];
  }
  if (toneCount >= 4) {
    return MAJOR_FAMILY[4];
  }
  return MAJOR_FAMILY[3];
}

function diatonicPitches(
  rootPitch: number,
  tonicPc: number,
  scaleIntervals: readonly number[],
  toneCount: number
) {
  const fallback = majorFamily(toneCount);
  if (scaleIntervals.length < 2) {
    return fallback.map(interval => rootPitch + interval);
  }
  const pcs = scaleIntervals.map(interval => pitchClass(tonicPc + interval));
  const degree = pcs.indexOf(pitchClass(rootPitch));
  if (degree === -1) {
    return fallback.map(interval => rootPitch + interval);
  }
  const count = Math.max(1, Math.min(5, toneCount));
  const pitches: number[] = [];
  let prev = rootPitch;
  for (let i = 0; i < count; i++) {
    const pc = pcs[(degree + i * 2) % pcs.length];
    const pitch = i === 0 ? rootPitch : pitchAbove(prev + 1, pc);
    pitches.push(pitch);
    prev = pitch;
  }
  return pitches;
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

export function chord() {
  scaleChord(3);
}

export function chord7() {
  scaleChord(4);
}

export function chord9() {
  scaleChord(5);
}

export function major() {
  fixedChord('major');
}

export function minor() {
  fixedChord('minor');
}

export function sus2() {
  fixedChord('sus2');
}

export function sus4() {
  fixedChord('sus4');
}

export function aug() {
  fixedChord('aug');
}

export function dim() {
  fixedChord('dim');
}

export function pow() {
  fixedChord('pow');
}

export function major7() {
  fixedChord('major7');
}

export function minor7() {
  fixedChord('minor7');
}

export function dim7() {
  fixedChord('dim7');
}

export function aug7() {
  fixedChord('aug7');
}

export function major9() {
  fixedChord('major9');
}

export function minor9() {
  fixedChord('minor9');
}

export function dim9() {
  fixedChord('dim9');
}

export function aug9() {
  fixedChord('aug9');
}
