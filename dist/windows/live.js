// src/live.ts
autowatch = 1;
inlets = 1;
outlets = 1;
function liveApi(path) {
  return new LiveAPI(path);
}
var BINDINGS = {
  hotkeys: [
    { key: "p", bind: "play" },
    { key: "o", bind: "stop" }
  ],
  hotstrings: [
    { key: "major", bind: "major" },
    { key: "major7", bind: "major7" },
    { key: "minor", bind: "minor" },
    { key: "minor7", bind: "minor7" },
    { key: "moremoremore", bind: "moremoremore" }
  ]
};
var GRID_BEATS = {
  0: 1,
  1: 32,
  2: 16,
  3: 8,
  4: 4,
  5: 2,
  6: 1,
  7: 0.5,
  8: 0.25,
  9: 0.125
};
var CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10]
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
  liveApi("live_set").call("start_playing");
}
function stop() {
  liveApi("live_set").call("stop_playing");
}
function liveValue(raw) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}
function getDetailMidiClip() {
  const songView = liveApi("live_set view");
  if (!songView.id || songView.id == 0) {
    return null;
  }
  if (songView.call("is_view_visible", "Detail/Clip") != 1) {
    return null;
  }
  const clip = liveApi("live_set view detail_clip");
  if (!clip.id || clip.id == 0) {
    return null;
  }
  if (liveValue(clip.get("is_midi_clip")) != 1) {
    return null;
  }
  return clip;
}
function gridStepBeats(clip) {
  const clipView = liveApi(clip.path + " view");
  if (!clipView.id || clipView.id == 0) {
    return 1;
  }
  const grid = Number(liveValue(clipView.get("grid_quantization")));
  const beats = GRID_BEATS[grid] ?? 1;
  if (liveValue(clipView.get("grid_is_triplet")) == 1) {
    return beats * (2 / 3);
  }
  return beats;
}
function selectedNotes(clip) {
  const raw = clip.call("get_selected_notes_extended");
  if (!raw) {
    return [];
  }
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return parsed && parsed.notes ? parsed.notes : [];
}
function noteSpecFromRoot(root, pitch, duration) {
  const spec = {
    pitch,
    start_time: root.start_time,
    duration
  };
  if (root.velocity !== void 0) {
    spec.velocity = root.velocity;
  }
  if (root.mute !== void 0) {
    spec.mute = root.mute;
  }
  if (root.probability !== void 0) {
    spec.probability = root.probability;
  }
  if (root.velocity_deviation !== void 0) {
    spec.velocity_deviation = root.velocity_deviation;
  }
  if (root.release_velocity !== void 0) {
    spec.release_velocity = root.release_velocity;
  }
  return spec;
}
function pushTone(notes, root, pitch, duration) {
  if (pitch < 0 || pitch > 127) {
    return;
  }
  notes.push(noteSpecFromRoot(root, pitch, duration));
}
function chordify(quality, stacks = 1) {
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
  const ids = [];
  const notes = [];
  for (const root of roots) {
    if (root.note_id !== void 0) {
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
    clip.call("remove_notes_by_id", ids);
  }
  clip.call("add_new_notes", { notes });
}
function major() {
  chordify("major");
}
function major7() {
  chordify("major7");
}
function minor() {
  chordify("minor");
}
function minor7() {
  chordify("minor7");
}
function moremoremore() {
  chordify("major", 3);
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
