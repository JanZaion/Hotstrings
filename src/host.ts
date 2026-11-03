autowatch = 1;
inlets = 1;
outlets = 2;

// [v8 host.js]
// Outlet 0 -> preset [v8]: compile <live.js>
// Outlet 1 -> [umenu]: clear / append <name>
//
// Keep host.js, engine.ahk, and presets/ next to the .amxd.
// loadbang in this file scans ./presets (no hardcoded path in the patch).
// Optional override: v8 host.js <presets-folder>
// [umenu] -> prepend load -> this v8
// [live.toggle] -> prepend suspend -> this v8   (1 pause, 0 resume)
// closebang -> quit

type Preset = {
  id: string;
  name: string;
  dir: string;
  js: string;
};

type PresetMeta = {
  id?: string;
  name?: string;
};

type HostJsThis = {
  patcher?: {
    filepath?: string;
  };
};

let enginePath = '';
let presetsDir = '';
let presets: Preset[] = [];

function hostThis() {
  return globalThis as unknown as HostJsThis;
}

function isPreset(value: Preset | null): value is Preset {
  return value !== null;
}

function loadbang() {
  scan();
}

function scan(path?: unknown) {
  const dir = path ? String(path) : defaultPresetsDir();
  if (!dir) {
    post('host: cannot find the presets folder. Put presets/ next to the device.\n');
    return;
  }
  presetsDir = dir;
  enginePath = joinPath(parentDir(presetsDir), 'engine.ahk');
  presets = listPresetFolders(presetsDir)
    .map(name => readPreset(name))
    .filter(isPreset)
    .sort((a, b) => a.name.localeCompare(b.name));
  dumpMenu();
}

function dumpMenu() {
  outlet(1, 'clear');
  for (const preset of presets) {
    outlet(1, 'append', preset.name);
  }
}

function load(x: unknown) {
  const preset = findPreset(x);
  if (!preset) {
    post(`host: no preset ${x}\n`);
    return;
  }
  outlet(0, 'compile', preset.js);
  requestEngine(nativePath(preset.dir));
  post(`host: compile ${preset.js}\n`);
}

function msg_int(n: number) {
  load(n);
}

function bang() {
  scan(presetsDir || defaultPresetsDir());
}

function quit() {
  if (!ensureEnginePath()) {
    return;
  }
  requestEngine('--quit');
}

function suspend(n: number) {
  if (n === 0) {
    writeCommand('resume');
    return;
  }
  writeCommand('suspend');
}

function resume() {
  writeCommand('resume');
}

function writeCommand(cmd: string) {
  if (!ensureEnginePath()) {
    return;
  }
  writeText(joinPath(parentDir(enginePath), 'engine-cmd.txt'), cmd);
}

function defaultPresetsDir() {
  if (typeof jsarguments !== 'undefined' && jsarguments.length > 1 && jsarguments[1]) {
    return String(jsarguments[1]);
  }
  const root = projectRoot();
  return root ? joinPath(root, 'presets') : '';
}

function projectRoot() {
  const fp = hostThis().patcher?.filepath;
  if (fp) {
    return parentDir(String(fp));
  }
  const engine = resolveFromSearchPath('engine.ahk');
  return engine ? parentDir(engine) : '';
}

function resolveFromSearchPath(name: string) {
  const f = new File(name, 'read');
  if (!f.isopen) {
    return '';
  }
  const folder = String(f.foldername || '').replace(/[\\/]+$/, '');
  f.close();
  return folder ? joinPath(folder, name) : '';
}

function ensureEnginePath() {
  if (enginePath) {
    return true;
  }
  const root = projectRoot();
  if (root) {
    enginePath = joinPath(root, 'engine.ahk');
    return true;
  }
  post('host: cannot find engine.ahk\n');
  return false;
}

function findPreset(x: unknown) {
  if (typeof x === 'number') {
    return presets[x];
  }
  const s = String(x);
  const byName = presets.find(preset => preset.id === s || preset.name === s);
  if (byName) {
    return byName;
  }
  const asNum = parseInt(s, 10);
  if (String(asNum) === s) {
    return presets[asNum];
  }
  return null;
}

function requestEngine(state: string) {
  if (!ensureEnginePath()) {
    return;
  }
  const statePath = `${parentDir(enginePath)}/current-preset.txt`;
  if (!writeText(statePath, state)) {
    return;
  }
  max.launchbrowser(fileUrl(enginePath));
}

function listPresetFolders(dirPath: string) {
  const names: string[] = [];
  const fold = new Folder(dirPath);
  fold.typelist = ['fold'];
  fold.reset();
  while (!fold.end) {
    const name = fold.filename;
    fold.next();
    if (name && name !== '.' && name !== '..') {
      names.push(name);
    }
  }
  fold.close();
  return names;
}

function readPreset(name: string) {
  const dir = joinPath(presetsDir, name);
  const raw = readText(joinPath(dir, 'preset.json'));
  if (!raw) {
    return null;
  }
  try {
    const meta = JSON.parse(raw) as PresetMeta;
    return {
      id: meta.id || name,
      name: meta.name || name,
      dir,
      js: joinPath(dir, 'live.js'),
    };
  } catch (err) {
    post(`host: skip ${name} (${err})\n`);
    return null;
  }
}

function readText(path: string) {
  const f = new File(path, 'read');
  if (!f.isopen) {
    return null;
  }
  const chunks: string[] = [];
  while (f.position < f.eof) {
    chunks.push(f.readline());
  }
  f.close();
  return chunks.join('\n');
}

function writeText(path: string, text: string) {
  const f = new File(path, 'write');
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

function parentDir(path: string) {
  const s = String(path).replace(/[\\/]+$/, '');
  const i = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
  if (i <= 0) {
    return s;
  }
  return s.substring(0, i);
}

function joinPath(a: string, b: string) {
  return `${String(a).replace(/[\\/]+$/, '')}/${b}`;
}

function nativePath(path: string) {
  return String(path).replace(/\//g, '\\');
}

function fileUrl(path: string) {
  const posix = nativePath(path).replace(/\\/g, '/');
  return `file:///${posix.replace(/ /g, '%20')}`;
}

// Max v8 looks these up by name. Keep the references so tsc does not treat them as unused.
void loadbang;
void msg_int;
void bang;
void quit;
void suspend;
void resume;
