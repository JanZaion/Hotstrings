autowatch = 1;
inlets = 1;
outlets = 2;

// [v8 host.js]
// Outlet 0 -> pair [v8]: compile <live.js>
// Outlet 1 -> [umenu]: clear / append <name>
//
// Keep host.js, engine.ahk, and pairs/ next to the .amxd.
// loadbang in this file scans ./pairs (no hardcoded path in the patch).
// Optional override: v8 host.js <pairs-folder>
// [umenu] -> prepend load -> this v8
// [live.toggle] -> prepend suspend -> this v8   (1 pause, 0 resume)
// closebang -> quit

let enginePath = "";
let pairsDir = "";
let pairs = [];

function loadbang() {
    scan();
}

function scan(path) {
    const dir = path ? String(path) : defaultPairsDir();
    if (!dir) {
        post("host: cannot find the pairs folder. Put pairs/ next to the device.\n");
        return;
    }
    pairsDir = dir;
    enginePath = joinPath(parentDir(pairsDir), "engine.ahk");
    pairs = listPairFolders(pairsDir)
        .map((name) => readPair(name))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
    dumpMenu();
}

function dumpMenu() {
    outlet(1, "clear");
    for (const pair of pairs) {
        outlet(1, "append", pair.name);
    }
}

function load(x) {
    const pair = findPair(x);
    if (!pair) {
        post(`host: no pair ${x}\n`);
        return;
    }
    outlet(0, "compile", pair.js);
    requestEngine(nativePath(pair.dir));
    post(`host: compile ${pair.js}\n`);
}

function msg_int(n) {
    load(n);
}

function bang() {
    scan(pairsDir || defaultPairsDir());
}

function quit() {
    if (!ensureEnginePath()) {
        return;
    }
    requestEngine("--quit");
}

function suspend(n) {
    if (n === 0) {
        writeCommand("resume");
        return;
    }
    writeCommand("suspend");
}

function resume() {
    writeCommand("resume");
}

function writeCommand(cmd) {
    if (!ensureEnginePath()) {
        return;
    }
    writeText(joinPath(parentDir(enginePath), "engine-cmd.txt"), cmd);
}

function defaultPairsDir() {
    if (typeof jsarguments !== "undefined" && jsarguments.length > 1 && jsarguments[1]) {
        return String(jsarguments[1]);
    }
    const root = projectRoot();
    return root ? joinPath(root, "pairs") : "";
}

function projectRoot() {
    const fp = this.patcher && this.patcher.filepath;
    if (fp) {
        return parentDir(String(fp));
    }
    const engine = resolveFromSearchPath("engine.ahk");
    return engine ? parentDir(engine) : "";
}

function resolveFromSearchPath(name) {
    const f = new File(name, "read");
    if (!f.isopen) {
        return "";
    }
    const folder = String(f.foldername || "").replace(/[\\\/]+$/, "");
    f.close();
    return folder ? joinPath(folder, name) : "";
}

function ensureEnginePath() {
    if (enginePath) {
        return true;
    }
    const root = projectRoot();
    if (root) {
        enginePath = joinPath(root, "engine.ahk");
        return true;
    }
    post("host: cannot find engine.ahk\n");
    return false;
}

function findPair(x) {
    if (typeof x === "number") {
        return pairs[x];
    }
    const s = String(x);
    const byName = pairs.find((pair) => pair.id === s || pair.name === s);
    if (byName) {
        return byName;
    }
    const asNum = parseInt(s, 10);
    if (String(asNum) === s) {
        return pairs[asNum];
    }
    return null;
}

function requestEngine(state) {
    if (!ensureEnginePath()) {
        return;
    }
    const statePath = `${parentDir(enginePath)}/current-pair.txt`;
    if (!writeText(statePath, state)) {
        return;
    }
    max.launchbrowser(fileUrl(enginePath));
}

function listPairFolders(dirPath) {
    const names = [];
    const fold = new Folder(dirPath);
    fold.typelist = ["fold"];
    fold.reset();
    while (!fold.end) {
        const name = fold.filename;
        fold.next();
        if (name && name !== "." && name !== "..") {
            names.push(name);
        }
    }
    fold.close();
    return names;
}

function readPair(name) {
    const dir = joinPath(pairsDir, name);
    const raw = readText(joinPath(dir, "pair.json"));
    if (!raw) {
        return null;
    }
    try {
        const meta = JSON.parse(raw);
        return {
            id: meta.id || name,
            name: meta.name || name,
            dir,
            js: joinPath(dir, "live.js")
        };
    } catch (err) {
        post(`host: skip ${name} (${err})\n`);
        return null;
    }
}

function readText(path) {
    const f = new File(path, "read");
    if (!f.isopen) {
        return null;
    }
    const chunks = [];
    while (f.position < f.eof) {
        chunks.push(f.readline());
    }
    f.close();
    return chunks.join("\n");
}

function writeText(path, text) {
    const f = new File(path, "write");
    if (!f.isopen) {
        post(`host: cannot write ${path}\n`);
        return false;
    }
    f.eof = 0;
    f.position = 0;
    f.writestring(`${String(text)}\n`);
    f.close();
    return true;
}

function parentDir(path) {
    const s = String(path).replace(/[\\\/]+$/, "");
    const i = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
    if (i <= 0) {
        return s;
    }
    return s.substring(0, i);
}

function joinPath(a, b) {
    return `${String(a).replace(/[\\\/]+$/, "")}/${b}`;
}

function nativePath(path) {
    return String(path).replace(/\//g, "\\");
}

function fileUrl(path) {
    const posix = nativePath(path).replace(/\\/g, "/");
    return `file:///${posix.replace(/ /g, "%20")}`;
}
