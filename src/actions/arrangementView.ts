import type { LiveClip } from '../sharedTypes';

const CUE_EPS = 0.01;
const DEFAULT_BARS = 4;
const BEATS_PER_QUARTER = 4;

const detailClip = new LiveAPI() as unknown as LiveClip;
const song = new LiveAPI() as unknown as LiveClip;
const cue = new LiveAPI() as unknown as LiveClip;
const track = new LiveAPI() as unknown as LiveClip;
const songView = new LiveAPI() as unknown as LiveClip;

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

function parseBars(raw: unknown) {
  if (raw == null || raw === '') {
    return DEFAULT_BARS;
  }
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_BARS;
  }
  return n;
}

function beatsPerBar() {
  const num = Number(liveValue(song.get('signature_numerator')));
  const den = Number(liveValue(song.get('signature_denominator')));
  const numerator = Number.isFinite(num) && num > 0 ? num : 4;
  const denominator = Number.isFinite(den) && den > 0 ? den : 4;
  return numerator * (BEATS_PER_QUARTER / denominator);
}

function getDetailClip() {
  detailClip.path = 'live_set view detail_clip';
  if (!detailClip.id || detailClip.id == 0) {
    return null;
  }
  return detailClip;
}

function findCueAt(time: number) {
  const n = song.getcount('cue_points');
  let bestIndex = -1;
  let bestDist = CUE_EPS;
  for (let i = 0; i < n; i++) {
    cue.path = 'live_set cue_points ' + i;
    const t = Number(liveValue(cue.get('time')));
    const d = Math.abs(t - time);
    if (d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) {
    return null;
  }
  cue.path = 'live_set cue_points ' + bestIndex;
  return cue;
}

export function cliploop() {
  const clip = getDetailClip();
  if (!clip) {
    return;
  }
  clip.set('looping', 1);
}

export function loc(name?: unknown) {
  song.path = 'live_set';
  if (!song.id || song.id == 0) {
    return;
  }
  const marker = Number(liveValue(song.get('start_time')));
  if (!Number.isFinite(marker)) {
    return;
  }
  const label = name == null || name === '' ? '' : String(name);
  const existing = findCueAt(marker);
  if (existing) {
    if (label) {
      existing.set('name', label);
    }
    return;
  }
  const playhead = Number(liveValue(song.get('current_song_time')));
  song.set('current_song_time', marker);
  song.call('set_or_delete_cue');
  if (Number.isFinite(playhead)) {
    song.set('current_song_time', playhead);
  }
  song.set('start_time', marker);
  if (!label) {
    return;
  }
  const created = findCueAt(marker);
  if (created) {
    created.set('name', label);
  }
}

export function clip(bars?: unknown) {
  song.path = 'live_set';
  if (!song.id || song.id == 0) {
    return;
  }
  track.path = 'live_set view selected_track';
  if (!track.id || track.id == 0) {
    return;
  }
  if (liveValue(track.get('has_midi_input')) != 1) {
    return;
  }
  if (liveValue(track.get('is_frozen')) == 1) {
    return;
  }
  const marker = Number(liveValue(song.get('start_time')));
  if (!Number.isFinite(marker) || marker < 0) {
    return;
  }
  const length = parseBars(bars) * beatsPerBar();
  if (!Number.isFinite(length) || length <= 0) {
    return;
  }
  const created = track.call('create_midi_clip', marker, length);
  const id = liveId(created);
  if (!id) {
    return;
  }
  songView.path = 'live_set view';
  if (!songView.id || songView.id == 0) {
    return;
  }
  songView.set('detail_clip', 'id', id);
}
