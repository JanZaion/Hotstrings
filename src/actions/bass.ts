import type { LiveClip, NoteSpec } from '../sharedTypes';

const BASS_C1 = 36;
const BASS_VELOCITY = 100;
const SIXTEENTH = 0.25;

type BassHit = {
  offset: number;
  duration: number;
};

const BASS5_CYCLE = 2;
const BASS5_HITS: BassHit[] = [
  { offset: 0, duration: 0.5 },
  { offset: 0.5, duration: SIXTEENTH },
  { offset: 1.25, duration: 0.5 },
];

const BASS6_CYCLE = 2;
const BASS6_HITS: BassHit[] = [
  { offset: 0, duration: 0.75 },
  { offset: 0.75, duration: 0.75 },
  { offset: 1.5, duration: 0.5 },
];

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

function loopRange(clip: LiveClip) {
  const start = Number(liveValue(clip.get('loop_start')));
  const end = Number(liveValue(clip.get('loop_end')));
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return { start, end };
  }
  const length = Number(liveValue(clip.get('length')));
  if (Number.isFinite(length) && length > 0) {
    return { start: 0, end: length };
  }
  return null;
}

function bassPitch(clip: LiveClip) {
  const tonic = Number(liveValue(clip.get('root_note')));
  const tonicPc = Number.isFinite(tonic) ? ((tonic % 12) + 12) % 12 : 0;
  return BASS_C1 + tonicPc;
}

function pushHit(notes: NoteSpec[], pitch: number, start: number, duration: number, end: number) {
  if (start >= end) {
    return;
  }
  const noteDuration = Math.min(duration, end - start);
  if (noteDuration <= 0) {
    return;
  }
  notes.push({
    pitch,
    start_time: start,
    duration: noteDuration,
    velocity: BASS_VELOCITY,
  });
}

function writeBassNotes(clip: LiveClip, notes: NoteSpec[], range: { start: number; end: number }) {
  clip.call('remove_notes_extended', {
    from_pitch: 0,
    pitch_span: 128,
    from_time: range.start,
    time_span: range.end - range.start,
  });
  if (notes.length) {
    clip.call('add_new_notes', { notes });
  }
}

function writeBass(step: number, duration: number, firstOffset: number) {
  const clip = getDetailMidiClip();
  if (!clip) {
    return;
  }
  const range = loopRange(clip);
  if (!range) {
    return;
  }
  const pitch = bassPitch(clip);
  if (pitch < 0 || pitch > 127) {
    return;
  }
  const notes: NoteSpec[] = [];
  let t = range.start + firstOffset;
  while (t < range.end) {
    pushHit(notes, pitch, t, duration, range.end);
    t += step;
  }
  writeBassNotes(clip, notes, range);
}

function writeBassPattern(cycle: number, hits: BassHit[]) {
  const clip = getDetailMidiClip();
  if (!clip) {
    return;
  }
  const range = loopRange(clip);
  if (!range) {
    return;
  }
  const pitch = bassPitch(clip);
  if (pitch < 0 || pitch > 127) {
    return;
  }
  const notes: NoteSpec[] = [];
  for (let cycleStart = range.start; cycleStart < range.end; cycleStart += cycle) {
    for (const hit of hits) {
      pushHit(notes, pitch, cycleStart + hit.offset, hit.duration, range.end);
    }
  }
  writeBassNotes(clip, notes, range);
}

export function bass1() {
  writeBass(1, 1, 0);
}

export function bass2() {
  writeBass(0.5, 0.5, 0);
}

export function bass3() {
  writeBass(2 / 3, 2 / 3, 0);
}

export function bass4() {
  writeBass(0.5, SIXTEENTH, SIXTEENTH);
}

export function bass5() {
  writeBassPattern(BASS5_CYCLE, BASS5_HITS);
}

export function bass6() {
  writeBassPattern(BASS6_CYCLE, BASS6_HITS);
}
