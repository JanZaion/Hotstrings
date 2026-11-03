# Engine contract

`src/host.ts` currently looks for `engine.ahk` next to the `.amxd`. A Mac port has to change that path, or add a small launcher indirection, because there is no AutoHotkey on Mac.

Match this behavior:

## Launch

Windows today:

```text
AutoHotkey64.exe engine.ahk --preset <preset-folder>
AutoHotkey64.exe engine.ahk --quit
```

Max also writes `current-preset.txt` next to the engine, then opens the engine file. If that file already contains a preset folder, the engine can start without `--preset`.

## Files next to the engine

- `current-preset.txt` — preset folder path, or `--quit`
- `engine-cmd.txt` — `suspend` or `resume`

## OSC

While Ableton Live is focused, send `/bind <name> [int]` to `127.0.0.1:7400`. Bind names come from each preset's `keys.json`.

## What not to fork

`host.js`, `presets/`, and the `.amxd` should stay the same as the Windows build. Only the engine binary/script is Mac-specific.
