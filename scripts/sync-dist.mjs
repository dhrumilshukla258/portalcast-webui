// Copies dist/ into portalcast-server's public/ after every build, so the
// server always serves the latest webui without a manual copy step.
import { existsSync, rmSync, mkdirSync, cpSync, readdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const distDir = resolve(__dirname, '..', 'dist');
const targetDir =
  process.env.PORTALCAST_SERVER_PUBLIC_DIR ||
  resolve(__dirname, '..', '..', 'portalcast-server', 'public');

if (!existsSync(distDir)) {
  console.error(`[sync-dist] dist/ not found at ${distDir} — run build first.`);
  process.exit(1);
}

if (!existsSync(resolve(targetDir, '..'))) {
  console.error(`[sync-dist] portalcast-server not found next to portalcast-webui (expected ${targetDir}).`);
  console.error('[sync-dist] Set PORTALCAST_SERVER_PUBLIC_DIR to override the target path.');
  process.exit(1);
}

// Refuse to publish a bundle whose API host got mangled at build time. Running
// `VITE_API_HOST=/ npm run build` from Git Bash on Windows makes MSYS rewrite the
// lone "/" into Git's install path ("F:/Program Files/Git/"), which then gets baked
// into the bundle: every API/socket call goes to file:///F:/Program Files/Git//api/...
// and the whole app sits on "loading" / "Failed to fetch". Build from PowerShell/cmd,
// or leave VITE_API_HOST to .env.production instead of setting it inline.
const assetsDir = resolve(distDir, 'assets');
if (existsSync(assetsDir)) {
  for (const f of readdirSync(assetsDir).filter((n) => n.startsWith('index-') && n.endsWith('.js'))) {
    if (/[A-Za-z]:\/Program Files[^"'`]*\/Git\//.test(readFileSync(resolve(assetsDir, f), 'utf8'))) {
      console.error(`[sync-dist] ${f} has a mangled API host baked in (Git Bash rewrote VITE_API_HOST="/").`);
      console.error('[sync-dist] Rebuild from PowerShell/cmd, or remove the inline VITE_API_HOST and use .env.production. Not syncing.');
      process.exit(1);
    }
  }
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(distDir, targetDir, { recursive: true });

console.log(`[sync-dist] Synced ${distDir} -> ${targetDir}`);
