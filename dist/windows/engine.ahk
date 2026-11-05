#Requires AutoHotkey v2.0
#SingleInstance Force
#UseHook

; KeyToMax engine. Launch by opening this file after the Max host
; writes bindings.json next to it, or:
;   AutoHotkey64.exe engine.ahk --quit
;
; Reads bindings.json in this folder and sends OSC /bind <name> [int|string]
; to 127.0.0.1:7400 while Ableton Live is focused.

HOST := "127.0.0.1"
PORT := 7400
HS_IDLE_MS := 2000
HS_COMMIT_MS := 400
CMD_PATH := A_ScriptDir "\engine-cmd.txt"
KEYS_PATH := A_ScriptDir "\bindings.json"
HS_CHARS := "abcdefghijklmnopqrstuvwxyz0123456789=-"

hsBinds := Map()
hsBuffer := ""
capturing := false
hudEnabled := true
hud := 0
hudText := 0
hudMinW := 0
hudMinH := 0
HUD_PAD_X := 8
HUD_PAD_Y := 5
HUD_ROUND := 10
HUD_ALPHA := 200
HUD_GROW := 0.65

doQuit := false
for arg in A_Args {
    if arg = "--quit" {
        doQuit := true
    }
}

if FileExist(CMD_PATH) {
    cmd := Trim(StrSplit(FileRead(CMD_PATH, "UTF-8"), "`n", "`r")[1])
    if cmd = "quit" {
        try {
            FileDelete(CMD_PATH)
        }
        doQuit := true
    } else if cmd = "" {
        try {
            FileDelete(CMD_PATH)
        }
    }
}

if doQuit {
    try {
        FileDelete(KEYS_PATH)
    }
    ExitApp
}

if !FileExist(KEYS_PATH) {
    MsgBox "No bindings.json in:`n" A_ScriptDir, "KeyToMax"
    ExitApp
}

keysText := FileRead(KEYS_PATH, "UTF-8")
try {
    hotkeys := ParseBindArray(keysText, "hotkeys")
    hotstrings := ParseBindArray(keysText, "hotstrings")
} catch as err {
    MsgBox "Could not parse bindings.json:`n" KEYS_PATH "`n" err.Message, "KeyToMax"
    ExitApp
}

if (Type(hotkeys) != "Array" || hotkeys.Length = 0)
&& (Type(hotstrings) != "Array" || hotstrings.Length = 0) {
    MsgBox "bindings.json needs a non-empty hotkeys or hotstrings array.`n" KEYS_PATH, "KeyToMax"
    ExitApp
}

sock := 0
InitUdp()
OnExit(Cleanup)
UpdateTip()
try {
    InitHud()
} catch {
    hud := 0
    hudText := 0
}

bad := []
for entry in hotstrings {
    if Type(entry) != "Map" || !entry.Has("key") || !entry.Has("bind") {
        continue
    }
    trigger := String(entry["key"])
    bindName := String(entry["bind"])
    hasStr := entry.Has("str")
    hasInt := entry.Has("int")
    if entry.Has("value") {
        RegisterHotstring(trigger, bindName, entry["value"], hasStr, hasInt)
    } else {
        RegisterHotstring(trigger, bindName, unset, hasStr, hasInt)
    }
}

HotIf LiveIdle
for entry in hotkeys {
    if Type(entry) != "Map" || !entry.Has("key") || !entry.Has("bind") {
        continue
    }
    keyName := String(entry["key"])
    bindName := String(entry["bind"])
    keysToSend := entry.Has("keys") ? String(entry["keys"]) : ""
    if entry.Has("value") {
        RegisterHot(keyName, bindName, entry["value"], keysToSend)
    } else {
        RegisterHot(keyName, bindName, unset, keysToSend)
    }
}
HotIf LiveFocused
if hsBinds.Count {
    try {
        Hotkey(";", BeginHotstring)
    } catch as err {
        bad.Push("; (" err.Message ")")
    }
}
HotIf CapturingLive
if hsBinds.Count {
    loop parse HS_CHARS {
        RegisterHsChar(A_LoopField)
    }
    try {
        Hotkey("Escape", (*) => StopHotstring())
    } catch as err {
        bad.Push("Escape (" err.Message ")")
    }
    try {
        Hotkey("Enter", HsCommit)
    } catch as err {
        bad.Push("Enter (" err.Message ")")
    }
    try {
        Hotkey("NumpadEnter", HsCommit)
    } catch as err {
        bad.Push("NumpadEnter (" err.Message ")")
    }
}
HotIf

