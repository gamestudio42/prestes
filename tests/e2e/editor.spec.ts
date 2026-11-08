import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// add-map-editor: the map editor page, driven with real pointer events.

interface Point {
  x: number;
  y: number;
}
interface EditorState {
  id: string;
  size: string;
  tool: string;
  overlay: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  objects: { id: number; type: string; x: number; y: number }[];
  roads: number;
  lines: number;
  ponds: number;
  sections: { column: Point[]; legalist: Point[] };
  selection: { kind: string; side?: string; index?: number }[];
  problems: { code: string; severity: string }[] | null;
  canUndo: boolean;
  message: string | null;
}
interface Bridge {
  __prestesEditor?: {
    state: () => EditorState;
    toScreen: (x: number, y: number) => Point | null;
    surfaceAt: (x: number, y: number) => string;
    heightAt: (x: number, y: number) => number;
    vegetationAt: (x: number, y: number) => string | null;
    coverKinds: () => Record<string, number>;
    document: () => unknown;
    topDown: () => void;
  };
  __prestes?: { frame: () => { units: unknown[] } | null };
}

const state = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state());
const surfaceAt = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.surfaceAt(px!, py!), [x, y]);
const heightAt = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.heightAt(px!, py!), [x, y]);

async function screen(page: Page, x: number, y: number): Promise<Point> {
  const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
  if (!point) throw new Error(`ground point ${x}, ${y} is not on screen`);
  return point;
}

/** Opens the editor on a fresh map, top-down and framed, once the camera settles. */
async function openEditor(page: Page): Promise<void> {
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await settle(page);
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  // The camera eases to its target; wait until a ground point stops moving.
  let last = '';
  await expect
    .poll(async () => {
      const now = JSON.stringify(await screen(page, 0, 0));
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [250] })
    .toBe(true);
}

