#Requires AutoHotkey v2.0
#SingleInstance Force
#UseHook

; KeyToMax engine. Launch with:
;   AutoHotkey64.exe engine.ahk --preset <preset-folder>
;   AutoHotkey64.exe engine.ahk --quit
;   or open this file after current-preset.txt is written (Max host does that)
;
; Reads keys.json in the preset folder and sends OSC /bind <name> [int]
; to 127.0.0.1:7400 while Ableton Live is focused.

HOST := "127.0.0.1"
PORT := 7400
HS_IDLE_MS := 1000

hsBinds := Map()
hsBuffer := ""

presetDir := ""
doQuit := false
pendingPreset := false
for arg in A_Args {
    if pendingPreset {
        presetDir := arg
        pendingPreset := false
        continue
    }
    if arg = "--quit" {
        doQuit := true
    } else if arg = "--preset" {
        pendingPreset := true
    }
}

if presetDir = "" {
    statePath := A_ScriptDir "\current-preset.txt"
    if FileExist(statePath) {
        presetDir := Trim(StrSplit(FileRead(statePath, "UTF-8"), "`n", "`r")[1])
    }
}

if doQuit || presetDir = "--quit" {
    ExitApp
}

if presetDir = "" {
    MsgBox "Launch with --preset <folder> (a preset directory that contains keys.json).", "KeyToMax"
    ExitApp
}

presetDir := RTrim(presetDir, "\/")
keysPath := presetDir "\keys.json"
if !FileExist(keysPath) {
    MsgBox "No keys.json in:`n" presetDir, "KeyToMax"
    ExitApp
}

keysText := FileRead(keysPath, "UTF-8")
try {
    hotkeys := ParseBindArray(keysText, "hotkeys")
    hotstrings := ParseBindArray(keysText, "hotstrings")
} catch as err {
    MsgBox "Could not parse keys.json:`n" keysPath "`n" err.Message, "KeyToMax"
    ExitApp
}

if (Type(hotkeys) != "Array" || hotkeys.Length = 0)
    && (Type(hotstrings) != "Array" || hotstrings.Length = 0) {
    MsgBox "keys.json needs a non-empty hotkeys or hotstrings array.`n" keysPath, "KeyToMax"
    ExitApp
}

sock := 0
InitUdp()
OnExit(Cleanup)
UpdateTip()

bad := []
HotIf LiveFocused
for entry in hotkeys {
    if Type(entry) != "Map" || !entry.Has("key") || !entry.Has("bind") {
        continue
    }
    keyName := String(entry["key"])
    bindName := String(entry["bind"])
    if entry.Has("value") {
        RegisterHot(keyName, bindName, entry["value"])
    } else {
        RegisterHot(keyName, bindName)
    }
}
for entry in hotstrings {
    if Type(entry) != "Map" || !entry.Has("key") || !entry.Has("bind") {
        continue
    }
    trigger := String(entry["key"])
    bindName := String(entry["bind"])
    if entry.Has("value") {
        RegisterHotstring(trigger, bindName, entry["value"])
    } else {
        RegisterHotstring(trigger, bindName)
    }
}
if hsBinds.Count {
    try {
        Hotkey(";", BeginHotstring)
    } catch as err {
        bad.Push("; (" err.Message ")")
    }
}
HotIf

if bad.Length {
    MsgBox "Skipped invalid binds:`n" JoinLines(bad), "KeyToMax"
}

SetTimer WatchCmd, 150

WatchCmd() {
    cmdPath := A_ScriptDir "\engine-cmd.txt"
    if !FileExist(cmdPath) {
        return
    }
    cmd := Trim(StrSplit(FileRead(cmdPath, "UTF-8"), "`n", "`r")[1])
    try {
        FileDelete(cmdPath)
    }
    switch cmd {
        case "suspend":
            Suspend True
        case "resume":
            Suspend False
        case "toggle":
            Suspend
        case "quit":
            ExitApp
    }
    UpdateTip()
}

UpdateTip() {
    global presetDir
    A_IconTip := (A_IsSuspended ? "KeyToMax paused  " : "KeyToMax  ") presetDir
}

LiveFocused(*) {
    try {
        return InStr(WinGetProcessName("A"), "Ableton Live") > 0
    } catch {
        return false
    }
}

RegisterHot(keyName, bindName, value?) {
    global bad
    fn := IsSet(value)
        ? (*) => SendBind(bindName, value)
        : (*) => SendBind(bindName)
    try {
        Hotkey(keyName, fn)
    } catch as err {
        bad.Push(keyName " (" err.Message ")")
    }
}

RegisterHotstring(trigger, bindName, value?) {
    global hsBinds
    t := StrLower(String(trigger))
    if t = "" {
        return
    }
    entry := Map("bind", String(bindName))
    if IsSet(value) {
        entry["value"] := value
    }
    hsBinds[t] := entry
}

BeginHotstring(*) {
    global hsHook, hsBuffer
    ; Keys after ; are swallowed until match, dead prefix, Esc, or idle timeout
    StopHotstring()
    hsBuffer := ""
    hsHook := InputHook("L64", "{Esc}")
    hsHook.KeyOpt("{All}", "S")
    hsHook.OnChar := HsOnChar
    hsHook.OnEnd := HsOnEnd
    hsHook.Start()
    SetTimer HsIdle, -HS_IDLE_MS
}