if bad.Length {
    MsgBox "Skipped invalid binds:`n" JoinLines(bad), "KeyToMax"
}

SetTimer WatchCmd, 150

WatchCmd() {
    global CMD_PATH, capturing
    if capturing && !LiveFocused() {
        StopHotstring()
    }
    if !FileExist(CMD_PATH) {
        return
    }
    cmd := Trim(StrSplit(FileRead(CMD_PATH, "UTF-8"), "`n", "`r")[1])
    try {
        FileDelete(CMD_PATH)
    }
    parts := StrSplit(cmd, A_Space, " `t")
    if parts.Length = 0 {
        return
    }
    switch parts[1] {
        case "idle":
            if parts.Length >= 2 {
                SetHsIdle(parts[2])
            }
        case "suspend":
            StopHotstring()
            Suspend True
        case "resume":
            Suspend False
        case "toggle":
            Suspend
            if A_IsSuspended {
                StopHotstring()
            }
        case "hudon":
            SetHudEnabled(true)
        case "hudoff":
            SetHudEnabled(false)
        case "quit":
            try {
                FileDelete(KEYS_PATH)
            }
            ExitApp
        case "":
            return
    }
    UpdateTip()
}

SetHsIdle(ms) {
    global HS_IDLE_MS, HS_COMMIT_MS, capturing
    try {
        n := Integer(ms)
    } catch {
        return
    }
    if n < 200 {
        n := 200
    }
    if n > 10000 {
        n := 10000
    }
    HS_IDLE_MS := n
    commit := Integer(n * 0.2)
    if commit < 50 {
        commit := 50
    }
    HS_COMMIT_MS := commit
    if capturing {
        SetTimer HsIdle, -HS_IDLE_MS
    }
}

UpdateTip() {
    A_IconTip := A_IsSuspended ? "KeyToMax paused" : "KeyToMax"
}

LiveFocused(*) {
    try {
        return InStr(WinGetProcessName("A"), "Ableton Live") > 0
    } catch {
        return false
    }
}

LiveIdle(*) {
    global capturing
    return !capturing && LiveFocused()
}

CapturingLive(*) {
    global capturing
    return capturing && LiveFocused()
}

RegisterHot(keyName, bindName, value?, keys?) {
    global bad
    keysToSend := IsSet(keys) ? String(keys) : ""
    fn := IsSet(value)
        ? (*) => FireHot(bindName, keysToSend, value)
        : (*) => FireHot(bindName, keysToSend)
    try {
        Hotkey(keyName, fn)
    } catch as err {
        bad.Push(keyName " (" err.Message ")")
    }
}

FireHot(bindName, keysToSend, value?) {
    if keysToSend != "" {
        Send(keysToSend)
        Sleep(100)
    }
    if IsSet(value) {
        SendBind(bindName, value)
        return
    }
    SendBind(bindName)
}

RegisterHotstring(trigger, bindName, value?, hasStr?, hasInt?) {
    global hsBinds
    t := StrLower(String(trigger))
    if t = "" {
        return
    }
    entry := Map("bind", String(bindName))
    if IsSet(value) {
        entry["value"] := value
    }
    if IsSet(hasStr) && hasStr {
        entry["str"] := true
    }
    if IsSet(hasInt) && hasInt {
        entry["int"] := true
    }
    hsBinds[t] := entry
}

RegisterHsChar(char) {
    global bad
    try {
        Hotkey(char, HsOnChar)
    } catch as err {
        bad.Push(char " (" err.Message ")")
    }
}

BeginHotstring(*) {
    global capturing, hsBuffer
    capturing := true
    hsBuffer := ""
    HudShow()
    SetTimer HsIdle, -HS_IDLE_MS
}

StopHotstring() {
    global capturing, hsBuffer
    HudHide()
    capturing := false
    hsBuffer := ""
    SetTimer HsIdle, 0
}

HsCommit(*) {
    global hsBuffer
    if MatchHs(hsBuffer) {
        FireHs()
    }
}

