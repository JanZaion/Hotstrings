# Hotstrings

A Max for Live device that runs Ableton Live actions when you type short words. Press `;`, type
`rev`, and the selected notes play backwards. Type `verb` and Reverb lands on the track.

The ready-to-use device is on [Gumroad](https://nohasslebeats.gumroad.com/l/hotstrings), and the docs are at
[nohasslebeats.com/docs/hotstrings](https://nohasslebeats.com/docs/hotstrings/). This repo is for
people who want to build the device from source or add their own hotstrings.

## Requirements

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/), the current LTS version
- [pnpm](https://pnpm.io/installation) 10. The lockfile won't work with npm or Yarn.
- Ableton Live Suite 12 with Max 8 or higher
- [AutoHotkey v2](https://www.autohotkey.com/) on Windows, or
  [Hammerspoon](https://www.hammerspoon.org/) on macOS

## Build

```bash
git clone https://github.com/JanZaion/Hotstrings.git
cd Hotstrings
pnpm install
pnpm build
```

`pnpm build` writes the device and its scripts to `dist/windows`. On a Mac, run `pnpm build:mac`,
which runs the same build and copies the result to `dist/mac`.

Drag `Hotstrings.amxd` from that folder onto a track. The device reads its scripts from the folder
it sits in, so load it from `dist` instead of copying it somewhere else.

While you work, run `pnpm build:watch`. It rebuilds on every save, and the device picks up the new
scripts without a reload.

## Add a hotstring

This example adds `oct`, which moves the selected notes up an octave.

1. Write the action. Actions live in `src/actions/`, grouped by what they touch: note edits in
   `midiClip.ts`, chords in `chords.ts`, devices in `devices.ts`, and so on. Read `doub` or `rev` in
   `midiClip.ts` to see how they use the Live API, then export a function named `oct`.
2. Expose it to Max. In `src/live.ts`, import `oct` and add `void oct;` to the list at the bottom.
   The import puts the function into `live.js`, where the device calls it by name. The `void` line
   keeps the linter from flagging the import as unused.
3. Bind a word to it. Add a line to the `hotstrings` array in `src/bindings.ts`:

   ```ts
   { key: 'oct', bind: 'oct' },
   ```

   `key` is what you type after `;`. `bind` is the function it calls. They don't have to match, so
   `{ key: 'rv', bind: 'verb' }` gives Reverb a second, shorter word.

Run `pnpm build`, reload the device, press `;` and type `oct`.

To show a description in the hotstring list, add an entry to `HOTSTRING_DESC` in
`src/hotstringCatalog.ts`. Without one, the list shows the function name.

## Checks

Run these before you build:

```bash
pnpm typecheck
pnpm lint
pnpm prettier:fix
```

If a hotstring does nothing after a build, open the Max Console and look for errors.

## Contributing

Pull requests are welcome. To send a device to someone without the source, open it in Max and
freeze it first so the scripts get packed into the `.amxd` file.

## License

[MIT](LICENSE)
