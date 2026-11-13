import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// revise-buildings-and-stone 3.5: pictures of a house in every look, set with
// the editor's variant picker, for the owner's review sheet. A throwaway map;
// nothing is saved. Runs only with PRESTES_REVIEW=1:
//   PRESTES_REVIEW=1 npx playwright test tests/e2e/review-building-variants.spec.ts

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string; variant?: string }[] };
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    viewport: () => { view: { camera: { targetYaw: number; yaw: number; span: number } } } | null;
  };
}

const LOOKS = ['default', 'whitewash', 'ochre', 'blue', 'rose', 'adobe', 'zinc'];
const OUT = process.env.PRESTES_REVIEW_OUT ?? 'docs/review/buildings/variants';

test.skip(!process.env.PRESTES_REVIEW, 'review pictures only on demand');


test('a house in every look, set with the variant picker', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('teste-variantes');
  await page.getByTestId('map-size').selectOption('small');
  await page.getByTestId('map-name-en').fill('Looks');
  await page.getByTestId('map-name-pt').fill('Aparencias');
  await page.getByTestId('map-submit').click();
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  await page.waitForTimeout(1500);
  const screen = async (x: number, y: number) => {
    const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
    if (!point) throw new Error(`${x}, ${y} is off screen`);
    return point;
  };

  const at = LOOKS.map((_, index) => ({ x: -60 + index * 20, y: 0 }));
  await page.locator('[data-tool="place"]').click();
  const button = page.locator('[data-object="casa-terrea"]');
  if (!(await button.isVisible())) await page.locator('details', { has: button }).locator('summary').click();
  await button.click();
  for (const point of at) {
    const spot = await screen(point.x, point.y);
    await page.mouse.click(spot.x, spot.y);
  }
  // Each house is selected and given its look with the picker.
  await page.locator('[data-tool="select"]').click();
  for (const [index, look] of LOOKS.entries()) {
    const spot = await screen(at[index]!.x, at[index]!.y);
    await page.mouse.click(spot.x, spot.y);
    await page.getByTestId('object-variant').locator(`[data-variant="${look}"]`).click();
    await expect(page.getByTestId('object-variant').locator(`[data-variant="${look}"]`)).toHaveAttribute('aria-checked', 'true');
  }
  const objects = (await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state())).objects;
  expect(objects.map((object) => object.variant ?? 'default')).toEqual(LOOKS);

  await page.getByRole('button', { name: /^3D$/ }).click();
  await page.keyboard.press('Escape');
  mkdirSync(OUT, { recursive: true });
  const viewport = page.getByTestId('editor-viewport');
  for (const [index, look] of LOOKS.entries()) {
    await page.evaluate(
      ([x, y]) => {
        const editor = (window as unknown as Bridge).__prestesEditor!;
        editor.look(x!, y!, 18);
        editor.viewport()!.view.camera.targetYaw = Math.PI / 4;
      },
      [at[index]!.x, at[index]!.y],
    );
    await expect
      .poll(() => page.evaluate(() => {
        const camera = (window as unknown as Bridge).__prestesEditor!.viewport()!.view.camera;
        return Math.abs(camera.yaw - Math.PI / 4) < 0.002 && Math.abs(camera.span - 18) < 0.05;
      }))
      .toBe(true);
    await page.waitForTimeout(300);
    const box = (await viewport.boundingBox())!;
    const size = Math.min(box.width, box.height) * 0.6;
    const picture = await page.screenshot({ clip: { x: box.x + (box.width - size) / 2, y: box.y + (box.height - size) / 2, width: size, height: size } });
    writeFileSync(`${OUT}/${index + 1}-${look}.png`, picture);
  }
});
