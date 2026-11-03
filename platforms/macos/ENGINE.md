# Engine contract

`src/host.ts` looks for `engine.ahk` next to the `.amxd`. A Mac port has to change that path, or add a small launcher indirection, because there is no AutoHotkey on Mac.

Match this behavior:

## Launch

Windows today:

```text
AutoHotkey64.exe engine.ahk
AutoHotkey64.exe engine.ahk --quit
```

The Max host writes `bindings.json` next to the engine, then opens the engine file. Quit writes `quit` to `engine-cmd.txt`. The running engine deletes `bindings.json` and exits. Do not relaunch on quit.

## Files next to the engine

- `bindings.json` — hotkeys and hotstrings from `src/live.ts`
- `engine-cmd.txt` — `suspend`, `resume`, `hudon`, `hudoff`, or `quit`

## OSC

While Ableton Live is focused, send `/bind <name> [int]` to `127.0.0.1:7400`. Bind names come from `bindings.json`.

## What not to fork

`host.js`, `live.js`, and the `.amxd` should stay the same as the Windows build. Only the engine binary/script is Mac-specific.
