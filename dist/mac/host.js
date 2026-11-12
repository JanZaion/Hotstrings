// src/engine/engine.ahk
var engine_default = `#Requires AutoHotkey v2.0
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
HS_IDLE_MS := 4000
HS_COMMIT_MS := 400
CMD_PATH := A_ScriptDir "\\engine-cmd.txt"
KEYS_PATH := A_ScriptDir "\\bindings.json"
HS_CHARS := "abcdefghijklmnopqrstuvwxyz0123456789=-"
HS_INITIATORS := [";", "/", "CapsLock"]
DOUBLE_TAP_MS := 300
LIST_TITLE := "[Hotstrings]"
LIST_SEARCH_X := 60
LIST_SEARCH_Y := 31
listHwnd := 0
listActive := false

hsBinds := Map()
hsBuffer := ""
capturing := false
hsInitiator := ";"
hudEnabled := true
playFromKey := ""
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
    cmd := Trim(StrSplit(FileRead(CMD_PATH, "UTF-8"), "\`n", "\`r")[1])
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
    MsgBox "No bindings.json in:\`n" A_ScriptDir, "KeyToMax"
    ExitApp
}

keysText := FileRead(KEYS_PATH, "UTF-8")
try {
    hotkeys := ParseBindArray(keysText, "hotkeys")
    hotstrings := ParseBindArray(keysText, "hotstrings")
} catch as err {
    MsgBox "Could not parse bindings.json:\`n" KEYS_PATH "\`n" err.Message, "KeyToMax"
    ExitApp
}

if (Type(hotkeys) != "Array" || hotkeys.Length = 0)
&& (Type(hotstrings) != "Array" || hotstrings.Length = 0) {
    MsgBox "bindings.json needs a non-empty hotkeys or hotstrings array.\`n" KEYS_PATH, "KeyToMax"
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
    for key in HS_INITIATORS {
        try {
            Hotkey(key, BeginHotstring)
            if key != hsInitiator {
                Hotkey(key, "Off")
            }
        } catch as err {
            bad.Push(key " (" err.Message ")")
        }
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
    MsgBox "Skipped invalid binds:\`n" JoinLines(bad), "KeyToMax"
}

SetTimer WatchCmd, 150
SetTimer WatchList, 100

; The list's jweb only takes keyboard input after a click inside it, even when
; its window is active, so focus the search box whenever the window activates.
WatchList() {
    global listHwnd, listActive
    hwnd := ListWindow()
    if !hwnd {
        listHwnd := 0
        listActive := false
        return
    }
    if hwnd != listHwnd {
        listHwnd := hwnd
        listActive := false
        try {
            WinActivate(hwnd)
        }
    }
    active := WinActive(hwnd) ? true : false
    if active && !listActive {
        FocusListSearch(hwnd)
    }
    listActive := active
}

ListWindow() {
    global LIST_TITLE
    for hwnd in WinGetList(LIST_TITLE) {
        try {
            if WinGetTitle(hwnd) = LIST_TITLE && InStr(WinGetProcessName(hwnd), "Ableton Live") {
                return hwnd
            }
        }
    }
    return 0
}

FocusListSearch(hwnd) {
    global LIST_SEARCH_X, LIST_SEARCH_Y
    try {
        scale := DllCall("User32\\GetDpiForWindow", "Ptr", hwnd, "UInt") / 96
        ControlClick("x" Round(LIST_SEARCH_X * scale) " y" Round(LIST_SEARCH_Y * scale), hwnd, , , , "NA")
    }
}

WatchCmd() {
    global CMD_PATH, capturing
    if capturing && !LiveFocused() {
        StopHotstring()
    }
    if !FileExist(CMD_PATH) {
        return
    }
    text := FileRead(CMD_PATH, "UTF-8")
    try {
        FileDelete(CMD_PATH)
    }
    loop parse text, "\`n", "\`r" {
        ApplyCmd(Trim(A_LoopField))
    }
    UpdateTip()
}

ApplyCmd(cmd) {
    if cmd = "" {
        return
    }
    parts := StrSplit(cmd, A_Space, " \`t")
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
        case "playfromon":
            SetPlayFromEnabled(true)
        case "playfromoff":
            SetPlayFromEnabled(false)
        case "initiator":
            if parts.Length >= 2 {
                SetHsInitiator(parts[2])
            }
        case "quit":
            try {
                FileDelete(KEYS_PATH)
            }
            ExitApp
    }
}

NormalizeHsInitiator(key) {
    global HS_INITIATORS
    k := String(key)
    if StrLower(k) = "capslock" {
        k := "CapsLock"
    }
    for allowed in HS_INITIATORS {
        if k = allowed {
            return allowed
        }
    }
    return ""
}

SetHsInitiator(key) {
    global hsInitiator, hsBinds
    next := NormalizeHsInitiator(key)
    if next = "" || next = hsInitiator {
        return
    }
    StopHotstring()
    if !hsBinds.Count {
        hsInitiator := next
        return
    }
    HotIf LiveFocused
    try {
        Hotkey(hsInitiator, "Off")
    }
    try {
        Hotkey(next, "On")
        hsInitiator := next
    } catch {
        try {
            Hotkey(hsInitiator, "On")
        }
    }
    HotIf
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
    if n > 12000 {
        n := 12000
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
    global LIST_TITLE
    try {
        return InStr(WinGetProcessName("A"), "Ableton Live") > 0 && WinGetTitle("A") != LIST_TITLE
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
    global bad, playFromKey
    keysToSend := IsSet(keys) ? String(keys) : ""
    fn := IsSet(value)
        ? (*) => FireHot(bindName, keysToSend, value)
        : (*) => FireHot(bindName, keysToSend)
    if RegExMatch(keyName, "^(\\w+) \\1$", &tap) {
        RegisterDoubleTap(tap[1], fn)
        return
    }
    try {
        Hotkey(keyName, fn)
        if bindName = "playFrom" {
            playFromKey := keyName
        }
    } catch as err {
        bad.Push(keyName " (" err.Message ")")
    }
}

; "Key Key" binds fire on two clean taps of Key. A tap is dirty when any other
; key or mouse button was pressed while Key was held or between the two taps,
; so Shift used as a modifier (typing, Shift-click) never counts.
RegisterDoubleTap(key, fn) {
    global bad
    state := { last: 0, clean: false }
    try {
        Hotkey("~*" key, (*) => state.clean := InStr(A_PriorKey, key) > 0)
        Hotkey("~*" key " Up", (*) => DoubleTapUp(key, state, fn))
        InstallMouseHook
    } catch as err {
        bad.Push(key " " key " (" err.Message ")")
    }
}

DoubleTapUp(key, state, fn) {
    global DOUBLE_TAP_MS
    if !InStr(A_PriorKey, key) {
        state.last := 0
        return
    }
    if state.clean && A_TickCount - state.last < DOUBLE_TAP_MS {
        state.last := 0
        fn()
        return
    }
    state.last := A_TickCount
}

SetPlayFromEnabled(on) {
    global playFromKey
    if playFromKey = "" {
        return
    }
    HotIf LiveIdle
    try {
        Hotkey(playFromKey, on ? "On" : "Off")
    }
    HotIf
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
    global capturing, hsBuffer, hsInitiator
    if StrLower(hsInitiator) = "capslock" {
        SetCapsLockState("Off")
    }
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
            if rest = "" {
                return entry
            }
            if !RegExMatch(rest, "^\\d+$") {
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
            if rest = "" || RegExMatch(rest, "^\\d+$") {
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
            if rest = "" || RegExMatch(rest, "^\\d+$") {
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
    dpi := DllCall("User32\\GetDpiForWindow", "Ptr", hud.Hwnd, "UInt")
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
    if DllCall("ws2_32\\WSAStartup", "UShort", 0x0202, "Ptr", wsaData) {
        throw Error("WSAStartup failed")
    }
    sock := DllCall("ws2_32\\socket", "Int", 2, "Int", 2, "Int", 17, "Ptr")
    if sock = -1 || sock = 0 {
        throw Error("UDP socket failed")
    }
}

Cleanup(*) {
    global sock
    StopHotstring()
    if sock && sock != -1 {
        DllCall("ws2_32\\closesocket", "Ptr", sock)
        sock := 0
    }
    DllCall("ws2_32\\WSACleanup")
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
    NumPut("UShort", DllCall("ws2_32\\htons", "UShort", PORT, "UShort"), sockaddr, 2)
    NumPut("UInt", DllCall("ws2_32\\inet_addr", "AStr", HOST, "UInt"), sockaddr, 4)
    DllCall("ws2_32\\sendto", "Ptr", sock, "Ptr", packet, "Int", packet.Size, "Int", 0, "Ptr", sockaddr, "Int", 16,
        "Int")
}

JoinLines(arr) {
    out := ""
    for line in arr {
        out .= line "\`n"
    }
    return RTrim(out, "\`n")
}

ParseBindArray(text, arrayName) {
    entries := []
    if !RegExMatch(text, 's)"' arrayName '"\\s*:\\s*\\[(.*?)\\]', &arr) {
        return entries
    }
    section := arr[1]
    pos := 1
    while pos := RegExMatch(section, "s)\\{([^{}]+)\\}", &m, pos) {
        block := m[1]
        if !RegExMatch(block, '"key"\\s*:\\s*"([^"]+)"', &k) {
            pos := m.Pos + 1
            continue
        }
        if !RegExMatch(block, '"bind"\\s*:\\s*"([^"]+)"', &b) {
            pos := m.Pos + 1
            continue
        }
        entry := Map("key", k[1], "bind", b[1])
        if RegExMatch(block, '"value"\\s*:\\s*(-?\\d+)', &v) {
            entry["value"] := v[1] + 0
        }
        if RegExMatch(block, '"str"\\s*:\\s*true') {
            entry["str"] := true
        }
        if RegExMatch(block, '"int"\\s*:\\s*true') {
            entry["int"] := true
        }
        if RegExMatch(block, '"keys"\\s*:\\s*"([^"]+)"', &s) {
            entry["keys"] := s[1]
        }
        entries.Push(entry)
        pos := m.Pos + m.Len
    }
    return entries
}
`;

