# macOS

This folder is not a development workspace. Daily work happens on Windows. `pnpm build` writes the Max device to `dist/windows`.

When Mac support happens, this folder should hold the Mac engine only. Shared pieces stay in `src/` and `max/`:

- `src/host.ts` compiled to `host.js`
- `src/presets/`
- `max/Keyboard_Warrior.amxd`

The Windows engine is AutoHotkey (`platforms/windows/engine.ahk`). Max cannot run that on Mac. The later Mac engine needs to speak the same protocol. See [ENGINE.md](ENGINE.md).

Do not copy the whole Windows tree and rewrite it by hand. Keep one source for the device and presets, then swap the engine.
