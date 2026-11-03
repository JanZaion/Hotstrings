autowatch = 1;
inlets = 1;
outlets = 0;

function mute() {
  toggle('mute');
}

function solo() {
  toggle('solo');
}

function arm() {
  toggle('arm');
}

function toggle(prop) {
  const track = new LiveAPI('live_set view selected_track');
  if (!track.id || track.id == 0) {
    return;
  }
  const v = track.get(prop);
  const cur = v instanceof Array ? v[0] : v;
  track.set(prop, cur == 1 ? 0 : 1);
}