// src/engine/engine.lua
var engine_default2 = `-- KeyToMax engine for macOS (Hammerspoon). Mirrors engine.ahk.
--
-- The Max host writes bindings.json next to this file, then opens
--   hammerspoon://keytomax?path=<this file>
-- which the snippet from hammerspoon-init.lua turns into dofile(path).
--
-- Reads bindings.json in this folder and sends OSC /bind <name> [int|string]
-- to 127.0.0.1:7400 while Ableton Live is focused.

local HOST = "127.0.0.1"
local PORT = 7400
local HS_IDLE_MS = 4000
local HS_COMMIT_MS = 400
local DIR = debug.getinfo(1, "S").source:sub(2):match("^(.*)/") or "."
local CMD_PATH = DIR .. "/engine-cmd.txt"
local KEYS_PATH = DIR .. "/bindings.json"
local HS_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789=-"
local HS_INITIATORS = { ";", "/", "CapsLock" }
local DOUBLE_TAP_MS = 300
local LIVE_BUNDLE = "com.ableton.live"
local LIST_TITLE = "[Hotstrings]"
local LIST_SEARCH_X = 60
local LIST_SEARCH_Y = 31
-- engine.ahk clicks in client coordinates; Mac window frames include the title bar.
local LIST_TITLEBAR = 28
local HUD_PAD_X = 8
local HUD_PAD_Y = 5
local HUD_ROUND = 10
local HUD_ALPHA = 200
local HUD_GROW = 0.65
-- Segoe UI s18 on Windows renders at 24 px at 96 DPI.
local HUD_FONT = "HelveticaNeue-Bold"
local HUD_SIZE = 24

local KC_ESCAPE = 53
local KC_RETURN = 36
local KC_PADENTER = 76
local KC_CAPSLOCK = 57

local types = hs.eventtap.event.types

local MOD_CHARS = { ["^"] = "cmd", ["!"] = "alt", ["+"] = "shift", ["#"] = "ctrl" }
local MOD_NAMES = { "cmd", "alt", "shift", "ctrl" }
local MOD_CODES = {
    [56] = "shift", [60] = "shift",
    [59] = "ctrl", [62] = "ctrl",
    [58] = "alt", [61] = "alt",
    [55] = "cmd", [54] = "cmd",
    [63] = "fn",
}
local MODIFIER_KEYS = {
    shift = { "shift", { [56] = true, [60] = true } },
    lshift = { "shift", { [56] = true } },
    rshift = { "shift", { [60] = true } },
    ctrl = { "ctrl", { [59] = true, [62] = true } },
    control = { "ctrl", { [59] = true, [62] = true } },
    alt = { "alt", { [58] = true, [61] = true } },
    lwin = { "cmd", { [55] = true } },
    rwin = { "cmd", { [54] = true } },
}
local KEY_NAMES = {
    enter = "return",
    esc = "escape",
    backspace = "delete",
    del = "forwarddelete",
    delete = "forwarddelete",
    pgup = "pageup",
    pgdn = "pagedown",
    numpadenter = "padenter",
}

local M = {}

local stopped = false
local suspended = false
local hsBinds = {}
local hsTriggers = {}
local hsCount = 0
local hsBuffer = ""
local capturing = false
local hsInitiator = ";"
local hudEnabled = true
local playFromHotkey = nil
local hotkeys = {}
local doubleTaps = {}
local bad = {}
local capsMuteUntil = 0

local sock = nil
local tap = nil
local menu = nil
local hud = nil
local hudMinW = 0
local hudMinH = 0
local idleTimer = nil
local cmdTimer = nil
local listTimer = nil
local watcher = nil
local liveApp = nil
local listWinId = nil
local listActive = false

local function now()
    return hs.timer.secondsSinceEpoch()
end

local function trim(s)
    return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function readFile(path)
    local f = io.open(path, "rb")
    if not f then
        return nil
    end
    local text = f:read("a")
    f:close()
    return (text:gsub("^\\239\\187\\191", ""))
end

local function fileExists(path)
    local f = io.open(path, "rb")
    if f then
        f:close()
        return true
    end
    return false
end

local function alert(msg)
    hs.dialog.blockAlert("KeyToMax", msg)
end

local function lines(text)
    local out = {}
    for line in (text .. "\\n"):gmatch("([^\\n]*)\\n") do
        out[#out + 1] = (line:gsub("\\r$", ""))
    end
    return out
end

-- Focus

local function liveFocused()
    local app = hs.application.frontmostApplication()
    local bundle = app and app:bundleID()
    if not bundle or bundle:sub(1, #LIVE_BUNDLE) ~= LIVE_BUNDLE then
        return false
    end
    local win = hs.window.focusedWindow()
    return not win or win:title() ~= LIST_TITLE
end

local function liveIdle()
    return not capturing and liveFocused()
end

local function findLiveApp()
    local app = hs.application.frontmostApplication()
    local bundle = app and app:bundleID()
    if bundle and bundle:sub(1, #LIVE_BUNDLE) == LIVE_BUNDLE then
        liveApp = app
    elseif liveApp and not liveApp:isRunning() then
        liveApp = nil
    end
    return liveApp
end

-- OSC

local function oscString(s)
    s = s .. "\\0"
    return s .. string.rep("\\0", (4 - #s % 4) % 4)
end

local function toInt(v)
    local n = math.floor(tonumber(v) or 0)
    return math.max(-2147483648, math.min(2147483647, n))
end

local function sendOsc(address, strArg, extra)
    if not sock then
        return
    end
    local packet
    if extra == nil then
        packet = oscString(address) .. oscString(",s") .. oscString(strArg)
    elseif type(extra) == "number" then
        packet = oscString(address) .. oscString(",si") .. oscString(strArg) .. string.pack(">i4", toInt(extra))
    else
        packet = oscString(address) .. oscString(",ss") .. oscString(strArg) .. oscString(tostring(extra))
    end
    sock:send(packet, HOST, PORT)
end

local function sendBind(name, extra)
    sendOsc("/bind", tostring(name), extra)
end

-- HUD

local function hudMeasure(text)
    local size = hs.drawing.getTextDrawingSize(text, { font = HUD_FONT, size = HUD_SIZE })
    return size.w, size.h
end

local function initHud()
    hud = hs.canvas.new({ x = 0, y = 0, w = 10, h = 10 })
    hud:level(hs.canvas.windowLevels.overlay)
    hud:behaviorAsLabels({ "canJoinAllSpaces", "stationary" })
    hud:clickActivating(false)
    hud:alpha(HUD_ALPHA / 255)
    hud[1] = {
        type = "rectangle",
        action = "fill",
        fillColor = { hex = "#0C1217" },
        roundedRectRadii = { xRadius = HUD_ROUND, yRadius = HUD_ROUND },
    }
    hud[2] = {
        type = "text",
        text = "",
        textFont = HUD_FONT,
        textSize = HUD_SIZE,
        textColor = { hex = "#FF9000" },
        textAlignment = "center",
    }
    local w, h = hudMeasure("www")
    hudMinW = w + HUD_PAD_X * 2
    hudMinH = h + HUD_PAD_Y * 2
end

local function hudPos(w, h)
    local win = hs.window.focusedWindow()
    local f = win and win:frame()
    if not f then
        f = hs.screen.mainScreen():frame()
    end
    return math.floor(f.x + (f.w - w) / 2), math.floor(f.y + (f.h - h) / 2)
end

local function hudPaint(text)
    if not hud or not hudEnabled then
        return
    end
    local w = hudMinW
    local h = hudMinH
    if #text > 3 then
        local extra = hudMeasure(text) + HUD_PAD_X * 2 - hudMinW
        if extra > 0 then
            w = hudMinW + math.floor(extra * HUD_GROW)
        end
    end
    local _, th = hudMeasure(text ~= "" and text or "w")
    local x, y = hudPos(w, h)
    hud:frame({ x = x, y = y, w = w, h = h })
    hud[2].text = text
    hud[2].frame = { x = 0, y = (h - th) / 2, w = w, h = th }
    hud:show()
end

local function hudShow()
    if not hudEnabled then
        return
    end
    hudPaint(hsBuffer)
end

local function hudUpdate(text)
    hudPaint(text)
end

local function hudHide()
    if not hud then
        return
    end
    hud[2].text = ""
    hud:hide()
end

local function setHudEnabled(on)
    hudEnabled = on
    if not hudEnabled then
        hudHide()
        return
    end
    if capturing then
        hudShow()
    end
end

-- Tray

local function updateTip()
    if not menu then
        return
    end
    menu:setTooltip(suspended and "KeyToMax paused" or "KeyToMax")
    menu:setTitle(suspended and "KTM paused" or "KTM")
end

-- Hotstrings

local function setIdleTimer(ms, fn)
    if idleTimer then
        idleTimer:stop()
    end
    idleTimer = hs.timer.doAfter(ms / 1000, fn)
end

local function stopHotstring()
    hudHide()
    capturing = false
    hsBuffer = ""
    if idleTimer then
        idleTimer:stop()
        idleTimer = nil
    end
end

local function matchHs(buf)
    local exact = hsBinds[buf]
    if exact and not exact.int then
        return exact
    end
    for _, trigger in ipairs(hsTriggers) do
        local entry = hsBinds[trigger]
        local tlen = #trigger
        if tlen > 0 and buf:sub(1, tlen) == trigger then
            local rest = buf:sub(tlen + 1)
            if entry.int then
                if rest == "" then
                    return entry
                end
                if rest:match("^%d+$") then
                    return { bind = entry.bind, intArg = toInt(rest) }
                end
            elseif entry.str and rest ~= "" and rest:match("^[a-z0-9]+$") then
                return { bind = entry.bind, strArg = rest }
            end
        end
    end
    return nil
end

local function suffixOpen(buf)
    for _, trigger in ipairs(hsTriggers) do
        local entry = hsBinds[trigger]
        local tlen = #trigger
        if tlen > 0 and buf:sub(1, tlen) == trigger then
            local rest = buf:sub(tlen + 1)
            if entry.int then
                if rest == "" or rest:match("^%d+$") then
                    return true
                end
            elseif entry.str then
                if rest == "" or rest:match("^[a-z0-9]+$") then
                    return true
                end
            end
        end
    end
    return false
end

local function isHsPrefix(buf)
    local n = #buf
    for _, trigger in ipairs(hsTriggers) do
        local entry = hsBinds[trigger]
        if trigger:sub(1, n) == buf then
            return true
        end
        local tlen = #trigger
        if tlen > 0 and buf:sub(1, tlen) == trigger then
            local rest = buf:sub(tlen + 1)
            if entry.int then
                if rest == "" or rest:match("^%d+$") then
                    return true
                end
            elseif entry.str then
                if rest == "" or rest:match("^[a-z0-9]+$") then
                    return true
                end
            end
        end
    end
    return false
end

local function hasLongerHs(buf)
    local n = #buf
    for _, trigger in ipairs(hsTriggers) do
        if #trigger > n and trigger:sub(1, n) == buf then
            return true
        end
    end
    return false
end

local function fireHs()
    local match = matchHs(hsBuffer)
    stopHotstring()
    if not match then
        return
    end
    if match.strArg ~= nil then
        sendBind(match.bind, tostring(match.strArg))
    elseif match.intArg ~= nil then
        sendBind(match.bind, toInt(match.intArg))
    elseif match.value ~= nil then
        sendBind(match.bind, match.value)
    else
        sendBind(match.bind)
    end
end

local function hsIdle()
    if matchHs(hsBuffer) then
        fireHs()
        return
    end
    stopHotstring()
end

local function hsCommit()
    if matchHs(hsBuffer) then
        fireHs()
    end
end

local function hsOnChar(char)
    hsBuffer = hsBuffer .. char:lower()
    if matchHs(hsBuffer) then
        if hasLongerHs(hsBuffer) or suffixOpen(hsBuffer) then
            setIdleTimer(HS_COMMIT_MS, hsIdle)
            hudUpdate(hsBuffer)
            return
        end
        fireHs()
        return
    end
    if not isHsPrefix(hsBuffer) then
        stopHotstring()
        return
    end
    setIdleTimer(HS_IDLE_MS, hsIdle)
    hudUpdate(hsBuffer)
end

local function beginHotstring()
    if hsInitiator == "CapsLock" then
        capsMuteUntil = now() + 0.2
        hs.hid.capslock.set(false)
    end
    capturing = true
    hsBuffer = ""
    hudShow()
    setIdleTimer(HS_IDLE_MS, hsIdle)
end

local function registerHotstring(trigger, bindName, value, hasStr, hasInt)
    local t = tostring(trigger):lower()
    if t == "" then
        return
    end
    local entry = { bind = tostring(bindName) }
    if value ~= nil then
        entry.value = value
    end
    if hasStr then
        entry.str = true
    end
    if hasInt then
        entry.int = true
    end
    if not hsBinds[t] then
        hsTriggers[#hsTriggers + 1] = t
        hsCount = hsCount + 1
    end
    hsBinds[t] = entry
end

-- Hotkeys

local function parseHotkey(spec)
    local mods = {}
    local i = 1
    while i < #spec and MOD_CHARS[spec:sub(i, i)] do
        mods[MOD_CHARS[spec:sub(i, i)]] = true
        i = i + 1
    end
    local name = spec:sub(i):lower()
    name = KEY_NAMES[name] or name
    local code = hs.keycodes.map[name]
    if not code then
        return nil
    end
    return { code = code, name = name, mods = mods }
end

local function modsList(mods)
    local out = {}
    for _, m in ipairs(MOD_NAMES) do
        if mods[m] then
            out[#out + 1] = m
        end
    end
    return out
end

local function modsEqual(flags, mods)
    for _, m in ipairs(MOD_NAMES) do
        if (flags[m] and true or false) ~= (mods[m] and true or false) then
            return false
        end
    end
    return true
end

local function noMods(flags)
    return not (flags.cmd or flags.alt or flags.shift or flags.ctrl)
end

local function fireHot(bindName, keys, value)
    local send = function()
        sendBind(bindName, value)
    end
    if not keys then
        send()
        return
    end
    hs.timer.doAfter(0, function()
        hs.eventtap.keyStroke(modsList(keys.mods), keys.name, 20000)
        hs.timer.doAfter(0.1, send)
    end)
end

local function registerDoubleTap(key, fn)
    local lower = key:lower()
    local mod = MODIFIER_KEYS[lower]
    local entry = { last = 0, clean = false, held = false, fn = fn }
    if mod then
        entry.mod = mod[1]
        entry.codes = mod[2]
    else
        local name = KEY_NAMES[lower] or lower
        local code = hs.keycodes.map[name]
        if not code then
            bad[#bad + 1] = key .. " " .. key .. " (invalid key)"
            return
        end
        entry.codes = { [code] = true }
    end
    doubleTaps[#doubleTaps + 1] = entry
end

local function registerHot(keyName, bindName, value, keysToSend)
    local keys = nil
    if keysToSend and keysToSend ~= "" then
        keys = parseHotkey(keysToSend)
        if not keys then
            bad[#bad + 1] = keyName .. " (invalid keys " .. keysToSend .. ")"
            return
        end
    end
    local fn = function()
        fireHot(bindName, keys, value)
    end
    local a, b = keyName:match("^(%w+) (%w+)$")
    if a and a == b then
        registerDoubleTap(a, fn)
        return
    end
    local hk = parseHotkey(keyName)
    if not hk then
        bad[#bad + 1] = keyName .. " (invalid key)"
        return
    end
    hk.fn = fn
    hk.enabled = true
    hotkeys[#hotkeys + 1] = hk
    if bindName == "playFrom" then
        playFromHotkey = hk
    end
end

local function setPlayFromEnabled(on)
    if playFromHotkey then
        playFromHotkey.enabled = on
    end
end

-- Double taps: a tap is dirty when any other key or mouse button was pressed
-- while the key was held or between the two taps.

local function dirtyTaps(except)
    for _, dt in ipairs(doubleTaps) do
        if dt ~= except then
            dt.clean = false
            dt.last = 0
        end
    end
end

local function tapDown(dt)
    if dt.held then
        return
    end
    dt.held = true
    dt.clean = true
end

local function tapUp(dt)
    dt.held = false
    if not dt.clean then
        dt.last = 0
        return
    end
    local t = now()
    if dt.last > 0 and (t - dt.last) * 1000 < DOUBLE_TAP_MS then
        dt.last = 0
        if liveIdle() then
            dt.fn()
        end
        return
    end
    dt.last = t
end

-- Event tap

local function onKeyDown(e)
    local code = e:getKeyCode()
    local own = nil
    for _, dt in ipairs(doubleTaps) do
        if not dt.mod and dt.codes[code] then
            own = dt
            tapDown(dt)
        end
    end
    dirtyTaps(own)

    if not liveFocused() then
        return false
    end
    local flags = e:getFlags()
    local plain = noMods(flags)
    local char = plain and (e:getCharacters(true) or ""):lower() or ""

    if capturing and plain then
        if code == KC_ESCAPE then
            stopHotstring()
            return true
        end
        if code == KC_RETURN or code == KC_PADENTER then
            hsCommit()
            return true
        end
        if #char == 1 and HS_CHARS:find(char, 1, true) then
            hsOnChar(char)
            return true
        end
    end

    if hsCount > 0 and plain and hsInitiator ~= "CapsLock" and char == hsInitiator then
        beginHotstring()
        return true
    end

    if not capturing then
        for _, hk in ipairs(hotkeys) do
            if hk.enabled and hk.code == code and modsEqual(flags, hk.mods) then
                hk.fn()
                return true
            end
        end
    end
    return false
end

local function onKeyUp(e)
    local code = e:getKeyCode()
    for _, dt in ipairs(doubleTaps) do
        if not dt.mod and dt.codes[code] then
            tapUp(dt)
        end
    end
    return false
end

local function onFlags(e)
    local code = e:getKeyCode()
    local flags = e:getFlags()
    if code == KC_CAPSLOCK then
        if now() < capsMuteUntil then
            return false
        end
        dirtyTaps(nil)
        if hsCount > 0 and hsInitiator == "CapsLock" and liveFocused() then
            beginHotstring()
        end
        return false
    end
    local own = nil
    for _, dt in ipairs(doubleTaps) do
        if dt.mod and dt.codes[code] then
            own = dt
            if flags[dt.mod] then
                tapDown(dt)
            else
                tapUp(dt)
            end
        end
    end
    local name = MOD_CODES[code]
    if name and flags[name] then
        dirtyTaps(own)
    end
    return false
end

local function onEvent(e)
    if suspended or stopped then
        return false
    end
    local t = e:getType()
    if t == types.keyDown then
        return onKeyDown(e)
    end
    if t == types.keyUp then
        return onKeyUp(e)
    end
    if t == types.flagsChanged then
        return onFlags(e)
    end
    dirtyTaps(nil)
    return false
end

-- List window: the list's jweb only takes keyboard input after a click inside
-- it, even when its window is active, so click the search box on activation.

local function listWindow()
    local app = findLiveApp()
    if not app then
        return nil
    end
    for _, win in ipairs(app:allWindows()) do
        if win:title() == LIST_TITLE then
            return win
        end
    end
    return nil
end

local function focusListSearch(win)
    local f = win:frame()
    local old = hs.mouse.absolutePosition()
    hs.eventtap.leftClick({ x = f.x + LIST_SEARCH_X, y = f.y + LIST_TITLEBAR + LIST_SEARCH_Y }, 20000)
    hs.mouse.absolutePosition(old)
end

local function watchList()
    local ok, win = pcall(listWindow)
    if not ok or not win then
        listWinId = nil
        listActive = false
        return
    end
    local id = win:id()
    if id ~= listWinId then
        listWinId = id
        listActive = false
        pcall(function()
            win:focus()
        end)
    end
    local focused = hs.window.focusedWindow()
    local active = focused ~= nil and focused:id() == id
    if active and not listActive then
        pcall(focusListSearch, win)
    end
    listActive = active
end

-- Commands

local function setHsIdle(ms)
    local n = tonumber(ms)
    if not n then
        return
    end
    n = math.floor(n)
    if n < 200 then
        n = 200
    end
    if n > 12000 then
        n = 12000
    end
    HS_IDLE_MS = n
    local commit = math.floor(n * 0.2)
    if commit < 50 then
        commit = 50
    end
    HS_COMMIT_MS = commit
    if capturing then
        setIdleTimer(HS_IDLE_MS, hsIdle)
    end
end

local function normalizeHsInitiator(key)
    local k = tostring(key)
    if k:lower() == "capslock" then
        k = "CapsLock"
    end
    for _, allowed in ipairs(HS_INITIATORS) do
        if k == allowed then
            return allowed
        end
    end
    return nil
end

local function setHsInitiator(key)
    local nextKey = normalizeHsInitiator(key)
    if not nextKey or nextKey == hsInitiator then
        return
    end
    stopHotstring()
    hsInitiator = nextKey
end

local function setSuspended(on)
    suspended = on
    if suspended then
        stopHotstring()
    end
end

local function applyCmd(cmd)
    if cmd == "" then
        return
    end
    local parts = {}
    for part in cmd:gmatch("%S+") do
        parts[#parts + 1] = part
    end
    local name = parts[1]
    if name == "idle" then
        if parts[2] then
            setHsIdle(parts[2])
        end
    elseif name == "suspend" then
        setSuspended(true)
    elseif name == "resume" then
        setSuspended(false)
    elseif name == "toggle" then
        setSuspended(not suspended)
    elseif name == "hudon" then
        setHudEnabled(true)
    elseif name == "hudoff" then
        setHudEnabled(false)
    elseif name == "playfromon" then
        setPlayFromEnabled(true)
    elseif name == "playfromoff" then
        setPlayFromEnabled(false)
    elseif name == "initiator" then
        if parts[2] then
            setHsInitiator(parts[2])
        end
    elseif name == "quit" then
        os.remove(KEYS_PATH)
        M.stop()
    end
end

local function watchCmd()
    if stopped then
        return
    end
    if capturing and not liveFocused() then
        stopHotstring()
    end
    if tap and not tap:isEnabled() then
        tap:start()
    end
    local text = readFile(CMD_PATH)
    if not text then
        return
    end
    os.remove(CMD_PATH)
    for _, line in ipairs(lines(text)) do
        if stopped then
            return
        end
        applyCmd(trim(line))
    end
    updateTip()
end

-- Lifecycle

function M.stop()
    if stopped then
        return
    end
    stopped = true
    stopHotstring()
    for _, t in ipairs({ tap, cmdTimer, listTimer, watcher }) do
        pcall(function()
            t:stop()
        end)
    end
    tap, cmdTimer, listTimer, watcher = nil, nil, nil, nil
    if hud then
        hud:delete()
        hud = nil
    end
    if menu then
        menu:delete()
        menu = nil
    end
    if sock then
        sock:close()
        sock = nil
    end
end

local function stub()
    stopped = true
    return M
end

local doQuit = false
if fileExists(CMD_PATH) then
    local cmd = trim(lines(readFile(CMD_PATH) or "")[1] or "")
    if cmd == "quit" then
        os.remove(CMD_PATH)
        doQuit = true
    elseif cmd == "" then
        os.remove(CMD_PATH)
    end
end

if doQuit then
    os.remove(KEYS_PATH)
    return stub()
end

local keysText = readFile(KEYS_PATH)
if not keysText then
    alert("No bindings.json in:\\n" .. DIR)
    return stub()
end

local ok, data = pcall(hs.json.decode, keysText)
if not ok or type(data) ~= "table" then
    alert("Could not parse bindings.json:\\n" .. KEYS_PATH .. "\\n" .. tostring(data))
    return stub()
end

local hotkeyList = type(data.hotkeys) == "table" and data.hotkeys or {}
local hotstringList = type(data.hotstrings) == "table" and data.hotstrings or {}
if #hotkeyList == 0 and #hotstringList == 0 then
    alert("bindings.json needs a non-empty hotkeys or hotstrings array.\\n" .. KEYS_PATH)
    return stub()
end

sock = hs.socket.udp.new()
menu = hs.menubar.new()
if menu then
    menu:setMenu(function()
        return {
            {
                title = suspended and "Resume" or "Pause",
                fn = function()
                    setSuspended(not suspended)
                    updateTip()
                end,
            },
        }
    end)
end
updateTip()
if not pcall(initHud) then
    if hud then
        hud:delete()
    end
    hud = nil
end

for _, entry in ipairs(hotstringList) do
    if type(entry) == "table" and entry.key ~= nil and entry.bind ~= nil then
        registerHotstring(entry.key, entry.bind, entry.value, entry.str == true, entry.int == true)
    end
end
table.sort(hsTriggers)

for _, entry in ipairs(hotkeyList) do
    if type(entry) == "table" and entry.key ~= nil and entry.bind ~= nil then
        local keys = entry.keys ~= nil and tostring(entry.keys) or ""
        registerHot(tostring(entry.key), tostring(entry.bind), entry.value, keys)
    end
end

if #bad > 0 then
    alert("Skipped invalid binds:\\n" .. table.concat(bad, "\\n"))
end

tap = hs.eventtap.new({
    types.keyDown,
    types.keyUp,
    types.flagsChanged,
    types.leftMouseDown,
    types.rightMouseDown,
    types.otherMouseDown,
}, onEvent)
tap:start()

cmdTimer = hs.timer.doEvery(0.15, watchCmd)
listTimer = hs.timer.doEvery(0.1, watchList)
watcher = hs.pathwatcher.new(DIR, watchCmd)
watcher:start()

return M
`;

