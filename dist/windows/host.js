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
function hostThis() {
  return globalThis;
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
  writeText(joinPath(parentDir(enginePath), "engine-cmd.txt"), "");
  launchEngine();
  writeLaunchCommands();
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
  if (n === 0) {
    writeCommand("resume");
    return;
  }
  writeCommand("suspend");
}
function resume() {
  writeCommand("resume");
}
function hud(n) {
  if (n === 1) {
    writeCommand("hudoff");
    return;
  }
  writeCommand("hudon");
}
function idle(ms) {
  idleMs = Math.min(12e3, Math.max(200, Math.round(Number(ms))));
  writeIdleCommand();
}
function playfrom(n) {
  playFromOff = n === 0;
  writeCommand(playFromOff ? "playfromoff" : "playfromon");
}
function initiator(n) {
  const last = INITIATORS.length - 1;
  initiatorIndex = Math.min(last, Math.max(0, Math.round(Number(n)) || 0));
  writeCommand(`initiator ${INITIATORS[initiatorIndex]}`);
}
function writeIdleCommand() {
  writeCommand(`idle ${idleMs}`);
}
function writeLaunchCommands() {
  const lines = [`idle ${idleMs}`, `initiator ${INITIATORS[initiatorIndex]}`];
  if (playFromOff) {
    lines.push("playfromoff");
  }
  writeCommand(lines.join("\n"));
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
void closebang;
void notifydeleted;
void quit;
void suspend;
void resume;
void hud;
void idle;
void playfrom;
void initiator;
