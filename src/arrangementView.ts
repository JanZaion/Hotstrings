import type { LiveClip } from './sharedTypes';

const CUE_EPS = 0.01;

const detailClip = new LiveAPI() as unknown as LiveClip;
const song = new LiveAPI() as unknown as LiveClip;
const cue = new LiveAPI() as unknown as LiveClip;

function liveValue(raw: unknown) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
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
