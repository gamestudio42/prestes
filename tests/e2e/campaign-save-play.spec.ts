import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

// make-campaign-playable 3.2: a campaign map saved to the project (what the
// editor's "Save to project" sends) is the map the chapter plays next, with no
// code change. The real map and the index are restored byte for byte after.

type Doc = { id: string; objects: { id: number; x: number; y: number }[] };
type Bridge = { frame: () => { units: unknown[] } | null; mapDocument: () => Doc | null; endBattle: (outcome: 'victory') => void };

const AUTHORED = resolve(process.cwd(), 'packages/shared/src/maps/authored');
const FILES = ['serra-nova.map.json', 'index.ts'].map((name) => resolve(AUTHORED, name));

/** Writes the backup back until the file holds it again (a watched file can be locked for a moment). */
function restore(file: string, bytes: Buffer): void {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      writeFileSync(file, bytes);
      if (readFileSync(file).equals(bytes)) return;
    } catch {
      // Locked: wait and try again.
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  throw new Error(`could not restore ${file}; run git checkout -- ${file}`);
}

async function playChapter6(page: Page): Promise<Doc> {
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  if ((await page.getByTestId('book-ribbon-contents').count()) === 0) await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await page.getByTestId('campaign-chapter-serra-nova').click();
  const frame = page.getByTestId('campaign-book').locator('.desk-book-frame');
  await frame.focus();
  for (let i = 0; i < 12 && (await page.getByTestId('chapter-play-serra-nova').count()) === 0; i += 1) await page.keyboard.press('ArrowRight');
  await page.getByTestId('chapter-play-serra-nova').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __prestes?: Bridge }).__prestes?.frame()?.units.length ?? 0), { timeout: 30_000 })
    .toBeGreaterThan(0);
  return (await page.evaluate(() => (window as unknown as { __prestes: Bridge }).__prestes.mapDocument()))!;
}

test('a campaign map saved to the project plays at the next start of its chapter', async ({ page }) => {
  test.setTimeout(150_000);
  const backups = FILES.map((file) => readFileSync(file));
  try {
    await page.addInitScript(() => {
      localStorage.setItem('prestes.locale', 'en');
      localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
      const won = { outcome: 'victory', ticks: 900, columnLost: 2 };
      const chapter = { won: true, plays: 1, last: won, best: won };
      const ids = ['prologue-18-do-forte', 'anel-de-ferro', 'a-divisao', 'frente-do-parana', 'ponte-de-verdinho'];
      localStorage.setItem('prestes.campaign.v1', JSON.stringify({ version: 1, chapters: Object.fromEntries(ids.map((id) => [id, chapter])) }));
    });
    await page.goto('/');
    const before = await playChapter6(page);
    expect(before.id).toBe('serra-nova');
    const moved = before.objects[0]!;

    // "Save to project": the same map with its first prop moved three metres east.
    const original = JSON.parse(backups[0]!.toString('utf8')) as Doc;
    const edited = { ...original, objects: original.objects.map((object) => (object.id === moved.id ? { ...object, x: object.x + 3 } : object)) };
    const response = await page.request.post('/__editor/save-map', { data: edited });
    expect(response.ok()).toBe(true);

    // The dev server reloads the game for the new file (the battle on screen is lost); without a
    // reload, the battle is ended and the book reopened. Either way the next start reads the map.
    const reloaded = await page
      .getByTestId('menu-desk')
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!reloaded) {
      await page.evaluate(() => (window as unknown as { __prestes: Bridge }).__prestes.endBattle('victory'));
      await page.getByTestId('battle-end-back-to-book').click();
    }
    const after = await playChapter6(page);
    const object = after.objects.find((candidate) => candidate.id === moved.id)!;
    expect(object.x).toBeCloseTo(moved.x + 3, 5);
    expect(object.y).toBe(moved.y);
  } finally {
    // The dev server watches these files; on Windows a write can hit a moment's lock, so retry.
    FILES.forEach((file, index) => restore(file, backups[index]!));
  }
});
