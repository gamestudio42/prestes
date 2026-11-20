// Copies the built web game next to the Electron main process.
// The copy is what the snap ships. The GitHub Pages build in apps/game/dist is left as it is.
import { cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.join(here, '..', '..', 'game', 'dist');
const to = path.join(here, '..', 'game');
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
stripAnalytics(to);
console.log(`copied ${from} -> ${to}`);

/** Drops the GoatCounter tag so the desktop build does not reference a CDN. */
function stripAnalytics(dir) {
  for (const entry of readdirSync(dir)) {
    const file = path.join(dir, entry);
    if (statSync(file).isDirectory()) {
      stripAnalytics(file);
      continue;
    }
    if (!entry.endsWith('.html')) continue;
    const html = readFileSync(file, 'utf8');
    const next = html.replace(/\s*<script\b[^>]*data-goatcounter[\s\S]*?<\/script>/gi, '');
    if (next !== html) writeFileSync(file, next);
  }
}