// src/engine/hammerspoon-init.lua
var hammerspoon_init_default = '-- KeyToMax hook\n-- The Hotstrings device adds this to ~/.hammerspoon/init.lua, writes the\n-- engine path to keytomax-engine.txt, and opens\n-- hammerspoon://keytomax?path=<engine.lua> to load the engine.\nhs.urlevent.bind("keytomax", function(_, params)\n    if KeyToMax then\n        KeyToMax.stop()\n    end\n    KeyToMax = dofile(params.path)\nend)\ndo\n    local f = io.open(hs.configdir .. "/keytomax-engine.txt", "r")\n    local path = f and f:read("l")\n    if f then\n        f:close()\n    end\n    local dir = path and path:match("^(.*)/")\n    if dir and hs.fs.attributes(path) and hs.fs.attributes(dir .. "/bindings.json") then\n        KeyToMax = dofile(path)\n    end\nend\n';

// node_modules/.cache/hotstrings/hotstrings.html
var hotstrings_default = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>Hotstrings</title>\n    <style>\n      :root {\n        --bg: rgb(28, 27, 26);\n        --text: rgb(242, 237, 230);\n        --subtle: rgb(153, 145, 135);\n        --faint: rgb(105, 97, 89);\n        --accent-rgb: 242, 143, 46;\n        --accent: rgb(var(--accent-rgb));\n        --accent-text: rgb(255, 194, 128);\n        --top: 62px;\n      }\n\n      * {\n        box-sizing: border-box;\n      }\n\n      html,\n      body {\n        height: 100%;\n        margin: 0;\n        overflow: hidden;\n        background: var(--bg);\n        color: var(--text);\n        font-family: \'Segoe UI\', \'Helvetica Neue\', sans-serif;\n        font-size: 13px;\n        user-select: none;\n        cursor: default;\n      }\n\n      header {\n        position: absolute;\n        inset: 0 0 auto;\n        z-index: 2;\n        height: var(--top);\n        background: var(--bg);\n      }\n\n      header::after {\n        content: \'\';\n        position: absolute;\n        inset: auto 0 0;\n        height: 1px;\n        background: linear-gradient(\n          90deg,\n          rgba(var(--accent-rgb), 0.7),\n          rgba(var(--accent-rgb), 0.05)\n        );\n      }\n\n      .field {\n        position: absolute;\n        top: 14px;\n        left: 10px;\n        right: 18px;\n        height: 34px;\n        display: flex;\n        align-items: center;\n        padding-right: 10px;\n        border: 1px solid rgba(255, 255, 255, 0.1);\n        border-radius: 9px;\n        background: rgba(255, 255, 255, 0.06);\n      }\n\n      .field.active {\n        border-color: rgba(var(--accent-rgb), 0.55);\n      }\n\n      .icon {\n        position: absolute;\n        left: 9px;\n        top: 8px;\n        width: 16px;\n        height: 16px;\n        fill: none;\n        stroke: var(--subtle);\n        stroke-width: 1.6;\n      }\n\n      .field.active .icon {\n        stroke: var(--accent);\n      }\n\n      .field input {\n        flex: 1;\n        min-width: 0;\n        height: 100%;\n        margin: 0 12px 0 33px;\n        padding: 0;\n        border: 0;\n        outline: none;\n        background: transparent;\n        color: var(--text);\n        font: inherit;\n        caret-color: var(--accent);\n      }\n\n      .field input::placeholder {\n        color: var(--faint);\n      }\n\n      .count {\n        color: var(--faint);\n        font-size: 11px;\n        white-space: nowrap;\n      }\n\n      .clear {\n        display: none;\n        width: 16px;\n        height: 16px;\n        margin-left: 8px;\n        padding: 0;\n        border: 0;\n        border-radius: 50%;\n        background: rgba(255, 255, 255, 0.1);\n      }\n\n      .field.active .clear {\n        display: block;\n      }\n\n      .clear svg {\n        display: block;\n        width: 16px;\n        height: 16px;\n        stroke: rgba(242, 237, 230, 0.8);\n        stroke-width: 1.4;\n      }\n\n      .fade {\n        position: absolute;\n        top: var(--top);\n        left: 0;\n        right: 0;\n        z-index: 1;\n        height: 12px;\n        background: linear-gradient(var(--bg), rgba(28, 27, 26, 0));\n        pointer-events: none;\n        opacity: 0;\n      }\n\n      .fade.on {\n        opacity: 1;\n      }\n\n      main {\n        position: absolute;\n        inset: var(--top) 0 0;\n        overflow-y: scroll;\n        padding: 0 2px 10px 10px;\n      }\n\n      main::-webkit-scrollbar {\n        width: 16px;\n      }\n\n      main::-webkit-scrollbar-track {\n        margin: 4px 0;\n        background: transparent;\n      }\n\n      main::-webkit-scrollbar-thumb {\n        min-height: 28px;\n        border: 4px solid transparent;\n        border-radius: 8px;\n        background: rgba(var(--accent-rgb), 0.5) padding-box;\n      }\n\n      main::-webkit-scrollbar-thumb:active {\n        background-color: rgba(var(--accent-rgb), 0.9);\n      }\n\n      .group {\n        display: flex;\n        align-items: flex-end;\n        justify-content: space-between;\n        height: 34px;\n        padding: 0 10px 6px;\n        color: var(--accent-text);\n        font-size: 11px;\n        font-weight: 600;\n      }\n\n      .group span {\n        color: var(--faint);\n        font-weight: 400;\n      }\n\n      .item {\n        display: flex;\n        align-items: center;\n        height: 30px;\n        margin: 1px 0;\n        padding: 0 10px;\n        border-radius: 7px;\n      }\n\n      .item:not(.action) {\n        opacity: 0.6;\n      }\n\n      .item.action:hover,\n      .item.selected {\n        background: rgba(var(--accent-rgb), 0.12);\n      }\n\n      .desc {\n        flex: 1;\n        min-width: 0;\n        overflow: hidden;\n        text-overflow: ellipsis;\n        white-space: nowrap;\n      }\n\n      mark {\n        margin: 0 -1px;\n        padding: 2px 1px;\n        border-radius: 3px;\n        background: rgba(var(--accent-rgb), 0.2);\n        color: var(--accent-text);\n      }\n\n      .keys {\n        display: flex;\n        gap: 4px;\n        margin-left: 16px;\n      }\n\n      kbd {\n        min-width: 20px;\n        height: 20px;\n        padding: 0 7px;\n        border-radius: 5px;\n        background: rgba(255, 255, 255, 0.07);\n        color: var(--subtle);\n        font-family: inherit;\n        font-size: 11px;\n        font-weight: 600;\n        line-height: 20px;\n        text-align: center;\n      }\n\n      .item.match kbd {\n        background: rgba(var(--accent-rgb), 0.18);\n        color: var(--accent-text);\n      }\n\n      .item.action:hover kbd,\n      .item.selected kbd {\n        background: rgba(var(--accent-rgb), 0.32);\n        color: var(--accent-text);\n      }\n\n      .empty {\n        padding-top: 30px;\n        text-align: center;\n        color: var(--subtle);\n      }\n\n      .empty small {\n        display: block;\n        margin-top: 6px;\n        color: var(--faint);\n        font-size: 11px;\n      }\n    </style>\n  </head>\n  <body>\n    <header>\n      <label class="field" id="field">\n        <svg class="icon" viewBox="0 0 16 16">\n          <circle cx="7" cy="7" r="5" />\n          <path d="M10.6 10.6 14 14" />\n        </svg>\n        <input id="search" placeholder="Search hotstrings" spellcheck="false" autocomplete="off" />\n        <span class="count" id="count"></span>\n        <button class="clear" id="clear" tabindex="-1" aria-label="Clear search">\n          <svg viewBox="0 0 16 16"><path d="M5 5l6 6M11 5l-6 6" /></svg>\n        </button>\n      </label>\n    </header>\n    <div class="fade" id="fade"></div>\n    <main id="list"></main>\n    <script>\n"use strict";\n(() => {\n  // src/constants.ts\n  var FIXED_CHORDS = {\n    major: [0, 4, 7],\n    minor: [0, 3, 7],\n    sus2: [0, 2, 7],\n    sus4: [0, 5, 7],\n    aug: [0, 4, 8],\n    dim: [0, 3, 6],\n    pow: [0, 7],\n    major7: [0, 4, 7, 11],\n    minor7: [0, 3, 7, 10],\n    dim7: [0, 3, 6, 9],\n    aug7: [0, 4, 8, 10],\n    major9: [0, 4, 7, 11, 14],\n    minor9: [0, 3, 7, 10, 14],\n    dim9: [0, 3, 6, 9, 14],\n    aug9: [0, 4, 8, 10, 14],\n    major11: [0, 4, 7, 11, 14, 17],\n    minor11: [0, 3, 7, 10, 14, 17],\n    major13: [0, 4, 7, 11, 14, 17, 21],\n    minor13: [0, 3, 7, 10, 14, 17, 21]\n  };\n  var MAJOR_FAMILY = {\n    3: FIXED_CHORDS.major,\n    4: FIXED_CHORDS.major7,\n    5: FIXED_CHORDS.major9,\n    6: FIXED_CHORDS.major11,\n    7: FIXED_CHORDS.major13\n  };\n  var NATIVE_DEVICES = {\n    ana: "Analog",\n    colis: "Collision",\n    dri: "Drift",\n    drumr: "Drum Rack",\n    elec: "Electric",\n    exti: "External Instrument",\n    imp: "Impulse",\n    irack: "Instrument Rack",\n    meld: "Meld",\n    op: "Operator",\n    samp: "Sampler",\n    simp: "Simpler",\n    ten: "Tension",\n    wav: "Wavetable",\n    amp: "Amp",\n    arack: "Audio Effect Rack",\n    af: "Auto Filter",\n    apan: "Auto Pan-Tremolo",\n    ash: "Auto Shift",\n    beat: "Beat Repeat",\n    cab: "Cabinet",\n    cheq: "Channel EQ",\n    ens: "Chorus-Ensemble",\n    comp: "Compressor",\n    corp: "Corpus",\n    del: "Delay",\n    drumb: "Drum Buss",\n    tube: "Dynamic Tube",\n    echo: "Echo",\n    eq8: "EQ Eight",\n    eq3: "EQ Three",\n    eros: "Erosion",\n    exta: "External Audio Effect",\n    fdel: "Filter Delay",\n    gate: "Gate",\n    glue: "Glue Compressor",\n    grain: "Grain Delay",\n    hyb: "Hybrid Reverb",\n    lim: "Limiter",\n    loop: "Looper",\n    mbd: "Multiband Dynamics",\n    od: "Overdrive",\n    ped: "Pedal",\n    phas: "Phaser-Flanger",\n    red: "Redux",\n    reso: "Resonators",\n    verb: "Reverb",\n    roar: "Roar",\n    sat: "Saturator",\n    shif: "Shifter",\n    sres: "Spectral Resonator",\n    stime: "Spectral Time",\n    spec: "Spectrum",\n    tun: "Tuner",\n    ut: "Utility",\n    vin: "Vinyl Distortion",\n    voc: "Vocoder",\n    arp: "Arpeggiator",\n    cc: "CC Control",\n    chordmidi: "Chord",\n    mrack: "MIDI Effect Rack",\n    nlen: "Note Length",\n    pit: "Pitch",\n    rand: "Random",\n    sca: "Scale",\n    vel: "Velocity"\n  };\n\n  // src/bindings.ts\n  var BINDINGS = {\n    hotkeys: [\n      { key: "`", bind: "cliploop", keys: "^j" },\n      { key: "^Space", bind: "playFrom" },\n      { key: "^!Left", bind: "chainLeft" },\n      { key: "^!Right", bind: "chainRight" },\n      { key: "Shift Shift", bind: "openList" }\n    ],\n    hotstrings: [\n      { key: "chord", bind: "chord" },\n      { key: "chord7", bind: "chord7" },\n      { key: "chord9", bind: "chord9" },\n      { key: "chord11", bind: "chord11" },\n      { key: "chord13", bind: "chord13" },\n      { key: "bass1", bind: "bass1" },\n      { key: "bass2", bind: "bass2" },\n      { key: "bass3", bind: "bass3" },\n      { key: "bass4", bind: "bass4" },\n      { key: "bass5", bind: "bass5" },\n      { key: "bass6", bind: "bass6" },\n      ...Object.keys(FIXED_CHORDS).map((key) => ({ key, bind: key })),\n      { key: "lead", bind: "lead" },\n      { key: "up", bind: "up" },\n      { key: "down", bind: "down" },\n      { key: "dearp", bind: "dearp" },\n      { key: "doub", bind: "doub" },\n      { key: "half", bind: "half" },\n      { key: "fit", bind: "fit" },\n      { key: "inv", bind: "inv" },\n      { key: "rev", bind: "rev" },\n      { key: "first", bind: "first" },\n      { key: "last", bind: "last" },\n      { key: "col", bind: "col" },\n      { key: "exp", bind: "exp" },\n      { key: "sol", bind: "sol" },\n      { key: "unsol", bind: "unsol" },\n      { key: "loc", bind: "loc", str: true },\n      { key: "clip", bind: "clip", int: true },\n      { key: "=", bind: "volup", int: true },\n      { key: "-", bind: "voldown", int: true },\n      { key: "headroom", bind: "headroom" },\n      { key: "heat", bind: "heat" },\n      { key: "low", bind: "low" },\n      { key: "high", bind: "high" },\n      { key: "notch", bind: "notch" },\n      { key: "band", bind: "band" },\n      { key: "eq", bind: "eq8" },\n      ...Object.keys(NATIVE_DEVICES).map((key) => ({ key, bind: key }))\n    ]\n  };\n\n  // src/hotstringCatalog.ts\n  var HOTKEY_DESC = {\n    "`": "Loop the open clip",\n    "^Space": "Play or stop from the start marker",\n    "^!Left": "Nudge the selected device left",\n    "^!Right": "Nudge the selected device right",\n    "Shift Shift": "Open this list"\n  };\n  var HOTSTRING_DESC = {\n    chord: "Diatonic triad from the clip scale",\n    chord7: "Diatonic 7th from the clip scale",\n    chord9: "Diatonic 9th from the clip scale",\n    chord11: "Diatonic 11th from the clip scale",\n    chord13: "Diatonic 13th from the clip scale",\n    bass1: "Bass on each beat",\n    bass2: "Eighth-note bass",\n    bass3: "Triplet bass",\n    bass4: "Offbeat 16th bass",\n    bass5: "Syncopated bass pattern",\n    bass6: "Second syncopated bass pattern",\n    lead: "Voice-lead selected chords",\n    up: "Arpeggiate selection up",\n    down: "Arpeggiate selection down",\n    dearp: "Collapse an arp into block chords",\n    doub: "Double selected note lengths",\n    half: "Halve selected note lengths",\n    fit: "Fit selected notes to the clip",\n    inv: "Invert selected notes",\n    rev: "Reverse selected notes",\n    first: "Select the first chain",\n    last: "Select the last chain",\n    col: "Collapse devices in the chain",\n    exp: "Expand devices in the chain",\n    sol: "Solo the selected effect",\n    unsol: "Unsolo chain effects",\n    loc: "Drop a locator, loc name to label it",\n    clip: "New MIDI clip, clip n for n bars",\n    "=": "Raise track volume, = n for track n",\n    "-": "Lower track volume, - n for track n",\n    headroom: "Drop volume on all regular tracks",\n    heat: "Raise volume on all regular tracks",\n    low: "EQ Eight lowpass",\n    high: "EQ Eight highpass",\n    notch: "EQ Eight notch",\n    band: "EQ Eight bandpass",\n    eq: "EQ Eight"\n  };\n  var INSTRUMENT_KEYS = [\n    "ana",\n    "colis",\n    "dri",\n    "drumr",\n    "elec",\n    "exti",\n    "imp",\n    "irack",\n    "meld",\n    "op",\n    "samp",\n    "simp",\n    "ten",\n    "wav"\n  ];\n  var MIDI_KEYS = ["arp", "cc", "chordmidi", "mrack", "nlen", "pit", "rand", "sca", "vel"];\n  var CHORD_KEYS = [\n    "chord",\n    "chord7",\n    "chord9",\n    "chord11",\n    "chord13",\n    ...Object.keys(FIXED_CHORDS),\n    "lead",\n    "up",\n    "down",\n    "dearp"\n  ];\n  var BASS_KEYS = ["bass1", "bass2", "bass3", "bass4", "bass5", "bass6"];\n  var CLIP_KEYS = ["doub", "half", "fit", "inv", "rev"];\n  var RACK_KEYS = ["first", "last", "col", "exp", "sol", "unsol"];\n  var MIXER_KEYS = ["=", "-", "headroom", "heat"];\n  var ARRANGE_KEYS = ["loc", "clip"];\n  var EQ_KEYS = ["eq", "low", "high", "notch", "band"];\n  function displayHotkey(key) {\n    return key.replaceAll("^", "Ctrl+").replaceAll("!", "Alt+").replaceAll("#", "Win+");\n  }\n  var CHORD_QUALITY = {\n    major: "Major",\n    minor: "Minor",\n    dim: "Diminished",\n    aug: "Augmented"\n  };\n  var FIXED_CHORD_DESC = {\n    sus2: "Suspended 2nd chord",\n    sus4: "Suspended 4th chord",\n    pow: "Power chord, root and fifth"\n  };\n  function fixedChordDesc(key) {\n    if (FIXED_CHORD_DESC[key]) {\n      return FIXED_CHORD_DESC[key];\n    }\n    const match = /^([a-z]+?)(\\d*)$/.exec(key);\n    const quality = match ? CHORD_QUALITY[match[1]] : void 0;\n    if (!match || !quality) {\n      return void 0;\n    }\n    return match[2] ? `${quality} ${match[2]}th chord` : `${quality} triad`;\n  }\n  function itemDesc(key, bind) {\n    if (HOTSTRING_DESC[key]) {\n      return HOTSTRING_DESC[key];\n    }\n    if (key in FIXED_CHORDS) {\n      const desc = fixedChordDesc(key);\n      if (desc) {\n        return desc;\n      }\n    }\n    if (key in NATIVE_DEVICES) {\n      return NATIVE_DEVICES[key];\n    }\n    if (bind in NATIVE_DEVICES) {\n      return NATIVE_DEVICES[bind];\n    }\n    return bind;\n  }\n  function itemsFor(keys) {\n    const byKey = new Map(BINDINGS.hotstrings.map((bind) => [bind.key, bind]));\n    const items = [];\n    for (const key of keys) {\n      const bind = byKey.get(key);\n      if (!bind) {\n        continue;\n      }\n      items.push({ key, desc: itemDesc(key, bind.bind), bind: bind.bind });\n    }\n    return items;\n  }\n  function hotstringSections() {\n    const used = /* @__PURE__ */ new Set();\n    const sections2 = [];\n    function add(title, items) {\n      if (items.length === 0) {\n        return;\n      }\n      sections2.push({ title, items });\n      for (const item of items) {\n        used.add(item.key);\n      }\n    }\n    add(\n      "Hotkeys",\n      BINDINGS.hotkeys.map((bind) => ({\n        key: displayHotkey(bind.key),\n        desc: HOTKEY_DESC[bind.key] ?? bind.bind,\n        bind: bind.keys || bind.bind === "openList" ? void 0 : bind.bind\n      }))\n    );\n    add("Chords", itemsFor(CHORD_KEYS));\n    add("Bass", itemsFor(BASS_KEYS));\n    add("Clip", itemsFor(CLIP_KEYS));\n    add("Arrangement", itemsFor(ARRANGE_KEYS));\n    add("Mixer", itemsFor(MIXER_KEYS));\n    add("Rack", itemsFor(RACK_KEYS));\n    add("EQ", itemsFor(EQ_KEYS));\n    add("Instruments", itemsFor(INSTRUMENT_KEYS));\n    const midi = new Set(MIDI_KEYS);\n    const instruments = new Set(INSTRUMENT_KEYS);\n    add(\n      "Audio effects",\n      itemsFor(Object.keys(NATIVE_DEVICES).filter((key) => !instruments.has(key) && !midi.has(key)))\n    );\n    add("MIDI effects", itemsFor(MIDI_KEYS));\n    const leftover = BINDINGS.hotstrings.filter((bind) => !used.has(bind.key)).map((bind) => ({ key: bind.key, desc: itemDesc(bind.key, bind.bind), bind: bind.bind }));\n    add("Other", leftover);\n    return sections2;\n  }\n\n  // src/hotstringList/hotstrings.ts\n  var max = window.max;\n  var field = byId("field");\n  var input = byId("search");\n  var count = byId("count");\n  var clear = byId("clear");\n  var fade = byId("fade");\n  var list = byId("list");\n  var sections = hotstringSections().map((section) => {\n    const combos = section.title === "Hotkeys";\n    const entries = section.items.map((item) => ({\n      keys: combos ? item.key.split(/[+ ]/) : [item.key],\n      desc: item.desc,\n      bind: item.bind,\n      keyText: item.key.toLowerCase(),\n      search: `${item.key} ${item.desc}`.toLowerCase()\n    }));\n    return { title: section.title, search: section.title.toLowerCase(), entries };\n  });\n  var totalCount = sections.reduce((n, section) => n + section.entries.length, 0);\n  var actions = [];\n  var selected = -1;\n  function byId(id) {\n    const el2 = document.getElementById(id);\n    if (!el2) {\n      throw new Error(`missing #${id}`);\n    }\n    return el2;\n  }\n  function el(tag, className, ...children) {\n    const node = document.createElement(tag);\n    if (className) {\n      node.className = className;\n    }\n    node.append(...children);\n    return node;\n  }\n  function highlighted(text, q) {\n    const at = q === "" ? -1 : text.toLowerCase().indexOf(q);\n    if (at < 0) {\n      return [text];\n    }\n    return [\n      text.slice(0, at),\n      el("mark", "", text.slice(at, at + q.length)),\n      text.slice(at + q.length)\n    ];\n  }\n  function render() {\n    const raw = input.value;\n    const q = raw.trim().toLowerCase();\n    const rows = [];\n    actions = [];\n    let matches = 0;\n    for (const section of sections) {\n      const entries = q === "" || section.search.includes(q) ? section.entries : section.entries.filter((entry) => entry.search.includes(q));\n      if (entries.length === 0) {\n        continue;\n      }\n      matches += entries.length;\n      rows.push(el("div", "group", section.title, el("span", "", String(entries.length))));\n      for (const entry of entries) {\n        const keyMatch = q !== "" && entry.keyText.includes(q);\n        const row = el(\n          "div",\n          keyMatch ? "item match" : "item",\n          el("span", "desc", ...highlighted(entry.desc, q)),\n          el("span", "keys", ...entry.keys.map((key) => el("kbd", "", key)))\n        );\n        if (entry.bind) {\n          row.classList.add("action");\n          row.dataset.bind = entry.bind;\n          actions.push(row);\n        }\n        rows.push(row);\n      }\n    }\n    if (rows.length === 0) {\n      rows.push(\n        el(\n          "div",\n          "empty",\n          `No matches for "${raw.trim()}"`,\n          el("small", "", "Press Esc to close the list")\n        )\n      );\n    }\n    const active = raw !== "";\n    field.classList.toggle("active", active);\n    count.textContent = active ? `${matches} of ${totalCount}` : String(totalCount);\n    list.replaceChildren(...rows);\n    list.scrollTop = 0;\n    select(q !== "" && actions.length > 0 ? 0 : -1);\n    onScroll();\n  }\n  function select(index) {\n    actions[selected]?.classList.remove("selected");\n    selected = index;\n    const row = actions[selected];\n    if (!row) {\n      return;\n    }\n    row.classList.add("selected");\n    if (selected === 0) {\n      list.scrollTop = 0;\n    } else {\n      row.scrollIntoView({ block: "nearest" });\n    }\n  }\n  function move(step) {\n    if (actions.length === 0) {\n      return;\n    }\n    select(Math.min(actions.length - 1, Math.max(0, selected + step)));\n  }\n  function pageSize() {\n    const row = actions[0];\n    return row ? Math.max(1, Math.floor(list.clientHeight / (row.offsetHeight + 2)) - 1) : 1;\n  }\n  function close() {\n    setQuery("");\n    max?.outlet("closeList");\n  }\n  function fire(bind) {\n    max?.outlet(bind);\n    close();\n  }\n  function setQuery(next) {\n    input.value = next;\n    render();\n    input.focus();\n  }\n  function onScroll() {\n    fade.classList.toggle("on", list.scrollTop > 0);\n  }\n  input.addEventListener("input", render);\n  list.addEventListener("scroll", onScroll);\n  list.addEventListener("click", (event) => {\n    const row = event.target.closest(".item[data-bind]");\n    if (row?.dataset.bind) {\n      fire(row.dataset.bind);\n    }\n  });\n  clear.addEventListener("click", (event) => {\n    event.preventDefault();\n    setQuery("");\n  });\n  document.addEventListener("keydown", (event) => {\n    if (event.key === "Escape") {\n      event.preventDefault();\n      close();\n    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {\n      event.preventDefault();\n      move(event.key === "ArrowDown" ? 1 : -1);\n    } else if (event.key === "PageDown" || event.key === "PageUp") {\n      event.preventDefault();\n      move(event.key === "PageDown" ? pageSize() : -pageSize());\n    } else if (event.key === "Enter") {\n      event.preventDefault();\n      const bind = actions[selected]?.dataset.bind;\n      if (bind) {\n        fire(bind);\n      }\n    } else if (document.activeElement !== input) {\n      input.focus();\n    }\n  });\n  window.addEventListener("focus", () => input.focus());\n  render();\n  input.focus();\n})();\n</script>\n  </body>\n</html>\n';

// src/host.ts
autowatch = 1;
inlets = 1;
outlets = 0;
var WRITE_CHUNK = 8192;
var INITIATORS = [";", "/", "CapsLock"];
var IS_MAC = max.os === "macintosh";
var ENGINE_NAME = IS_MAC ? "engine.lua" : "engine.ahk";
var ENGINE_SOURCE = IS_MAC ? engine_default2 : engine_default;
var HAMMERSPOON_HOOK_MARKER = "-- KeyToMax hook";
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
  if (IS_MAC) {
    installHammerspoonHook();
    max.launchbrowser(`hammerspoon://keytomax?path=${encodeURIComponent(posixPath(enginePath))}`);
    return;
  }
  max.launchbrowser(fileUrl(enginePath));
}
function installHammerspoonHook() {
  const volume = /^[^/]*:(?=\/)/.exec(enginePath)?.[0] ?? "";
  const home = /^\/Users\/[^/]+/.exec(posixPath(enginePath))?.[0];
  if (home) {
    const configDir = `${volume}${home}/.hammerspoon`;
    const initPath = `${configDir}/init.lua`;
    const existing = readText(initPath) ?? "";
    const pathSaved = writeText(`${configDir}/keytomax-engine.txt`, posixPath(enginePath));
    if (existing.includes(HAMMERSPOON_HOOK_MARKER)) {
      return;
    }
    const prefix = existing === "" || existing.endsWith("\n") ? existing : `${existing}
`;
    if (pathSaved && writeText(initPath, `${prefix}${hammerspoon_init_default.trimEnd()}`)) {
      post("host: added the KeyToMax hook to ~/.hammerspoon/init.lua\n");
      post("host: if Hammerspoon was already running, click Reload Config in its menu\n");
      return;
    }
  }
  const fallback = joinPath(parentDir(enginePath), "hammerspoon-init.lua");
  writeText(fallback, hammerspoon_init_default);
  post("host: could not update ~/.hammerspoon/init.lua (open Hammerspoon once first)\n");
  post(`host: or append ${posixPath(fallback)} to it by hand and reload the config
`);
}
function ensureEnginePath() {
  if (enginePath) {
    return true;
  }
  const fp = hostThis().patcher?.filepath;
  if (!fp) {
    post("host: save the device to disk first\n");
    return false;
  }
  const root = parentDir(String(fp));
  const listPath = joinPath(root, "hotstrings.html");
  if (!writeText(joinPath(root, ENGINE_NAME), ENGINE_SOURCE) || !writeText(listPath, hotstrings_default)) {
    return false;
  }
  enginePath = joinPath(root, ENGINE_NAME);
  showHotstringList(listPath);
  return true;
}
function showHotstringList(path) {
  hostThis().patcher?.applydeep((obj) => {
    if (obj.maxclass === "jweb") {
      obj.message("url", fileUrl(path));
    }
    return true;
  });
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
  const s = `${String(text)}
`;
  for (let i = 0; i < s.length; i += WRITE_CHUNK) {
    f.writestring(s.substring(i, i + WRITE_CHUNK));
  }
  f.close();
  return true;
}
function readText(path) {
  const f = new File(path, "read");
  if (!f.isopen) {
    return;
  }
  let text = "";
  while (f.position < f.eof) {
    const chunk = f.readstring(WRITE_CHUNK);
    if (!chunk) {
      break;
    }
    text += chunk;
  }
  f.close();
  return text;
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
function posixPath(path) {
  return String(path).replace(/^[^/]*:(?=\/)/, "");
}
function nativePath(path) {
  if (IS_MAC) {
    return posixPath(path);
  }
  return String(path).replace(/\//g, "\\");
}
function fileUrl(path) {
  const posix = nativePath(path).replace(/\\/g, "/").replace(/^\/+/, "");
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
