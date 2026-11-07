import type { LiveClip } from '../sharedTypes';

const STEP_DB = 3;
const MAX_DB = 6;
const MIN_DB = -70;
const LINEAR_MIN_DB = -18;
const LINEAR_MIN_VALUE = 0.4;
const MID_MIN_DB = -41;
const MID_MIN_VALUE = 0.15;
const MID_ALPHA = 799.503788;
const MID_BETA = 12630.61132;
const MID_GAMMA = 201.871345;
const MID_DELTA = 399.751894;
const LOW_ALPHA = 70;
const LOW_BETA = 118.426374;
const LOW_GAMMA = 7504 / 5567;

const song = new LiveAPI() as unknown as LiveClip;
const track = new LiveAPI() as unknown as LiveClip;
const volume = new LiveAPI() as unknown as LiveClip;

function liveValue(raw: unknown) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}

function parseTrackNumber(raw: unknown) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) {
    return 0;
  }
  return n;
}

function liveToDb(value: number) {
  if (value <= 0) {
    return MIN_DB;
  }
  if (value >= LINEAR_MIN_VALUE) {
    return 40 * value - 34;
  }
  if (value >= MID_MIN_VALUE) {
    const x = MID_DELTA * value - MID_GAMMA;
    return -(x * x + MID_BETA) / MID_ALPHA;
  }
  return LOW_BETA * Math.pow(value, 1 / LOW_GAMMA) - LOW_ALPHA;
}

function dbToLive(db: number) {
  if (db >= MAX_DB) {
    return 1;
  }
  if (db >= LINEAR_MIN_DB) {
    return (db + 34) / 40;
  }
  if (db >= MID_MIN_DB) {
    return -(Math.sqrt(-MID_ALPHA * db - MID_BETA) - MID_GAMMA) / MID_DELTA;
  }
  if (db <= MIN_DB) {
    return 0;
  }
  return Math.pow((db + LOW_ALPHA) / LOW_BETA, LOW_GAMMA);
}

function bumpVolume(path: string, deltaDb: number) {
  volume.path = path;
  if (!volume.id || volume.id == 0) {
    return;
  }
  const current = Number(liveValue(volume.get('value')));
  if (!Number.isFinite(current)) {
    return;
  }
  const min = Number(liveValue(volume.get('min')));
  const max = Number(liveValue(volume.get('max')));
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) ? max : 1;
  const next = dbToLive(liveToDb(current) + deltaDb);
  volume.set('value', Math.max(lo, Math.min(hi, next)));
}

function bumpTrack(trackNumber: unknown, deltaDb: number) {
  const n = parseTrackNumber(trackNumber);
  if (n < 1) {
    return;
  }
  song.path = 'live_set';
  if (!song.id || song.id == 0) {
    return;
  }
  const count = song.getcount('tracks');
  if (n > count) {
    return;
  }
  bumpVolume('live_set tracks ' + (n - 1) + ' mixer_device volume', deltaDb);
}

export function volup(trackNumber: unknown) {
  bumpTrack(trackNumber, STEP_DB);
}

export function voldown(trackNumber: unknown) {
  bumpTrack(trackNumber, -STEP_DB);
}

function bumpRegularTracks(deltaDb: number) {
  song.path = 'live_set';
  if (!song.id || song.id == 0) {
    return;
  }
  const count = song.getcount('tracks');
  for (let i = 0; i < count; i++) {
    track.path = 'live_set tracks ' + i;
    if (!track.id || track.id == 0) {
      continue;
    }
    if (liveValue(track.get('is_foldable')) == 1) {
      continue;
    }
    bumpVolume(track.path + ' mixer_device volume', deltaDb);
  }
}

export function headroom() {
  bumpRegularTracks(-STEP_DB);
}

export function heat() {
  bumpRegularTracks(STEP_DB);
}
