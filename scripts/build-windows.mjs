import { createWriteStream, cpSync, mkdirSync, rmSync, watch } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'windows');
const zipPath = join(root, 'dist', 'Keyboard_Warrior_Windows.zip');
const watchMode = process.argv.includes('--watch');

const esbuildOptions = {
  entryPoints: [join(root, 'src', 'host.ts')],
  outfile: join(dist, 'host.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  treeShaking: false,
  minifyIdentifiers: false,
  logLevel: 'info',
};

function copyStatic() {
  cpSync(join(root, 'src', 'presets'), join(dist, 'presets'), { recursive: true });
  cpSync(join(root, 'platforms', 'windows', 'engine.ahk'), join(dist, 'engine.ahk'));
  cpSync(join(root, 'max', 'Keyboard_Warrior.amxd'), join(dist, 'Keyboard_Warrior.amxd'));
}

function prepareDist() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  copyStatic();
}

function zipDist() {
  rmSync(zipPath, { force: true });

  const output = createWriteStream(zipPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(dist, 'Keyboard_Warrior_Windows');
    archive.finalize();
  });
}

prepareDist();

const ctx = await esbuild.context(esbuildOptions);

if (watchMode) {
  await ctx.watch();
  const recopy = () => {
    try {
      copyStatic();
    } catch (err) {
      console.error(err);
    }
  };
  watch(join(root, 'src', 'presets'), { recursive: true }, recopy);
  watch(join(root, 'platforms', 'windows'), { recursive: true }, recopy);
  watch(join(root, 'max'), { recursive: true }, recopy);
  console.log('watching dist/windows');
} else {
  await ctx.rebuild();
  await ctx.dispose();
  await zipDist();
}
