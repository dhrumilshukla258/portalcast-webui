// Puts together the LG and Samsung apps' folders (platforms/README.md): the shared launcher page
// plus each TV's own files, in dist-tv/webos and dist-tv/tizen, ready for LG's ares-package and
// Samsung's tizen package. Usage: node scripts/tv-apps.mjs
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-tv');
rmSync(out, { recursive: true, force: true });
for (const tv of ['webos', 'tizen']) {
  const dir = join(out, tv);
  mkdirSync(dir, { recursive: true });
  cpSync(join(root, 'platforms', 'launcher'), dir, { recursive: true });
  cpSync(join(root, 'platforms', tv), dir, { recursive: true, filter: (src) => !src.endsWith('README.md') });
  console.log(`[tv-apps] ${dir}`);
}
