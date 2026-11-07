import type { LiveClip, MidiNote } from '../sharedTypes';

const song = new LiveAPI() as unknown as LiveClip;
const detailClip = new LiveAPI() as unknown as LiveClip;
const songView = new LiveAPI() as unknown as LiveClip;

function liveValue(raw: unknown) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}

function parseNotes(raw: unknown) {
  if (!raw) {
    return [];
  }
  const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { notes?: MidiNote[] };
  return parsed && parsed.notes ? parsed.notes : [];
}

function earliestNote(notes: MidiNote[]) {
  let start = notes[0].start_time;
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].start_time < start) {
      start = notes[i].start_time;
    }
  }
  return start;
}

function clipSongTime(clip: LiveClip, clipTime: number) {
  const clipStart = Number(liveValue(clip.get('start_time')));
  if (!Number.isFinite(clipStart) || clipStart < 0) {
    return null;
  }
  const startMarker = Number(liveValue(clip.get('start_marker')));
  const marker = Number.isFinite(startMarker) ? startMarker : 0;
  return clipStart + clipTime - marker;
}

function getDetailMidiClip() {
  songView.path = 'live_set view';
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

function songTime() {
  const clip = getDetailMidiClip();
  if (clip) {
    const notes = parseNotes(clip.call('get_selected_notes_extended'));
    if (notes.length > 0) {
      const time = clipSongTime(clip, earliestNote(notes));
      if (time !== null) {
        return time;
      }
    } else {
      const clipStart = Number(liveValue(clip.get('start_time')));
      if (Number.isFinite(clipStart) && clipStart >= 0) {
        return clipStart;
      }
    }
  }
  const start = Number(liveValue(song.get('start_time')));
  return Number.isFinite(start) ? start : null;
}

export function playFrom() {
  song.path = 'live_set';
  if (!song.id || song.id == 0) {
    return;
  }
  const start = songTime();
  if (start !== null) {
    song.set('start_time', start);
  }
  if (liveValue(song.get('is_playing')) == 1) {
    song.call('stop_playing');
    return;
  }
  song.call('start_playing');
}