HsIdle(*) {
    global hsBuffer
    if MatchHs(hsBuffer) {
        FireHs()
        return
    }
    StopHotstring()
}

HsOnChar(char) {
    global hsBuffer
    hsBuffer .= StrLower(char)
    if MatchHs(hsBuffer) {
        if HasLongerHs(hsBuffer) || SuffixOpen(hsBuffer) {
            SetTimer HsIdle, -HS_COMMIT_MS
            HudUpdate(hsBuffer)
            return
        }
        FireHs()
        return
    }
    if !IsHsPrefix(hsBuffer) {
        StopHotstring()
        return
    }
    SetTimer HsIdle, -HS_IDLE_MS
    HudUpdate(hsBuffer)
}

FireHs() {
    global hsBuffer
    match := MatchHs(hsBuffer)
    StopHotstring()
    if Type(match) != "Map" {
        return
    }
    if match.Has("strArg") {
        SendBind(match["bind"], String(match["strArg"]))
    } else if match.Has("intArg") {
        SendBind(match["bind"], Integer(match["intArg"]))
    } else if match.Has("value") {
        SendBind(match["bind"], match["value"])
    } else {
        SendBind(match["bind"])
    }
}

MatchHs(buf) {
    global hsBinds
    if hsBinds.Has(buf) {
        entry := hsBinds[buf]
        if !entry.Has("int") {
            return entry
        }
    }
    for trigger, entry in hsBinds {
        tlen := StrLen(trigger)
        if tlen = 0 || SubStr(buf, 1, tlen) != trigger {
            continue
        }
        rest := SubStr(buf, tlen + 1)
        if entry.Has("int") {
            if rest = "" || !RegExMatch(rest, "^\d+$") {
                continue
            }
            return Map("bind", entry["bind"], "intArg", Integer(rest))
        }
        if !entry.Has("str") {
            continue
        }
        if rest = "" || !RegExMatch(rest, "^[a-z0-9]+$") {
            continue
        }
        return Map("bind", entry["bind"], "strArg", rest)
    }
    return false
}

SuffixOpen(buf) {
    global hsBinds
    for trigger, entry in hsBinds {
        tlen := StrLen(trigger)
        if tlen = 0 || SubStr(buf, 1, tlen) != trigger {
            continue
        }
        rest := SubStr(buf, tlen + 1)
        if entry.Has("int") {
            if rest = "" || RegExMatch(rest, "^\d+$") {
                return true
            }
        } else if entry.Has("str") {
            if rest = "" || RegExMatch(rest, "^[a-z0-9]+$") {
                return true
            }
        }
    }
    return false
}

IsHsPrefix(buf) {
    global hsBinds
    n := StrLen(buf)
    for trigger, entry in hsBinds {
        if SubStr(trigger, 1, n) = buf {
            return true
        }
        tlen := StrLen(trigger)
        if tlen = 0 || SubStr(buf, 1, tlen) != trigger {
            continue
        }
        rest := SubStr(buf, tlen + 1)
        if entry.Has("int") {
            if rest = "" || RegExMatch(rest, "^\d+$") {
                return true
            }
        } else if entry.Has("str") {
            if rest = "" || RegExMatch(rest, "^[a-z0-9]+$") {
                return true
            }
        }
    }
    return false
}

HasLongerHs(buf) {
    global hsBinds
    n := StrLen(buf)
    for trigger, _ in hsBinds {
        if StrLen(trigger) > n && SubStr(trigger, 1, n) = buf {
            return true
        }
    }
    return false
}

SendBind(name, extra?) {
    if !IsSet(extra) {
        SendOsc("/bind", String(name))
        return
    }
    SendOsc("/bind", String(name), extra)
}

InitHud() {
    global hud, hudText, hudMinW, hudMinH, HUD_PAD_X, HUD_PAD_Y, HUD_ALPHA
    hud := Gui("+AlwaysOnTop -Caption -Theme +ToolWindow +E0x08000020")
    hud.BackColor := "0C1217"
    hud.MarginX := 0
    hud.MarginY := 0
    hud.SetFont("s18 cFF9000 Bold", "Segoe UI")
    hudText := hud.Add("Text", "x0 y0 Center 0x200", "")
    hud.Show("Hide")
    WinSetTransparent(HUD_ALPHA, hud)
    m := HudMeasure("www")
    hudMinW := m[1] + HUD_PAD_X * 2
    hudMinH := m[2] + HUD_PAD_Y * 2
}

