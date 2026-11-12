import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { SECTION_TYPES, type SectionTypeId } from '@prestes/shared';
import { SECTION_THUMBS_DIR, sectionThumbHash } from './section-thumbs-hash';

/**
 * troop-thumbnails-and-panel 1.2: renders every section type's thumbnail
 * with the game's own soldier kit (`renderSectionThumbnails` in view3d) in
 * headless Chromium and writes `apps/game/public/assets/sections/<type>.png`
 * with `<type>.hash`, the hash of what it was drawn from.
 *
 *   pnpm thumbs              every type
 *   pnpm thumbs jaguncos     one type
 *
 * It uses the test dev server on port 4317 if one is running, or starts it.
 */
const PORT = 4317;
const BASE = `http://127.0.0.1:${PORT}`;
/** Pixels on disk: twice the largest size the HUD shows (D1). */
const SIZE = 96;
const OUT = resolve(process.cwd(), SECTION_THUMBS_DIR);
const MODULE = `/@fs/${resolve(process.cwd(), 'packages/view3d/src/thumbnails.ts').split('\\').join('/')}`;

async function serverUp(): Promise<boolean> {
  try {
    return (await fetch(BASE)).ok;
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
  const ids = (Object.keys(SECTION_TYPES) as SectionTypeId[]).filter((id) => wanted.length === 0 || wanted.includes(id));
  if (ids.length === 0) throw new Error(`no section type named ${wanted.join(', ')}`);
  mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/`);
    const pictures = await page.evaluate(
      async ({ module, ids, size }) => {
        const view = (await import(module)) as { renderSectionThumbnails: (ids: string[], size: number) => Promise<Map<string, string>> };
        return [...(await view.renderSectionThumbnails(ids, size))];
      },
      { module: MODULE, ids, size: SIZE },
    );
    for (const [id, url] of pictures) {
      writeFileSync(resolve(OUT, `${id}.png`), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
      writeFileSync(resolve(OUT, `${id}.hash`), `${sectionThumbHash(id as SectionTypeId)}\n`);
      console.log(`${id}: ${SECTION_THUMBS_DIR}/${id}.png`);
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