async function clickGround(page: Page, x: number, y: number): Promise<void> {
  const point = await screen(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function dragGround(page: Page, from: Point, to: Point, hold = 0): Promise<void> {
  const a = await screen(page, from.x, from.y);
  const b = await screen(page, to.x, to.y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  if (hold) await page.waitForTimeout(hold);
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

const tool = (page: Page, id: string) => page.locator(`[data-tool="${id}"]`).click();

async function newMap(page: Page, id: string, size: 'small' | 'medium' | 'large'): Promise<void> {
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill(id);
  await page.getByTestId('map-size').selectOption(size);
  await page.getByTestId('map-name-en').fill('Test field');
  await page.getByTestId('map-name-pt').fill('Campo de teste');
  await page.getByTestId('map-submit').click();
  await settle(page);
}

test('a new medium map is 400 m across, and shrinking a large one warns about objects outside', async ({ page }) => {
  await openEditor(page);
  await newMap(page, 'teste-medio', 'medium');
  let current = await state(page);
  expect(current.id).toBe('teste-medio');
  expect(current.bounds).toEqual({ minX: -200, minY: -200, maxX: 200, maxY: 200 });

  await newMap(page, 'teste-grande', 'large');
  expect((await state(page)).bounds.maxX).toBe(320);
  await tool(page, 'place');
  await clickGround(page, 280, 0);
  expect((await state(page)).objects).toHaveLength(1);

  let warning = '';
  page.once('dialog', (dialog) => {
    warning = dialog.message();
    void dialog.accept();
  });
  await page.getByTestId('editor-properties').click();
  await page.getByTestId('map-size').selectOption('medium');
  await page.getByTestId('map-submit').click();
  expect(warning).toContain('Boulder');
  current = await state(page);
  expect(current.bounds.maxX).toBe(200);
  expect(current.objects).toHaveLength(0);
});

test('the texture brush paints mud the game reads, and undo restores it', async ({ page }) => {
  await openEditor(page);
  expect(await surfaceAt(page, 0, 0)).not.toBe('mud');
  await tool(page, 'paint');
  await page.locator('[data-material="mud"]').click();
  await dragGround(page, { x: -2, y: 0 }, { x: 2, y: 0 });
  expect(await surfaceAt(page, 0, 0)).toBe('mud');
  await page.getByTestId('editor-undo').click();
  expect(await surfaceAt(page, 0, 0)).not.toBe('mud');
});

test('the raise brush grows a hill and the relief view comes on', async ({ page }) => {
  await openEditor(page);
  expect((await state(page)).overlay).toBe('none');
  await tool(page, 'raise');
  expect((await state(page)).overlay).toBe('relief');
  await dragGround(page, { x: 20, y: 20 }, { x: 20.5, y: 20 }, 1200);
  expect(await heightAt(page, 20, 20)).toBeGreaterThan(0.8);
  expect(await heightAt(page, 60, 60)).toBe(0);
  await expect(page.locator('.editor-legend')).toBeVisible();
});

test('a dirt road with a ditch reaches the game, a point moves, undo puts it back', async ({ page }) => {
  await openEditor(page);
  await tool(page, 'road');
  await clickGround(page, -60, 0);
  await clickGround(page, 0, 10);
  await clickGround(page, 60, 0);
  await page.keyboard.press('Enter');
  expect((await state(page)).roads).toBe(1);
  expect(await surfaceAt(page, 0, 10)).toBe('dirt-road');
  expect((await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.coverKinds())).trench ?? 0).toBeGreaterThan(0);

  await tool(page, 'select');
  await dragGround(page, { x: 0, y: 10 }, { x: 0, y: 40 });
  expect(await surfaceAt(page, 0, 40)).toBe('dirt-road');
  await page.getByTestId('editor-undo').click();
  expect(await surfaceAt(page, 0, 40)).not.toBe('dirt-road');
  expect(await surfaceAt(page, 0, 10)).toBe('dirt-road');
});

test('a placed farmhouse and a drawn stone wall become cover', async ({ page }) => {
  await openEditor(page);
  await tool(page, 'place');
  await page.locator('details', { has: page.locator('[data-object="farmhouse"]') }).locator('summary').click();
  await page.locator('[data-object="farmhouse"]').click();
  await clickGround(page, 40, 30);
  await tool(page, 'line');
  await clickGround(page, -40, -20);
  await clickGround(page, 0, -20);
  await page.keyboard.press('Enter');
  const current = await state(page);
  expect(current.objects.map((object) => object.type)).toEqual(['farmhouse']);
  expect(current.lines).toBe(1);
  const kinds = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.coverKinds());
  expect(kinds.building ?? 0).toBeGreaterThan(0);
  expect(kinds['low-wall'] ?? 0).toBeGreaterThan(0);
});

test('the vegetation brush plants corn', async ({ page }) => {
  await openEditor(page);
  await tool(page, 'vegetation');
  await page.getByTestId('prop-vegetation').selectOption({ label: 'Corn' });
  await dragGround(page, { x: -3, y: -40 }, { x: 3, y: -40 });
  expect(await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.vegetationAt(0, -40))).toBe('corn');
});

test('a section point drags to a new place', async ({ page }) => {
  await openEditor(page);
  const before = (await state(page)).sections.column[0]!;
  await tool(page, 'deployment');
  await dragGround(page, before, { x: before.x, y: before.y - 20 });
  const after = (await state(page)).sections.column[0]!;
  expect(after.x).toBe(before.x);
  expect(after.y).toBe(before.y - 20);
});

test('a section in a pond is a problem; choosing it selects the section', async ({ page }) => {
  await openEditor(page);
  const section = (await state(page)).sections.legalist[1]!;
  await tool(page, 'pond');
  for (const [dx, dy] of [[-12, -10], [12, -10], [12, 10], [-12, 10]] as const) await clickGround(page, section.x + dx, section.y + dy);
  await page.keyboard.press('Enter');
  expect((await state(page)).ponds).toBe(1);
  await page.getByTestId('editor-validate').click();
  const problem = page.locator('[data-code="section-not-walkable"]');
  await expect(problem).toBeVisible();
  await problem.locator('button').click();
  const current = await state(page);
  expect(current.tool).toBe('deployment');
  expect(current.selection).toEqual([{ kind: 'section', side: 'legalist', index: 1 }]);
});

test('export and import round-trip the map; a bad file leaves it unchanged', async ({ page }, testInfo) => {
  await openEditor(page);
  await tool(page, 'paint');
  await page.locator('[data-material="sand"]').click();
  await dragGround(page, { x: -5, y: 5 }, { x: 5, y: 5 });
  const exported = await page.evaluate(() => JSON.stringify((window as unknown as Bridge).__prestesEditor!.document()));

  const downloading = page.waitForEvent('download');
  await page.getByTestId('editor-export').click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('novo-mapa.map.json');
  const path = testInfo.outputPath('novo-mapa.map.json');
  await download.saveAs(path);

  await newMap(page, 'outro', 'small');
  await page.getByTestId('editor-import-input').setInputFiles(path);
  await expect.poll(async () => (await state(page)).id).toBe('novo-mapa');
  const imported = await page.evaluate(() => JSON.stringify((window as unknown as Bridge).__prestesEditor!.document()));
  expect(imported).toBe(exported);
  expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(JSON.parse(exported));

  await page.getByTestId('editor-import-input').setInputFiles({ name: 'bad.map.json', mimeType: 'application/json', buffer: Buffer.from('{"hello": 1}') });
  await expect(page.getByTestId('editor-message')).toContainText('not a Prestes map');
  const after = await page.evaluate(() => JSON.stringify((window as unknown as Bridge).__prestesEditor!.document()));
  expect(after).toBe(exported);
});

test('playtest starts the 3 vs 3 on the edited map and returns to the editor', async ({ page }) => {
  await openEditor(page);
  await newMap(page, 'teste-jogo', 'small');
  await tool(page, 'paint');
  await page.locator('[data-material="mud"]').click();
  await dragGround(page, { x: -4, y: 0 }, { x: 4, y: 0 });
  // The first column section moves 30 m west; the battle must start it there.
  const before = (await state(page)).sections.column[0]!;
  const moved = { x: before.x - 30, y: before.y };
  await tool(page, 'deployment');
  await dragGround(page, before, moved);
  expect((await state(page)).sections.column[0]).toEqual(moved);
  await page.getByTestId('editor-playtest').click();
  await page.waitForURL(/index\.html\?playtest=1/);
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0))
    .toBe(66);
  const units = await page.evaluate(() => (window as unknown as { __prestes: { frame: () => { units: { faction: string; squadId: number; x: number; y: number }[] } } }).__prestes.frame().units);
  const first = units.filter((unit) => unit.faction === 'column' && unit.squadId === 1);
  const centre = { x: first.reduce((sum, unit) => sum + unit.x, 0) / first.length, y: first.reduce((sum, unit) => sum + unit.y, 0) / first.length };
  expect(Math.hypot(centre.x - moved.x, centre.y - moved.y)).toBeLessThan(Math.hypot(centre.x - before.x, centre.y - before.y));
  expect(Math.hypot(centre.x - moved.x, centre.y - moved.y)).toBeLessThan(10);
  await page.getByTestId('playtest-back').click();
  await page.waitForURL(/editor\.html/);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  expect((await state(page)).id).toBe('teste-jogo');
});

