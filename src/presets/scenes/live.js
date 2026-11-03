autowatch = 1;
inlets = 1;
outlets = 0;

function scene(n) {
  const s = new LiveAPI('live_set scenes ' + (n - 1));
  if (!s.id || s.id == 0) {
    return;
  }
  s.call('fire');
}
