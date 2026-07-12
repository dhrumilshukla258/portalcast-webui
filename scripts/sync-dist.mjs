// Copies dist/ into portalcast-server's public/ after every build, so the
// server always serves the latest webui without a manual copy step.
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';
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

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(distDir, targetDir, { recursive: true });

console.log(`[sync-dist] Synced ${distDir} -> ${targetDir}`);
