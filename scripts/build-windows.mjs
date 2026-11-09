import { cpSync, mkdirSync, readdirSync, rmSync, watch } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'windows');
const zipPath = join(root, 'dist', 'Keyboard_Warrior_Windows.zip');
const watchMode = process.argv.includes('--watch');
const amxdName = 'Keyboard_Warrior.amxd';

const esbuildOptions = {
  entryPoints: [
    join(root, 'src', 'host.ts'),
    join(root, 'src', 'live.ts'),
    join(root, 'src', 'jsui', 'hotstrings.ts'),
  ],
  outdir: dist,
  entryNames: '[name]',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  treeShaking: false,
  minifyIdentifiers: false,
  logLevel: 'info',
};

function copyEngine() {
  cpSync(join(root, 'platforms', 'windows', 'engine.ahk'), join(dist, 'engine.ahk'));
}

function prepareDist() {
  mkdirSync(dist, { recursive: true });
  for (const name of readdirSync(dist)) {
    if (name !== amxdName) {
      rmSync(join(dist, name), { recursive: true, force: true });
    }
  }
  rmSync(zipPath, { force: true });
  copyEngine();
}

prepareDist();

const ctx = await esbuild.context(esbuildOptions);

if (watchMode) {
  await ctx.watch();
  watch(join(root, 'platforms', 'windows'), { recursive: true }, () => {
    try {
      copyEngine();
    } catch (err) {
      console.error(err);
    }
  });
  console.log('watching dist/windows');
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
