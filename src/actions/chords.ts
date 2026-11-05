import {
  FIXED_CHORDS,
  GRID_BEATS,
  MAJOR_FAMILY,
  SCALE_ALIASES,
  SCALE_INTERVALS,
} from '../constants';
import type { ClipScale, FixedQuality, LiveClip, MidiNote, NoteSpec } from '../sharedTypes';

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

function noteSpecFromRoot(root: MidiNote, pitch: number, duration: number, startTime?: number) {
  const spec: NoteSpec = {
    pitch,
    start_time: startTime === undefined ? root.start_time : startTime,
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

function pushTone(
  notes: NoteSpec[],
  root: MidiNote,
  pitch: number,
  duration: number,
  startTime?: number
) {
  if (pitch < 0 || pitch > 127) {
    return;
  }
  notes.push(noteSpecFromRoot(root, pitch, duration, startTime));
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

function groupSelectedByStartTime(notes: MidiNote[]) {
  const sorted = notes.slice().sort((a, b) => a.start_time - b.start_time || a.pitch - b.pitch);
  const groups: MidiNote[][] = [];
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

function selectedNoteIds(notes: MidiNote[]) {
  const ids: number[] = [];
  for (const note of notes) {
    if (note.note_id !== undefined) {
      ids.push(note.note_id);
    }
  }
  return ids;
}

function replaceSelectedNotes(clip: LiveClip, selected: MidiNote[], notes: NoteSpec[]) {
  const ids = selectedNoteIds(selected);
  if (ids.length) {
    clip.call('remove_notes_by_id', ids);
  }
  if (notes.length) {
    clip.call('add_new_notes', { notes });
  }
}

function nearestPitchInterval(pitch: number, otherPitches: readonly number[]) {
  let nearest = Infinity;
  for (const other of otherPitches) {
    const interval = Math.abs(pitch - other);
    if (interval < nearest) {
      nearest = interval;
    }
  }
  return nearest;
}

function solarCandidatePitch(pitch: number, referencePitches: readonly number[]) {
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

function voiceLeadGroups(groups: MidiNote[][]) {
  const firstPitches: number[] = [];
  for (const note of groups[0]) {
    firstPitches.push(note.pitch);
  }
  const notes: NoteSpec[] = [];
  for (let index = 0; index < groups.length; index++) {
    for (const note of groups[index]) {
      const pitch = index === 0 ? note.pitch : solarCandidatePitch(note.pitch, firstPitches);
      pushTone(notes, note, pitch, note.duration ?? 0);
    }
  }
  return notes;
}

function groupSpanBeats(group: MidiNote[]) {
  let span = 0;
  for (const note of group) {
    if (note.duration !== undefined && note.duration > span) {
      span = note.duration;
    }
  }
  return span;
}

function arpeggiateGroups(groups: MidiNote[][], direction: 'up' | 'down', stepBeats: number) {
  const notes: NoteSpec[] = [];
  const step = stepBeats > 0 ? stepBeats : 1;
  for (const group of groups) {
    if (group.length === 0) {
      continue;
    }
    const span = groupSpanBeats(group);
    if (span <= 0) {
      continue;
    }
    const ordered = direction === 'down' ? group.slice().reverse() : group;
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

export function lead() {
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

function arpeggiateSelected(direction: 'up' | 'down') {
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

export function up() {
  arpeggiateSelected('up');
}

export function down() {
  arpeggiateSelected('down');
}
