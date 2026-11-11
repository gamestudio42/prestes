import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { authoredMapIds, loadAuthoredMap } from '@prestes/shared';

/**
 * refine-battle-maps 6.3: renders each battle map's pixel preview for the
 * skirmish page. It opens the dev-only `preview.html` (the map seen straight
 * down over its bounds, pixel post, deployment zones marked) in headless
 * Chromium and saves the canvas as `apps/game/public/maps/<id>.png`.
 *
 *   pnpm maps:previews            every battle map
 *   pnpm maps:previews fazenda    one map
 *
 * It uses the test dev server on port 4317 if one is running, or starts it.
 */
const PORT = 4317;
const BASE = `http://127.0.0.1:${PORT}`;
/** The preview's size on disk (px); the menu shows it at this size or half. */
const SIZE = 192;
const OUT = resolve(process.cwd(), 'apps/game/public/maps');

async function serverUp(): Promise<boolean> {
  try {
    const response = await fetch(BASE);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer(): Promise<ChildProcess | null> {
  if (await serverUp()) return null;
  const server = spawn('pnpm --filter @prestes/game dev:test', { stdio: 'ignore', shell: true });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await serverUp()) return server;
    await new Promise((done) => setTimeout(done, 500));
  }
  server.kill();
  throw new Error(`the dev server did not come up on ${BASE}`);
}

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  const ids = authoredMapIds().filter((id) => wanted.length === 0 || wanted.includes(id));
  const maps = (await Promise.all(ids.map((id) => loadAuthoredMap(id)))).filter((document) => document !== null);
  if (maps.length === 0) throw new Error(`no battle map named ${wanted.join(', ')}`);
  mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    // The scene renders at a quarter of the CSS size (pixel post), so a 4x
    // viewport gives one rendered pixel per preview pixel after the shot is scaled.
    const page = await browser.newPage({ viewport: { width: SIZE * 2, height: SIZE * 2 }, deviceScaleFactor: 0.5 });
    for (const map of maps) {
      await page.goto(`${BASE}/preview.html?map=${map.id}`);
      await page.waitForFunction(
        () => {
          const host = window as unknown as { __previewReady?: boolean; __previewError?: string };
          if (host.__previewError) throw new Error(host.__previewError);
          return host.__previewReady === true;
        },
        undefined,
        { timeout: 60_000 },
      );
      const path = resolve(OUT, `${map.id}.png`);
      await page.locator('canvas').first().screenshot({ path });
      console.log(`${map.id}: ${path}`);
    }
  } finally {
    await browser.close();
    server?.kill();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
