import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// revise-buildings-and-stone 1.2: pictures of every catalog building as the
// battle draws it today, for the owner's review sheet (and the "after" sheet
// later). A throwaway map built in the test; nothing is saved. Runs only with
// PRESTES_REVIEW=1:
//   PRESTES_REVIEW=1 npx playwright test tests/e2e/review-buildings.spec.ts

interface Point {
  x: number;
  y: number;
}

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string }[] };
    toScreen: (x: number, y: number) => Point | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    viewport: () => { view: { camera: { targetYaw: number; yaw: number; span: number } } } | null;
  };
}

// Each building and its longest side (m, the catalog's footprint), to frame it.
const SIZES: Record<string, number> = {
  farmhouse: 8.7, barn: 11.3, chapel: 9.6, 'casa-sede': 14, 'colonist-house': 7.2, engenho: 16, 'ferry-house': 6.4,
  'terraced-house': 10, 'terraced-house-wide': 10, sobrado: 12, 'casa-terrea': 10, venda: 12, armazem: 16,
  coreto: 6, church: 24, factory: 40, warehouse: 36,
  // revise-buildings-and-stone 3.4: the new buildings.
  'wattle-house': 6, rancho: 10, 'flour-house': 12, 'railway-station': 26, 'telegraph-office': 8, jail: 10, 'town-hall': 14,
  school: 18, 'market-shed': 16, 'water-tank': 12, 'barracks-block': 24, guardhouse: 6, depot: 12,
};
const BUILDINGS = Object.keys(SIZES);
const OUT = process.env.PRESTES_REVIEW_OUT ?? 'docs/review/buildings/before';

test.skip(!process.env.PRESTES_REVIEW, 'review pictures only on demand');

const editor = (page: Page) => ({
  state: () => page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state()),
  screen: async (x: number, y: number) => {
    const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
    if (!point) throw new Error(`${x}, ${y} is off screen`);
    return point;
  },
});

test('every building as drawn today, from the front and the back', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('teste-predios');
  await page.getByTestId('map-size').selectOption('medium');
  await page.getByTestId('map-name-en').fill('Buildings');
  await page.getByTestId('map-name-pt').fill('Predios');
  await page.getByTestId('map-submit').click();
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  await page.waitForTimeout(1500);
  const bridge = editor(page);

  // One building per 50 m cell, six to a row.
  const at = BUILDINGS.map((_, index) => ({ x: -125 + (index % 6) * 50, y: -100 + Math.floor(index / 6) * 50 }));
  await page.locator('[data-tool="place"]').click();
  for (const [index, id] of BUILDINGS.entries()) {
    const button = page.locator(`[data-object="${id}"]`);
    if (!(await button.isVisible())) await page.locator('details', { has: button }).locator('summary').click();
    await button.click();
    const point = await bridge.screen(at[index]!.x, at[index]!.y);
    await page.mouse.click(point.x, point.y);
  }
  expect((await bridge.state()).objects.map((object) => object.type)).toEqual(BUILDINGS);

  // The tactical view the battle uses, with no tool cursor over the scene.
  await page.locator('[data-tool="select"]').click();
  await page.getByRole('button', { name: /^3D$/ }).click();
  await page.keyboard.press('Escape');
  mkdirSync(OUT, { recursive: true });
  const viewport = page.getByTestId('editor-viewport');
  for (const [index, id] of BUILDINGS.entries()) {
    for (const [side, yaw] of [['front', Math.PI / 4], ['back', (5 * Math.PI) / 4]] as const) {
      const span = Math.max(26, SIZES[id]! * 1.5);
      await page.evaluate(
        ([x, y, turn, wide]) => {
          const editorBridge = (window as unknown as Bridge).__prestesEditor!;
          editorBridge.look(x!, y!, wide!);
          editorBridge.viewport()!.view.camera.targetYaw = turn!;
        },
        [at[index]!.x, at[index]!.y, yaw, span],
      );
      // The camera eases; wait until it has arrived.
      await expect
        .poll(() => page.evaluate(([turn, wide]) => {
          const camera = (window as unknown as Bridge).__prestesEditor!.viewport()!.view.camera;
          return Math.abs(camera.yaw - turn!) < 0.002 && Math.abs(camera.span - wide!) < 0.05;
        }, [yaw, span]))
        .toBe(true);
      await page.waitForTimeout(300);
      const box = (await viewport.boundingBox())!;
      const size = Math.min(box.width, box.height) * 0.8;
      const picture = await page.screenshot({
        clip: { x: box.x + (box.width - size) / 2, y: box.y + (box.height - size) / 2, width: size, height: size },
      });
      writeFileSync(`${OUT}/${String(index + 1).padStart(2, '0')}-${id}-${side}.png`, picture);
    }
  }
});
