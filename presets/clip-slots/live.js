autowatch = 1;
inlets = 1;
outlets = 0;

function slot(n) {
    const track = new LiveAPI("live_set view selected_track");
    if (!track.id || track.id == 0) {
        return;
    }
    const clipSlot = new LiveAPI(track.path + " clip_slots " + (n - 1));
    if (!clipSlot.id || clipSlot.id == 0) {
        return;
    }
    clipSlot.call("fire");
}
