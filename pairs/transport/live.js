autowatch = 1;
inlets = 1;
outlets = 0;

function play() {
    const song = new LiveAPI("live_set");
    song.call("start_playing");
}

function stop() {
    const song = new LiveAPI("live_set");
    song.call("stop_playing");
}