test('the dev server endpoint refuses a map with errors and writes nothing', async ({ page }) => {
  await openEditor(page);
  await expect(page.getByTestId('editor-save-project')).toBeVisible();
  const document = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.document()) as Record<string, unknown>;
  const response = await page.request.post('/__editor/save-map', { data: { ...document, id: 'zz-e2e-refused', use: 'campaign' } });
  expect(response.status()).toBe(422);
  expect((await response.json()) as { reason: string }).toMatchObject({ reason: expect.stringContaining('source-note-missing') as unknown as string });
  expect((await page.request.get('/__editor/save-map')).status()).toBe(405);
});

test('painted ground, walls, fences and posts draw as pixel art', async ({ page }) => {
  await openEditor(page);
  await newMap(page, 'teste-visual', 'small');
  await tool(page, 'paint');
  const strips: [string, number][] = [['mud', -30], ['gravel', -15], ['cerrado-red-soil', 0], ['caatinga-soil', 15], ['basic-green', 30]];
  await page.getByTestId('editor-overlay').selectOption('none');
  for (const [material, y] of strips) {
    await page.locator(`[data-material="${material}"]`).click();
    for (const x of [-40, -20, 0, 20, 40]) await dragGround(page, { x: x - 10, y }, { x: x + 10, y });
  }
  await tool(page, 'line');
  for (const [kind, y] of [['stone-wall', -55], ['wire-fence', -60], ['board-fence', -65], ['hedgerow', 50]] as const) {
    await page.getByTestId('prop-line-kind').selectOption(kind);
    await clickGround(page, -40, y);
    await clickGround(page, 40, y);
    await page.keyboard.press('Enter');
  }
  // Each wall or fence finished on its own, even after choosing its kind in the panel.
  expect((await state(page)).lines).toBe(4);
  await tool(page, 'place');
  for (const [type, x] of [['lamp', -30], ['telegraph-pole', 0], ['boulder', 30]] as const) {
    const entry = page.locator(`[data-object="${type}"]`);
    if (!(await entry.isVisible())) await page.locator('details', { has: entry }).locator('summary').click();
    await entry.click();
    await clickGround(page, x, 65);
  }
  await tool(page, 'select');
  await settle(page);
  await expect(page.getByTestId('editor-viewport')).toHaveScreenshot('editor-painted-ground.png', { maxDiffPixelRatio: 0.02 });
});
