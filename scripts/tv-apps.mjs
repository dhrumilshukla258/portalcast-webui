// Puts together the LG and Samsung apps' folders (platforms/README.md): the shared launcher page
// plus each TV's own files, in dist-tv/webos and dist-tv/tizen, ready for LG's ares-package and
// Samsung's tizen package. Usage: node scripts/tv-apps.mjs
// PORTALCAST_VERSION=1.6.0 (a release tag, .github/workflows/tv-apps.yml) stamps that version into
// both apps' copies; the files in platforms/ stay as they are.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-tv');
// webOS and Tizen both want three numbers; a pre-release ("1.6.0-beta.1") keeps the three.
const version = (process.env.PORTALCAST_VERSION || '').match(/^(\d{1,3}\.\d{1,3}\.\d{1,4})(?:-[\w.]+)?$/)?.[1];
if (process.env.PORTALCAST_VERSION && !version) throw new Error(`PORTALCAST_VERSION must look like 1.2.3, not "${process.env.PORTALCAST_VERSION}"`);

rmSync(out, { recursive: true, force: true });
for (const tv of ['webos', 'tizen']) {
  const dir = join(out, tv);
  mkdirSync(dir, { recursive: true });
  cpSync(join(root, 'platforms', 'launcher'), dir, { recursive: true });
  cpSync(join(root, 'platforms', tv), dir, { recursive: true, filter: (src) => !src.endsWith('README.md') });
  if (version) stampVersion(dir, tv);
  console.log(`[tv-apps] ${dir}${version ? ` (version ${version})` : ''}`);
}

function stampVersion(dir, tv) {
  if (tv === 'webos') {
    const file = join(dir, 'appinfo.json');
    const info = JSON.parse(readFileSync(file, 'utf8'));
    info.version = version;
    writeFileSync(file, JSON.stringify(info, null, 2) + '\n');
  } else {
    const file = join(dir, 'config.xml');
    const xml = readFileSync(file, 'utf8');
    const stamped = xml.replace(/(<widget\b[^>]*?\sversion=")[^"]*(")/, `$1${version}$2`);
    if (stamped === xml && !xml.includes(`version="${version}"`)) throw new Error('config.xml: no version on <widget>');
    writeFileSync(file, stamped);
  }
}
