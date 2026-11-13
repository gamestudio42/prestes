import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// revise-buildings-and-stone 5.2: the camp objects drawn per side, the
// Column's row behind and the government's in front, set with the editor's
// side picker, in the 3D view, for the owner's review sheet. A throwaway
// map; nothing is saved. Runs only with PRESTES_REVIEW=1.

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string; variant?: string }[] };
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    viewport: () => { view: { camera: { targetYaw: number } } } | null;
  };
}

const SIDED = ['ridge-tent', 'bell-tent', 'field-kitchen', 'mess-tent', 'poncho-lean-to', 'ammo-boxes', 'supply-cart'];

test.skip(!process.env.PRESTES_REVIEW, 'review pictures only on demand');

test("the camp in the Column's looks and the government's", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  await page.waitForTimeout(1500);
  const click = async (x: number, y: number) => {
    const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
    if (!point) throw new Error(`${x}, ${y} is off screen`);
    await page.mouse.click(point.x, point.y);
  };
  const spots = SIDED.flatMap((type, index) => [
    { type, x: -33 + index * 11, y: -7, side: 'column' },
    { type, x: -33 + index * 11, y: 8, side: 'legalist' },
  ]);
  await page.locator('[data-tool="place"]').click();
  for (const spot of spots) {
    const button = page.locator(`[data-object="${spot.type}"]`);
    if (!(await button.isVisible())) await page.locator('details', { has: button }).locator('summary').click();
    await button.click();
    await click(spot.x, spot.y);
  }
  await page.locator('[data-tool="select"]').click();
  for (const spot of spots.filter((entry) => entry.side === 'legalist')) {
    await click(spot.x, spot.y);
    await page.getByTestId('object-side').locator('[data-side="legalist"]').click();
  }
  const objects = (await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state())).objects;
  expect(objects.filter((object) => object.variant === 'legalist')).toHaveLength(SIDED.length);
  await page.getByRole('button', { name: /^3D$/ }).click();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const editor = (window as unknown as Bridge).__prestesEditor!;
    editor.look(0, 0, 80);
    editor.viewport()!.view.camera.targetYaw = 0;
  });
  await page.waitForTimeout(2500);
  const box = (await page.getByTestId('editor-viewport').boundingBox())!;
  const width = Math.min(box.width, box.height * 1.6) * 0.95;
  const height = width / 1.6;
  mkdirSync('docs/review/buildings', { recursive: true });
  writeFileSync(
    'docs/review/buildings/camp-sides.png',
    await page.screenshot({ clip: { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height } }),
  );
});
