import { expect, test, type Page } from '@playwright/test';

// biome-trees-and-plants 4.1b (D5d): a section in a wood stays visible and selectable.

interface Point {
  x: number;
  y: number;
}

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string }[]; sections: { column: Point[] } };
    toScreen: (x: number, y: number) => Point | null;
    topDown: () => void;
  };
  __prestes?: { frame: () => { units: { id: number; faction: string; squadId: number; x: number; y: number }[] } | null };
  __prestesScene?: {
    focusOn: (x: number, y: number) => void;
    groundToScreen: (x: number, y: number) => Point | null;
    canopy: () => { faded: number; outlines: number };
  };
}

const editor = (page: Page) => ({
  state: () => page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state()),
  screen: async (x: number, y: number) => {
    const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
    if (!point) throw new Error(`${x}, ${y} is off screen`);
    return point;
  },
});

test('a section in a wood: the crowns over its men fade, and a man under them can be clicked', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('teste-mata');
  await page.getByTestId('map-size').selectOption('small');
  await page.getByTestId('map-name-en').fill('Wood');
  await page.getByTestId('map-name-pt').fill('Mata');
  await page.getByTestId('map-submit').click();
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  await page.waitForTimeout(1500);
  const bridge = editor(page);
  const start = (await bridge.state()).sections.column[0]!;

  // A dense Atlantic forest stand over the first section's start.
  await page.locator('[data-tool="trees"]').click();
  await page.getByTestId('tree-mode-scatter').click();
  await page.getByTestId('tree-density').selectOption('dense');
  for (const id of ['jequitiba', 'mulungu', 'pau-brasil']) await page.locator(`[data-tree="${id}"]`).click();
  for (let press = 0; press < 16; press += 1) await page.keyboard.press(']');
  for (const dy of [-10, 0, 10]) {
    const a = await bridge.screen(start.x - 25, start.y + dy);
    const b = await bridge.screen(start.x + 25, start.y + dy);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 10 });
    await page.mouse.up();
  }
  expect((await bridge.state()).objects.length).toBeGreaterThan(30);
  // Trunks block movement: clear a small glade where the section starts.
  await page.getByTestId('tree-mode-erase').click();
  for (let press = 0; press < 12; press += 1) await page.keyboard.press('[');
  // The start must be clear 7 m either side and 2.8 m deep (validate-document).
  const from = await bridge.screen(start.x - 10, start.y + 1.4);
  const to = await bridge.screen(start.x + 10, start.y + 1.4);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();

  await page.getByTestId('editor-playtest').click();
  await page.waitForURL(/index\.html\?playtest=1/);
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0)).toBeGreaterThan(0);
  const men = (await page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!.units)).filter(
    (unit) => unit.faction === 'column' && unit.squadId === 1,
  );
  const centre = { x: men.reduce((sum, man) => sum + man.x, 0) / men.length, y: men.reduce((sum, man) => sum + man.y, 0) / men.length };
  await page.evaluate(([x, y]) => (window as unknown as Bridge).__prestesScene!.focusOn(x!, y!), [centre.x, centre.y]);

  // The crowns over the section fade; the crowns elsewhere in the stand stay solid.
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestesScene!.canopy().faded), { timeout: 15_000 }).toBeGreaterThan(0);

  // Select another section, then click a man of the first under the trees: his section is selected.
  await page.getByTestId('squad-2').click();
  await expect(page.getByTestId('squad-2')).toHaveAttribute('aria-pressed', 'true');
  const man = men[Math.floor(men.length / 2)]!;
  const at = await page.evaluate(([x, y]) => (window as unknown as Bridge).__prestesScene!.groundToScreen(x!, y!), [man.x, man.y]);
  const canvas = await page.locator('canvas').first().boundingBox();
  await page.mouse.click(canvas!.x + at!.x, canvas!.y + at!.y - 12);
  await expect(page.getByTestId('squad-1')).toHaveAttribute('aria-pressed', 'true');
});
