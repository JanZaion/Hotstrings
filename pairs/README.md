# KeyToMax pairs

Each pair is a folder with three files. Do not edit `engine.ahk` or the Max device.

```
pairs/<id>/
  pair.json
  keys.json
  live.js
```

## pair.json

```json
{
  "id": "clip-slots",
  "name": "Clip slots",
  "description": "1-8 fire clip slots on the selected track",
  "binds": ["slot"]
}
```

`binds` must match function names in `live.js`.

## keys.json

```json
{
  "hotkeys": [
    { "key": "1", "bind": "slot", "value": 1 },
    { "key": "m", "bind": "mute" }
  ]
}
```

- `key` is an AutoHotkey v2 key name: `1`, `Numpad1`, `m`, `Space`, `^s`.
- `bind` is the Max / v8 function name.
- `value` is optional. If present it is sent as an integer after the bind name.

Hotkeys only fire while Ableton Live is focused. Keys not listed here are not captured.

## live.js

Max for Live JavaScript loaded into a `[v8]` object. Implement one function per bind. OSC `/bind slot 3` arrives as `slot(3)`. `/bind mute` arrives as `mute()`.

Use LiveAPI only. Do not send UDP or write AutoHotkey.

```javascript
function slot(n) {
    const track = new LiveAPI("live_set view selected_track");
    if (!track.id || track.id == 0) return;
    const clipSlot = new LiveAPI(track.path + " clip_slots " + (n - 1));
    clipSlot.call("fire");
}
```

## Agent prompt

Create a new folder under `pairs/` with those three files. Match bind names across `pair.json`, `keys.json`, and `live.js`. Do not generate `.ahk` or edit the `.amxd`.
