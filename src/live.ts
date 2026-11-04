autowatch = 1;
inlets = 1;
outlets = 1;

type Bind = {
  key: string;
  bind: string;
  value?: number;
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
  call: (func: string, ...args: unknown[]) => unknown;
};

const live = new LiveAPI() as unknown as LiveClip;
const detailClip = new LiveAPI() as unknown as LiveClip;

function liveApi(path: string) {
  live.path = path;
  return live;
}

const BINDINGS: Bindings = {
  hotkeys: [
    { key: 'p', bind: 'play' },
    { key: 'o', bind: 'stop' },
  ],
  hotstrings: [
    { key: 'major', bind: 'major' },
    { key: 'major7', bind: 'major7' },
    { key: 'minor', bind: 'minor' },
    { key: 'minor7', bind: 'minor7' },
    { key: 'moremoremore', bind: 'moremoremore' },
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

const CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
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

function play() {
  liveApi('live_set').call('start_playing');
}

function stop() {
  liveApi('live_set').call('stop_playing');
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

function chordify(quality: keyof typeof CHORD_INTERVALS, stacks = 1) {
  const clip = getDetailMidiClip();
  if (!clip) {
    return;
  }
  const roots = selectedNotes(clip);
  if (roots.length === 0) {
    return;
  }
  const intervals = CHORD_INTERVALS[quality];
  const duration = gridStepBeats(clip);
  const ids: number[] = [];
  const notes: NoteSpec[] = [];
  for (const root of roots) {
    if (root.note_id !== undefined) {
      ids.push(root.note_id);
    }
    for (let oct = 0; oct < stacks; oct++) {
      const base = root.pitch + oct * 12;
      for (const interval of intervals) {
        pushTone(notes, root, base + interval, duration);
      }
    }
  }
  if (ids.length) {
    clip.call('remove_notes_by_id', ids);
  }
  clip.call('add_new_notes', { notes });
}

function major() {
  chordify('major');
}

function major7() {
  chordify('major7');
}

function minor() {
  chordify('minor');
}

function minor7() {
  chordify('minor7');
}

function moremoremore() {
  chordify('major', 3);
}

void loadbang;
void bang;
void play;
void stop;
void major;
void major7;
void minor;
void minor7;
void moremoremore;
