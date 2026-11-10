// src/host.ts
autowatch = 1;
inlets = 1;
outlets = 0;
var INITIATORS = [";", "/", "CapsLock"];
var enginePath = "";
var shuttingDown = false;
var idleMs = 4e3;
var playFromOff = false;
var initiatorIndex = 0;
var paused = false;
var hudOff = false;
var haveBinds = false;
var uiReady = false;
function hostThis() {
  return globalThis;
}
function uiValue(raw) {
  if (raw instanceof Array) {
    return raw[0];
  }
  return raw;
}
function namedNumber(name) {
  const box = hostThis().patcher?.getnamed(name);
  if (!box) {
    return;
  }
  const raw = uiValue(box.getvalueof());
  if (raw == null || raw === "") {
    return;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return;
  }
  return n;
}
function clampIdle(ms) {
  return Math.min(12e3, Math.max(200, Math.round(Number(ms))));
}
function clampInitiator(n) {
  const last = INITIATORS.length - 1;
  return Math.min(last, Math.max(0, Math.round(Number(n)) || 0));
}
function readUi() {
  const idle2 = namedNumber("hotstringAwait");
  if (idle2 != null) {
    idleMs = clampIdle(idle2);
  }
  const pause = namedNumber("pause");
  if (pause != null) {
    paused = pause !== 0;
  }
  const noHud = namedNumber("noHud");
  if (noHud != null) {
    hudOff = noHud === 1;
  }
  const playFrom = namedNumber("playFrom");
  if (playFrom != null) {
    playFromOff = playFrom === 0;
  }
  const initiatorVal = namedNumber("initiator");
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
function binds(...parts) {
  const json = parts.map(String).join(" ");
  if (!json) {
    post("host: empty bindings\n");
    return;
  }
  if (!ensureEnginePath()) {
    return;
  }
  if (!writeText(joinPath(parentDir(enginePath), "bindings.json"), json)) {
    return;
  }
  haveBinds = true;
  writeText(joinPath(parentDir(enginePath), "engine-cmd.txt"), "");
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
  writeCommand("quit");
}
function suspend(n) {
  paused = n !== 0;
  writeCommand(paused ? "suspend" : "resume");
}
function resume() {
  paused = false;
  writeCommand("resume");
}
function hud(n) {
  hudOff = n === 1;
  writeCommand(hudOff ? "hudoff" : "hudon");
}
function idle(ms) {
  idleMs = clampIdle(ms);
  writeIdleCommand();
}
function playfrom(n) {
  playFromOff = n === 0;
  writeCommand(playFromOff ? "playfromoff" : "playfromon");
}
function initiator(n) {
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
      playFromOff ? "playfromoff" : "playfromon",
      hudOff ? "hudoff" : "hudon",
      paused ? "suspend" : "resume"
    ].join("\n")
  );
}
function writeCommand(cmd) {
  if (!ensureEnginePath()) {
    return;
  }
  writeText(joinPath(parentDir(enginePath), "engine-cmd.txt"), cmd);
}
function launchEngine() {
  if (!ensureEnginePath()) {
    return;
  }
  max.launchbrowser(fileUrl(enginePath));
}
function projectRoot() {
  const fp = hostThis().patcher?.filepath;
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
  const folder = String(f.foldername || "").replace(/[\\/]+$/, "");
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
function writeText(path, text) {
  const f = new File(path, "write");
  if (!f.isopen) {
    post(`host: cannot write ${path}
`);
    return false;
  }
  f.eof = 0;
  f.position = 0;
  f.writestring(`${String(text)}
`);
  f.close();
  return true;
}
function parentDir(path) {
  const s = String(path).replace(/[\\/]+$/, "");
  const i = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
  if (i <= 0) {
    return s;
  }
  return s.substring(0, i);
}
function joinPath(a, b) {
  return `${String(a).replace(/[\\/]+$/, "")}/${b}`;
}
function nativePath(path) {
  return String(path).replace(/\//g, "\\");
}
function fileUrl(path) {
  const posix = nativePath(path).replace(/\\/g, "/");
  return `file:///${posix.replace(/ /g, "%20")}`;
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
