import { SCALE_ALIASES, SCALE_INTERVALS } from '../constants';
import type { ClipScale, LiveClip, MidiNote } from '../sharedTypes';

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

function parseNotes(raw: unknown) {
  if (!raw) {
    return [];
  }
  const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { notes?: MidiNote[] };
  return parsed && parsed.notes ? parsed.notes : [];
}

function selectedNotes(clip: LiveClip) {
  return parseNotes(clip.call('get_selected_notes_extended'));
}

function applySelected(update: (notes: MidiNote[], clip: LiveClip) => MidiNote[]) {
  const clip = getDetailMidiClip();
  if (!clip) {
    return;
  }
  const selected = selectedNotes(clip);
  if (selected.length === 0) {
    return;
  }
  const notes = update(selected, clip);
  if (notes.length === 0) {
    return;
  }
  clip.call('apply_note_modifications', { notes });
}

function scaleDuration(notes: MidiNote[], factor: number) {
  const out: MidiNote[] = [];
  for (const note of notes) {
    if (note.note_id === undefined) {
      continue;
    }
    const duration = (note.duration ?? 0) * factor;
    if (duration <= 0) {
      continue;
    }
    const next: MidiNote = { ...note, duration };
    out.push(next);
  }
  return out;
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

function scalePitchClasses(scale: ClipScale) {
  const pcs: number[] = [];
  for (const interval of scale.intervals) {
    const pc = pitchClass(scale.tonicPc + interval);
    if (!pcs.includes(pc)) {
      pcs.push(pc);
    }
  }
  return pcs;
}

function nearestScalePitch(pitch: number, pcs: readonly number[]) {
  if (pcs.length === 0) {
    return pitch;
  }
  for (let dist = 0; dist <= 12; dist++) {
    const lower = pitch - dist;
    if (lower >= 0 && lower <= 127 && pcs.includes(pitchClass(lower))) {
      return lower;
    }
    const upper = pitch + dist;
    if (dist > 0 && upper >= 0 && upper <= 127 && pcs.includes(pitchClass(upper))) {
      return upper;
    }
  }
  return pitch;
}

function fitNotes(notes: MidiNote[], clip: LiveClip) {
  const scale = clipScale(clip);
  if (!scale) {
    return [];
  }
  const pcs = scalePitchClasses(scale);
  if (pcs.length === 0) {
    return [];
  }
  const out: MidiNote[] = [];
  for (const note of notes) {
    if (note.note_id === undefined) {
      continue;
    }
    const next: MidiNote = { ...note, pitch: nearestScalePitch(note.pitch, pcs) };
    out.push(next);
  }
  return out;
}

function invertChromatic(notes: MidiNote[]) {
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
  const out: MidiNote[] = [];
  for (const note of notes) {
    if (note.note_id === undefined) {
      continue;
    }
    const pitch = Math.max(0, Math.min(127, minPitch + maxPitch - note.pitch));
    const next: MidiNote = { ...note, pitch };
    out.push(next);
  }
  return out;
}

function scalePitches(pcs: readonly number[]) {
  const pitches: number[] = [];
  for (let pitch = 0; pitch <= 127; pitch++) {
    if (pcs.includes(pitchClass(pitch))) {
      pitches.push(pitch);
    }
  }
  return pitches;
}

function nearestScaleIndex(pitch: number, pitches: readonly number[]) {
  let best = 0;
  let bestDist = Infinity;
  for (let index = 0; index < pitches.length; index++) {
    const candidate = pitches[index];
    const dist = Math.abs(candidate - pitch);
    if (dist < bestDist || (dist === bestDist && candidate < pitches[best])) {
      bestDist = dist;
      best = index;
    }
  }
  return best;
}

function invertScale(notes: MidiNote[], scale: ClipScale) {
  const pitches = scalePitches(scalePitchClasses(scale));
  if (pitches.length === 0) {
    return invertChromatic(notes);
  }
  const indices: number[] = [];
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
  const out: MidiNote[] = [];
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (note.note_id === undefined) {
      continue;
    }
    const pitch = pitches[minIndex + maxIndex - indices[i]];
    if (pitch === undefined) {
      continue;
    }
    const next: MidiNote = { ...note, pitch };
    out.push(next);
  }
  return out;
}

function invertNotes(notes: MidiNote[], clip: LiveClip) {
  const scale = clipScale(clip);
  if (!scale) {
    return invertChromatic(notes);
  }
  return invertScale(notes, scale);
}

function reverseNotes(notes: MidiNote[]) {
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
  const out: MidiNote[] = [];
  for (const note of notes) {
    if (note.note_id === undefined) {
      continue;
    }
    const next: MidiNote = { ...note, start_time: minStart + maxStart - note.start_time };
    out.push(next);
  }
  return out;
}

export function doub() {
  applySelected(notes => scaleDuration(notes, 2));
}

export function half() {
  applySelected(notes => scaleDuration(notes, 0.5));
}

export function fit() {
  applySelected(fitNotes);
}

export function inv() {
  applySelected(invertNotes);
}

export function rev() {
  applySelected(reverseNotes);
}