StopHotstring() {
    global hsHook
    SetTimer HsIdle, 0
    if IsSet(hsHook) && hsHook.InProgress {
        hsHook.Stop()
    }
}

HsIdle(*) {
    StopHotstring()
}

HsOnEnd(*) {
    SetTimer HsIdle, 0
}

HsOnChar(ih, char) {
    global hsBuffer, hsBinds
    if !LiveFocused() {
        StopHotstring()
        return
    }
    if char = ";" {
        hsBuffer := ""
        SetTimer HsIdle, -HS_IDLE_MS
        return
    }
    hsBuffer .= StrLower(char)
    SetTimer HsIdle, -HS_IDLE_MS
    if hsBinds.Has(hsBuffer) {
        entry := hsBinds[hsBuffer]
        StopHotstring()
        if entry.Has("value") {
            SendBind(entry["bind"], entry["value"])
        } else {
            SendBind(entry["bind"])
        }
        return
    }
    if !IsHsPrefix(hsBuffer) {
        StopHotstring()
    }
}

IsHsPrefix(buf) {
    global hsBinds
    n := StrLen(buf)
    for trigger, _ in hsBinds {
        if SubStr(trigger, 1, n) = buf {
            return true
        }
    }
    return false
}

SendBind(name, value?) {
    if IsSet(value)
        SendOsc("/bind", String(name), Integer(value))
    else
        SendOsc("/bind", String(name))
}

InitUdp() {
    global sock
    wsaData := Buffer(512, 0)
    if DllCall("ws2_32\WSAStartup", "UShort", 0x0202, "Ptr", wsaData) {
        throw Error("WSAStartup failed")
    }
    sock := DllCall("ws2_32\socket", "Int", 2, "Int", 2, "Int", 17, "Ptr")
    if sock = -1 || sock = 0 {
        throw Error("UDP socket failed")
    }
}

Cleanup(*) {
    global sock
    StopHotstring()
    if sock && sock != -1 {
        DllCall("ws2_32\closesocket", "Ptr", sock)
        sock := 0
    }
    DllCall("ws2_32\WSACleanup")
}

OscPadString(s) {
    utf8Len := StrPut(s, "UTF-8")
    padded := Ceil(utf8Len / 4) * 4
    buf := Buffer(padded, 0)
    StrPut(s, buf, "UTF-8")
    return buf
}

OscInt32(n) {
    buf := Buffer(4, 0)
    n := Integer(n)
    NumPut("UChar", (n >> 24) & 0xFF, buf, 0)
    NumPut("UChar", (n >> 16) & 0xFF, buf, 1)
    NumPut("UChar", (n >> 8) & 0xFF, buf, 2)
    NumPut("UChar", n & 0xFF, buf, 3)
    return buf
}

ConcatBuf(parts) {
    size := 0
    for p in parts {
        size += p.Size
    }
    packet := Buffer(size, 0)
    off := 0
    for p in parts {
        DllCall("RtlMoveMemory", "Ptr", packet.Ptr + off, "Ptr", p, "Ptr", p.Size)
        off += p.Size
    }
    return packet
}

SendOsc(address, strArg, intArg?) {
    global sock, HOST, PORT
    parts := [OscPadString(address)]
    if IsSet(intArg) {
        parts.Push(OscPadString(",si"))
        parts.Push(OscPadString(strArg))
        parts.Push(OscInt32(intArg))
    } else {
        parts.Push(OscPadString(",s"))
        parts.Push(OscPadString(strArg))
    }
    packet := ConcatBuf(parts)

    sockaddr := Buffer(16, 0)
    NumPut("UShort", 2, sockaddr, 0)
    NumPut("UShort", DllCall("ws2_32\htons", "UShort", PORT, "UShort"), sockaddr, 2)
    NumPut("UInt", DllCall("ws2_32\inet_addr", "AStr", HOST, "UInt"), sockaddr, 4)
    DllCall("ws2_32\sendto", "Ptr", sock, "Ptr", packet, "Int", packet.Size, "Int", 0, "Ptr", sockaddr, "Int", 16,
        "Int")
}

JoinLines(arr) {
    out := ""
    for line in arr {
        out .= line "`n"
    }
    return RTrim(out, "`n")
}

ParseBindArray(text, arrayName) {
    entries := []
    if !RegExMatch(text, 's)"' arrayName '"\s*:\s*\[(.*?)\]', &arr) {
        return entries
    }
    section := arr[1]
    pos := 1
    while pos := RegExMatch(section, "s)\{([^{}]+)\}", &m, pos) {
        block := m[1]
        if !RegExMatch(block, '"key"\s*:\s*"([^"]+)"', &k) {
            pos := m.Pos + 1
            continue
        }
        if !RegExMatch(block, '"bind"\s*:\s*"([^"]+)"', &b) {
            pos := m.Pos + 1
            continue
        }
        entry := Map("key", k[1], "bind", b[1])
        if RegExMatch(block, '"value"\s*:\s*(-?\d+)', &v) {
            entry["value"] := v[1] + 0
        }
        entries.Push(entry)
        pos := m.Pos + m.Len
    }
    return entries
}
