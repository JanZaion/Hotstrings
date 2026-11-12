-- KeyToMax hook
-- The Hotstrings device adds this to ~/.hammerspoon/init.lua, writes the
-- engine path to keytomax-engine.txt, and opens
-- hammerspoon://keytomax?path=<engine.lua> to load the engine.
hs.urlevent.bind("keytomax", function(_, params)
    if KeyToMax then
        KeyToMax.stop()
    end
    KeyToMax = dofile(params.path)
end)
do
    local f = io.open(hs.configdir .. "/keytomax-engine.txt", "r")
    local path = f and f:read("l")
    if f then
        f:close()
    end
    local dir = path and path:match("^(.*)/")
    if dir and hs.fs.attributes(path) and hs.fs.attributes(dir .. "/bindings.json") then
        KeyToMax = dofile(path)
    end
end
