autowatch = 1;
inlets = 1;
outlets = 0;

const GRID_BEATS = {
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

function getDetailMidiClip() {
    const songView = new LiveAPI("live_set view");
    if (!songView.id || songView.id == 0) {
        return null;
    }
    if (songView.call("is_view_visible", "Detail/Clip") != 1) {
        return null;
    }
    const clip = new LiveAPI("live_set view detail_clip");
    if (!clip.id || clip.id == 0) {
        return null;
    }
    const isMidi = clip.get("is_midi_clip");
    if (isMidi instanceof Array ? isMidi[0] != 1 : isMidi != 1) {
        return null;
    }
    return clip;
}

function gridStepBeats(clip) {
    const clipView = new LiveAPI(clip.path + " view");
    if (!clipView.id || clipView.id == 0) {
        return 1;
    }
    const gridRaw = clipView.get("grid_quantization");
    const grid = Number(gridRaw instanceof Array ? gridRaw[0] : gridRaw);
    let beats = GRID_BEATS[grid];
    if (beats === undefined) {
        beats = 1;
    }
    const tripletRaw = clipView.get("grid_is_triplet");
    const triplet = tripletRaw instanceof Array ? tripletRaw[0] : tripletRaw;
    if (triplet == 1) {
        beats *= 2 / 3;
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
        pitch: pitch,
        start_time: root.start_time,
        duration: duration,
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

function pushTone(notes, root, pitch, duration) {
    if (pitch < 0 || pitch > 127) {
        return;
    }
    notes.push(noteSpecFromRoot(root, pitch, duration));
}

function chordify(quality) {
    const clip = getDetailMidiClip();
    if (!clip) {
        return;
    }
    const roots = selectedNotes(clip);
    if (roots.length === 0) {
        return;
    }
    const thirdOffset = quality === "major" ? 4 : 3;
    const duration = gridStepBeats(clip);
    const ids = [];
    const triad = [];
    for (let i = 0; i < roots.length; i++) {
        const root = roots[i];
        if (root.note_id !== undefined) {
            ids.push(root.note_id);
        }
        pushTone(triad, root, root.pitch, duration);
        pushTone(triad, root, root.pitch + thirdOffset, duration);
        pushTone(triad, root, root.pitch + 7, duration);
    }
    if (ids.length) {
        clip.call("remove_notes_by_id", ids);
    }
    clip.call("add_new_notes", { notes: triad });
}

function major() {
    chordify("major");
}

function minor() {
    chordify("minor");
}
