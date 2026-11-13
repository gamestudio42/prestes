import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// revise-buildings-and-stone 4.3: the editor's stones grouped by rock kind,
// pictured in it; a stone placed and a dry stone wall drawn in a kind, and
// changed from the selection panel. With PRESTES_REVIEW=1 it also saves the
// stone list in each kind for the owner's review sheet.

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string; variant?: string }[]; lineKinds: { kind: string; variant?: string }[] };
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
  };
}

const bridge = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state());

async function clickGround(page: Page, x: number, y: number): Promise<void> {
  const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
  if (!point) throw new Error(`${x}, ${y} is off screen`);
  await page.mouse.click(point.x, point.y);
}

test('stones and dry stone walls take a rock kind in the editor', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  await page.waitForTimeout(1500);

  // The stone list: the kind first, then each stone pictured in it.
  await page.locator('[data-tool="place"]').click();
  const tiles = page.getByTestId('stone-tiles');
  if (!(await tiles.isVisible())) await page.locator('details', { has: tiles }).locator('summary').click();
  const kinds = page.getByTestId('stone-rock-kind');
  await kinds.locator('[data-rock="basalt"]').click();
  await expect(tiles).toHaveAttribute('data-kind', 'basalt');
  await expect(tiles.locator('img[data-thumbnail="boulder@basalt"]')).toBeVisible({ timeout: 30_000 });
  await expect(tiles.locator('img[data-thumbnail="stone-corral@basalt"]')).toBeVisible();
  await tiles.locator('[data-object="boulder"]').click();
  await clickGround(page, -20, 0);
  await tiles.locator('[data-object="stone-corral"]').click();
  await clickGround(page, 20, 0);

  if (process.env.PRESTES_REVIEW) {
    mkdirSync('docs/review/buildings/editor', { recursive: true });
    for (const kind of ['granite', 'basalt', 'sandstone', 'quartzite', 'cobble', 'lajedo']) {
      await kinds.locator(`[data-rock="${kind}"]`).click();
      await expect(tiles.locator('img').first()).toBeVisible({ timeout: 30_000 });
      await expect.poll(() => tiles.locator('img').count(), { timeout: 30_000 }).toBe(await tiles.locator('button').count());
      await page.locator('.editor-catalog details', { has: tiles }).screenshot({ path: `docs/review/buildings/editor/${kind}.png` });
    }
    await kinds.locator('[data-rock="basalt"]').click();
  }

  // A dry stone wall drawn in sandstone.
  await page.locator('[data-tool="line"]').click();
  await page.getByTestId('prop-line-kind').selectOption('stone-wall');
  await page.getByTestId('line-rock-kind').locator('[data-rock="sandstone"]').click();
  await clickGround(page, -30, 30);
  await clickGround(page, 30, 30);
  await page.keyboard.press('Enter');

  let state = await bridge(page);
  expect(state.objects.map(({ type, variant }) => [type, variant])).toEqual([
    ['boulder', 'basalt'],
    ['stone-corral', 'basalt'],
  ]);
  expect(state.lineKinds).toEqual([{ kind: 'stone-wall', variant: 'sandstone' }]);

  // Changed from the selection panel: the boulder to granite, the wall to cobble.
  await page.locator('[data-tool="select"]').click();
  await clickGround(page, -20, 0);
  await page.getByTestId('object-rock-kind').locator('[data-rock="granite"]').click();
  await clickGround(page, 0, 30);
  await page.getByTestId('line-rock-kind').locator('[data-rock="cobble"]').click();
  state = await bridge(page);
  expect(state.objects[0]).toEqual(expect.not.objectContaining({ variant: expect.anything() }));
  expect(state.lineKinds).toEqual([{ kind: 'stone-wall', variant: 'cobble' }]);
});
