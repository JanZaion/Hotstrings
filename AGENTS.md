After each run, verify with `pnpm typecheck`, `pnpm lint`, and `pnpm prettier:fix`. After all errors have been addressed, run `pnpm build`.

## Platforms

This device is primarily developed on Windows. `pnpm build` writes the Windows device to `dist/windows`.

`host.js`, `live.js`, `fire.js` and `Hotstrings.amxd` are identical on both platforms. `src/host.ts` embeds both engines and picks one with `max.os`:

- Windows: `src/engine/engine.ahk` (AutoHotkey v2)
- macOS: `src/engine/engine.lua` (Hammerspoon)

Both engines follow the same contract: they read `bindings.json` and `engine-cmd.txt` next to themselves, handle the same commands (`idle`, `suspend`, `resume`, `toggle`, `hudon`, `hudoff`, `playfromon`, `playfromoff`, `initiator`, `quit`), and send OSC `/bind <name> [int|string]` to `127.0.0.1:7400` while Ableton Live is focused. Changing engine behavior means changing both engines.

Mac workflow:

1. On Windows, run `pnpm build` and freeze the device in Max.
2. Run `pnpm build:mac`. It copies the shared files from `dist/windows` to `dist/mac`.
3. Copy `dist/mac` to the Mac.
4. On the Mac, install Hammerspoon, open it once, grant it Accessibility permission, then load the device in Live.

On Mac, `host.js` adds the hook from `src/engine/hammerspoon-init.lua` to `~/.hammerspoon/init.lua` (once, detected by the `-- KeyToMax hook` marker) and writes the engine path to `~/.hammerspoon/keytomax-engine.txt` on every launch. The hook starts the engine from that path when the config loads, so if Hammerspoon was already running the first time, clicking Reload Config is enough. If the home folder can't be derived from the device path (device outside `/Users/<name>`), `host.js` writes `hammerspoon-init.lua` next to the device and prints manual steps to the Max console.

Only run `pnpm build:mac` when the user explicitly asks for a Mac build.