SetHudEnabled(on) {
    global hudEnabled, capturing
    hudEnabled := on ? true : false
    if !hudEnabled {
        HudHide()
        return
    }
    if capturing {
        HudShow()
    }
}

HudShow() {
    global hsBuffer, hudEnabled
    if !hudEnabled {
        return
    }
    HudPaint(hsBuffer)
}

HudUpdate(text) {
    HudPaint(text)
}

HudHide() {
    global hud, hudText
    if !hud {
        return
    }
    hudText.Value := ""
    hud.Hide()
}

HudPaint(text) {
    global hud, hudText, hudMinW, hudMinH, HUD_PAD_X, HUD_GROW, hudEnabled
    if !hud || !hudEnabled {
        return
    }
    hudText.Value := text
    w := hudMinW
    h := hudMinH
    if StrLen(text) > 3 {
        extra := HudMeasure(text)[1] + HUD_PAD_X * 2 - hudMinW
        if extra > 0 {
            w := hudMinW + Integer(extra * HUD_GROW)
        }
    }
    hudText.Move(0, 0, w, h)
    hud.Show(HudPos(w, h) " w" w " h" h " NoActivate")
    HudRound()
}

HudMeasure(text) {
    global hudText
    hwnd := hudText.Hwnd
    hdc := DllCall("GetDC", "Ptr", hwnd, "Ptr")
    hFont := DllCall("SendMessageW", "Ptr", hwnd, "UInt", 0x31, "Ptr", 0, "Ptr", 0, "Ptr")
    old := DllCall("SelectObject", "Ptr", hdc, "Ptr", hFont, "Ptr")
    size := Buffer(8, 0)
    DllCall("GetTextExtentPoint32W", "Ptr", hdc, "WStr", text, "Int", StrLen(text), "Ptr", size)
    DllCall("SelectObject", "Ptr", hdc, "Ptr", old, "Ptr")
    DllCall("ReleaseDC", "Ptr", hwnd, "Ptr", hdc)
    return [NumGet(size, 0, "Int"), NumGet(size, 4, "Int")]
}

HudRound() {
    global hud, HUD_ROUND
    rect := Buffer(16, 0)
    DllCall("GetClientRect", "Ptr", hud.Hwnd, "Ptr", rect)
    w := NumGet(rect, 8, "Int")
    h := NumGet(rect, 12, "Int")
    r := HUD_ROUND
    dpi := DllCall("User32\GetDpiForWindow", "Ptr", hud.Hwnd, "UInt")
    if dpi && dpi != 96 {
        r := Round(r * dpi / 96)
    }
    if r > h {
        r := h
    }
    hrgn := DllCall("CreateRoundRectRgn", "Int", 0, "Int", 0, "Int", w + 1, "Int", h + 1, "Int", r, "Int", r, "Ptr")
    DllCall("SetWindowRgn", "Ptr", hud.Hwnd, "Ptr", hrgn, "Int", true)
}

HudPos(w, h) {
    try {
        WinGetPos(&lx, &ly, &lw, &lh, "A")
        x := lx + (lw - w) // 2
        y := ly + (lh - h) // 2
        return "x" x " y" y
    } catch {
        return "xCenter yCenter"
    }
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

SendOsc(address, strArg, extra?) {
    global sock, HOST, PORT
    parts := [OscPadString(address)]
    if !IsSet(extra) {
        parts.Push(OscPadString(",s"))
        parts.Push(OscPadString(strArg))
    } else if Type(extra) = "Integer" {
        parts.Push(OscPadString(",si"))
        parts.Push(OscPadString(strArg))
        parts.Push(OscInt32(extra))
    } else {
        parts.Push(OscPadString(",ss"))
        parts.Push(OscPadString(strArg))
        parts.Push(OscPadString(String(extra)))
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
        if RegExMatch(block, '"str"\s*:\s*true') {
            entry["str"] := true
        }
        if RegExMatch(block, '"int"\s*:\s*true') {
            entry["int"] := true
        }
        if RegExMatch(block, '"keys"\s*:\s*"([^"]+)"', &s) {
            entry["keys"] := s[1]
        }
        entries.Push(entry)
        pos := m.Pos + m.Len
    }
    return entries
}
