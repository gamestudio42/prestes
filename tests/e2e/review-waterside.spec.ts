import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// revise-buildings-and-stone 5.1: a canoe and a canoa de tolda afloat in a
// pond and a canoe drawn up on its bank, in the editor's 3D view, for the
// owner's review sheet. A throwaway map; nothing is saved. Runs only with
// PRESTES_REVIEW=1.

interface Bridge {
  __prestesEditor?: {
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    heightAt: (x: number, y: number) => number;
    viewport: () => { view: { camera: { targetYaw: number; yaw: number; span: number } } } | null;
  };
}

test.skip(!process.env.PRESTES_REVIEW, 'review pictures only on demand');

test('boats afloat and on the bank', async ({ page }) => {
  test.setTimeout(120_000);
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
  await page.locator('[data-tool="pond"]').click();
  for (const [x, y] of [[0, -12], [30, -12], [30, 12], [0, 12]] as const) await click(x, y);
  await page.keyboard.press('Enter');
  await page.locator('[data-tool="place"]').click();
  for (const [type, x, y] of [['dugout-canoe', 10, -4], ['canoa-de-tolda', 16, 5], ['dugout-canoe', -6, 0]] as const) {
    const button = page.locator(`[data-object="${type}"]`);
    if (!(await button.isVisible())) await page.locator('details', { has: button }).locator('summary').click();
    await button.click();
    await click(x, y);
  }
  await page.getByRole('button', { name: /^3D$/ }).click();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const editor = (window as unknown as Bridge).__prestesEditor!;
    editor.look(8, 0, 30);
    editor.viewport()!.view.camera.targetYaw = Math.PI / 4;
  });
  await page.waitForTimeout(2500);
  const viewport = page.getByTestId('editor-viewport');
  const box = (await viewport.boundingBox())!;
  const size = Math.min(box.width, box.height) * 0.7;
  mkdirSync('docs/review/buildings', { recursive: true });
  writeFileSync(
    'docs/review/buildings/waterside-afloat.png',
    await page.screenshot({ clip: { x: box.x + (box.width - size) / 2, y: box.y + (box.height - size) / 2, width: size, height: size } }),
  );
});
