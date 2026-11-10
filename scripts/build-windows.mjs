import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  watch,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'windows');
const zipPath = join(root, 'dist', 'Keyboard_Warrior_Windows.zip');
const watchMode = process.argv.includes('--watch');
const amxdName = 'Keyboard_Warrior.amxd';
const listTemplate = join(root, 'src', 'hotstringList', 'hotstrings.html');

const esbuildOptions = {
  entryPoints: [join(root, 'src', 'host.ts'), join(root, 'src', 'live.ts')],
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

let listScript = '';

function writeListPage() {
  const script = `<script>\n${listScript.replaceAll('</script', '<\\/script')}</script>`;
  const html = readFileSync(listTemplate, 'utf8').replace('<!-- bundle -->', () => script);
  writeFileSync(join(dist, 'hotstrings.html'), html);
}

const listOptions = {
  entryPoints: [join(root, 'src', 'hotstringList', 'hotstrings.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  write: false,
  logLevel: 'info',
  plugins: [
    {
      name: 'inline-html',
      setup(build) {
        build.onEnd(result => {
          if (result.errors.length > 0 || !result.outputFiles) {
            return;
          }
          listScript = result.outputFiles[0].text;
          writeListPage();
        });
      },
    },
  ],
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
const listCtx = await esbuild.context(listOptions);

if (watchMode) {
  await ctx.watch();
  await listCtx.watch();
  watch(join(root, 'platforms', 'windows'), { recursive: true }, () => {
    try {
      copyEngine();
    } catch (err) {
      console.error(err);
    }
  });
  watch(listTemplate, () => {
    try {
      writeListPage();
    } catch (err) {
      console.error(err);
    }
  });
  console.log('watching dist/windows');
} else {
  await ctx.rebuild();
  await listCtx.rebuild();
  await ctx.dispose();
  await listCtx.dispose();
}
