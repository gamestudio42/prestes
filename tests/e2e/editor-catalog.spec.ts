import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// revise-buildings-and-stone 5.4: every catalog group pictured in the
// editor, one object of each placed, and one of the new fences drawn from
// the pictured line kinds. With PRESTES_REVIEW=1 it also saves the opened
// groups and the line kinds for the owner's review sheet.

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string }[]; lineKinds: { kind: string }[] };
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
  };
}

const GROUPS = ['building', 'stone', 'water', 'camp', 'tree', 'post', 'cover', 'prop', 'decal'];
// One object of each group, the new ones where a group has them.
const PICKS: Record<string, string> = {
  building: 'casa-terrea',
  stone: 'boulder',
  water: 'dugout-canoe',
  camp: 'field-kitchen',
  tree: '',
  post: '',
  cover: '',
  prop: 'farm-gate',
  decal: '',
};

async function clickGround(page: Page, x: number, y: number): Promise<void> {
  const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
  if (!point) throw new Error(`${x}, ${y} is off screen`);
  await page.mouse.click(point.x, point.y);
}

test('every catalog group is pictured; one object of each is placed and a new fence drawn', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  await page.waitForTimeout(1500);
  const review = !!process.env.PRESTES_REVIEW;
  if (review) mkdirSync('docs/review/buildings/editor', { recursive: true });

  await page.locator('[data-tool="place"]').click();
  const placed: string[] = [];
  for (const [index, group] of GROUPS.entries()) {
    const details = page.locator(`.editor-catalog details[data-group="${group}"]`);
    if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) await details.locator('summary').click();
    const tiles = details.locator('[data-object]');
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);
    // Every tile pictured, but the trees (their own list, in the trees tool).
    if (group !== 'tree') await expect(details.locator('img[data-thumbnail]')).toHaveCount(count, { timeout: 30_000 });
    if (review && group !== 'tree') await details.screenshot({ path: `docs/review/buildings/editor/group-${group}.png` });
    // The props run past the panel: the gates, their last sub-heading, on their own.
    if (review && group === 'prop') await details.locator('.editor-tiles').last().screenshot({ path: 'docs/review/buildings/editor/group-prop-gates.png' });
    const pick = PICKS[group] ? details.locator(`[data-object="${PICKS[group]}"]`) : tiles.first();
    const type = (await pick.getAttribute('data-object'))!;
    await pick.click();
    await clickGround(page, -40 + (index % 5) * 20, index < 5 ? -20 : 20);
    placed.push(type);
    await details.locator('summary').click();
  }
  let state = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state());
  expect(state.objects.map((object) => object.type)).toEqual(placed);

  // The line kinds pictured; a rail fence drawn.
  await page.locator('[data-tool="line"]').click();
  const kinds = page.getByTestId('prop-line-kind');
  await expect(kinds.locator('img[data-thumbnail]')).toHaveCount(await kinds.locator('[data-line-kind]').count(), { timeout: 30_000 });
  if (review) await kinds.screenshot({ path: 'docs/review/buildings/editor/line-kinds.png' });
  await kinds.locator('[data-line-kind="rail-fence"]').click();
  await expect(kinds).toHaveAttribute('data-value', 'rail-fence');
  await clickGround(page, -30, 40);
  await clickGround(page, 30, 40);
  await page.keyboard.press('Enter');
  state = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state());
  expect(state.lineKinds.map((line) => line.kind)).toEqual(['rail-fence']);
});
