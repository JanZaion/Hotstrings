import engineSource from '../platforms/windows/engine.ahk';
import hotstringsPage from 'kw:hotstrings.html';

autowatch = 1;
inlets = 1;
outlets = 0;

type PatcherObject = {
  maxclass: string;
  message: (...args: unknown[]) => void;
};

type HostJsThis = {
  patcher?: {
    filepath?: string;
    getnamed: (name: string) => { getvalueof: () => unknown };
    applydeep: (fn: (obj: PatcherObject) => boolean) => void;
  };
};

const WRITE_CHUNK = 8192;

const INITIATORS = [';', '/', 'CapsLock'];

let enginePath = '';
let shuttingDown = false;
let idleMs = 4000;
let playFromOff = false;
let initiatorIndex = 0;
let paused = false;
let hudOff = false;
let haveBinds = false;
let uiReady = false;

function hostThis() {
  return globalThis as unknown as HostJsThis;
}

function uiValue(raw: unknown) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}

function namedNumber(name: string) {
  const box = hostThis().patcher?.getnamed(name);
  if (!box) {
    return;
  }
  const raw = uiValue(box.getvalueof());
  if (raw == null || raw === '') {
    return;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return;
  }
  return n;
}

function clampIdle(ms: number) {
  return Math.min(12000, Math.max(200, Math.round(Number(ms))));
}

function clampInitiator(n: number) {
  const last = INITIATORS.length - 1;
  return Math.min(last, Math.max(0, Math.round(Number(n)) || 0));
}

function readUi() {
  const idle = namedNumber('hotstringAwait');
  if (idle != null) {
    idleMs = clampIdle(idle);
  }
  const pause = namedNumber('pause');
  if (pause != null) {
    paused = pause !== 0;
  }
  const noHud = namedNumber('noHud');
  if (noHud != null) {
    hudOff = noHud === 1;
  }
  const playFrom = namedNumber('playFrom');
  if (playFrom != null) {
    playFromOff = playFrom === 0;
  }
  const initiatorVal = namedNumber('initiator');
  if (initiatorVal != null) {
    initiatorIndex = clampInitiator(initiatorVal);
  }
}

function syncFromUi() {
  readUi();
  uiReady = true;
  if (haveBinds) {
    writeLaunchCommands();
  }
}

function binds(...parts: unknown[]) {
  const json = parts.map(String).join(' ');
  if (!json) {
    post('host: empty bindings\n');
    return;
  }
  if (!ensureEnginePath()) {
    return;
  }
  if (!writeText(joinPath(parentDir(enginePath), 'bindings.json'), json)) {
    return;
  }
  haveBinds = true;
  // Neutralize a leftover quit so a new launch does not exit immediately.
  writeText(joinPath(parentDir(enginePath), 'engine-cmd.txt'), '');
  launchEngine();
  if (uiReady) {
    writeLaunchCommands();
  }
}

function bang() {
  syncFromUi();
}

function sync() {
  syncFromUi();
}

function closebang() {
  quit();
}

function notifydeleted() {
  quit();
}

function quit() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  writeCommand('quit');
}

function suspend(n: number) {
  paused = n !== 0;
  writeCommand(paused ? 'suspend' : 'resume');
}

function resume() {
  paused = false;
  writeCommand('resume');
}

function hud(n: number) {
  hudOff = n === 1;
  writeCommand(hudOff ? 'hudoff' : 'hudon');
}

function idle(ms: number) {
  idleMs = clampIdle(ms);
  writeIdleCommand();
}

function playfrom(n: number) {
  playFromOff = n === 0;
  writeCommand(playFromOff ? 'playfromoff' : 'playfromon');
}

function initiator(n: number) {
  initiatorIndex = clampInitiator(n);
  writeCommand(`initiator ${INITIATORS[initiatorIndex]}`);
}

function writeIdleCommand() {
  writeCommand(`idle ${idleMs}`);
}

function writeLaunchCommands() {
  writeCommand(
    [
      `idle ${idleMs}`,
      `initiator ${INITIATORS[initiatorIndex]}`,
      playFromOff ? 'playfromoff' : 'playfromon',
      hudOff ? 'hudoff' : 'hudon',
      paused ? 'suspend' : 'resume',
    ].join('\n')
  );
}

function writeCommand(cmd: string) {
  if (!ensureEnginePath()) {
    return;
  }
  writeText(joinPath(parentDir(enginePath), 'engine-cmd.txt'), cmd);
}

function launchEngine() {
  if (!ensureEnginePath()) {
    return;
  }
  max.launchbrowser(fileUrl(enginePath));
}

// Frozen dependencies are not real files, so AutoHotkey and jweb get copies
// written next to the .amxd.
function ensureEnginePath() {
  if (enginePath) {
    return true;
  }
  const fp = hostThis().patcher?.filepath;
  if (!fp) {
    post('host: save the device to disk first\n');
    return false;
  }
  const root = parentDir(String(fp));
  const listPath = joinPath(root, 'hotstrings.html');
  if (
    !writeText(joinPath(root, 'engine.ahk'), engineSource) ||
    !writeText(listPath, hotstringsPage)
  ) {
    return false;
  }
  enginePath = joinPath(root, 'engine.ahk');
  showHotstringList(listPath);
  return true;
}

function showHotstringList(path: string) {
  hostThis().patcher?.applydeep(obj => {
    if (obj.maxclass === 'jweb') {
      obj.message('url', fileUrl(path));
    }
    return true;
  });
}

function writeText(path: string, text: string) {
  const f = new File(path, 'write');
  if (!f.isopen) {
    post(`host: cannot write ${path}\n`);
    return false;
  }
  f.eof = 0;
  f.position = 0;
  const s = `${String(text)}\n`;
  for (let i = 0; i < s.length; i += WRITE_CHUNK) {
    f.writestring(s.substring(i, i + WRITE_CHUNK));
  }
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

void binds;
void bang;
void sync;
void closebang;
void notifydeleted;
void quit;
void suspend;
void resume;
void hud;
void idle;
void playfrom;
void initiator;
