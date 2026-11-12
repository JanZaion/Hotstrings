import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const windowsDist = join(root, 'dist', 'windows');
const macDist = join(root, 'dist', 'mac');

const shared = ['Hotstrings.amxd', 'host.js', 'live.js', 'fire.js'];

const missing = shared.filter(name => !existsSync(join(windowsDist, name)));
if (missing.length > 0) {
  console.error(`missing in dist/windows: ${missing.join(', ')}`);
  process.exit(1);
}

rmSync(macDist, { recursive: true, force: true });
mkdirSync(macDist, { recursive: true });

for (const name of shared) {
  copyFileSync(join(windowsDist, name), join(macDist, name));
}

console.log(`dist/mac: ${shared.join(', ')}`);
