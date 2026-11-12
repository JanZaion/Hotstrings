-- KeyToMax engine for macOS (Hammerspoon). Mirrors engine.ahk.
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
    return (text:gsub("^\239\187\191", ""))
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
    for line in (text .. "\n"):gmatch("([^\n]*)\n") do
        out[#out + 1] = (line:gsub("\r$", ""))
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
    s = s .. "\0"
    return s .. string.rep("\0", (4 - #s % 4) % 4)
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
    alert("No bindings.json in:\n" .. DIR)
    return stub()
end

local ok, data = pcall(hs.json.decode, keysText)
if not ok or type(data) ~= "table" then
    alert("Could not parse bindings.json:\n" .. KEYS_PATH .. "\n" .. tostring(data))
    return stub()
end

local hotkeyList = type(data.hotkeys) == "table" and data.hotkeys or {}
local hotstringList = type(data.hotstrings) == "table" and data.hotstrings or {}
if #hotkeyList == 0 and #hotstringList == 0 then
    alert("bindings.json needs a non-empty hotkeys or hotstrings array.\n" .. KEYS_PATH)
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
    alert("Skipped invalid binds:\n" .. table.concat(bad, "\n"))
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
