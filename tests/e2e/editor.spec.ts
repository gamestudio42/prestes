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
  trenches: { id: number; kind: string; facing: string; length: number }[];
  sections: { column: Point[]; legalist: Point[] };
  areas: { column: Point[]; legalist: Point[] };
  enemyForces: string[][];
  light: { time: number; bearing: number } | null;
  selection: { kind: string; side?: string; index?: number }[];
  problems: { code: string; severity: string }[] | null;
  canUndo: boolean;
  message: string | null;
}
interface Bridge {
  __prestesEditor?: {
    state: () => EditorState;
    toScreen: (x: number, y: number) => Point | null;
    sun: () => [number, number, number] | null;
    surfaceAt: (x: number, y: number) => string;
    heightAt: (x: number, y: number) => number;
    vegetationAt: (x: number, y: number) => string | null;
    coverKinds: () => Record<string, number>;
    document: () => unknown;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    trenchSlots: (id: number) => { x: number; y: number; guard: { x: number; y: number } | null }[];
    coverPreview: () => { zones: { column: number; legalist: number }; pieces: Record<string, number> };
    position: (kind: 'object' | 'trench', id: number) => { capacity: number; entrances: number; ports: number } | null;
    coverPorts: () => number;
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

/** Points the camera at a ground point with this span, once it settles. */
async function look(page: Page, x: number, y: number, span: number): Promise<void> {
  await page.evaluate(([px, py, s]) => (window as unknown as Bridge).__prestesEditor!.look(px!, py!, s!), [x, y, span]);
  let last = '';
  await expect
    .poll(async () => {
      const now = JSON.stringify(await screen(page, x, y));
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [250] })
    .toBe(true);
}

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

// author-game-maps: the map's enemy presets, under the roster rules.
test('enemy forces: a preset is built under the roster rules, reaches the compiled map, and undo removes it', async ({ page }) => {
  await openEditor(page);
  await newMap(page, 'teste-inimigo', 'medium');
  expect((await state(page)).enemyForces).toEqual([]);
  await page.getByTestId('editor-properties').click();
  await expect(page.getByTestId('enemy-forces')).toBeVisible();
  await page.getByTestId('enemy-preset-add').click();
  // Three rifle sections are 33 men: a fourth is refused, with the reason.
  await expect(page.getByTestId('enemy-preset-0-counters')).toContainText('33');
  await expect(page.getByTestId('enemy-preset-0-add')).toBeDisabled();
  await expect(page.getByTestId('enemy-preset-0-refusal')).toBeVisible();
  await page.getByTestId('enemy-preset-0-section-2-remove').click();
  await page.getByTestId('enemy-preset-0-type').selectOption('metralhadora');
  await expect(page.getByTestId('enemy-preset-0-add')).toBeEnabled();
  await page.getByTestId('enemy-preset-0-add').click();
  await page.getByTestId('map-submit').click();
  await settle(page);
  expect((await state(page)).enemyForces).toEqual([['fuzileiros', 'fuzileiros', 'metralhadora']]);
  await page.getByTestId('editor-undo').click();
  await settle(page);
  expect((await state(page)).enemyForces).toEqual([]);
});

test('time of day: the slider moves the sun in the view, the document stores it, undo restores it', async ({ page }, testInfo) => {
  await openEditor(page);
  await newMap(page, 'teste-luz', 'medium');
  const before = await state(page);
  const sunBefore = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.sun());
  await page.getByTestId('editor-properties').click();
  await page.getByTestId('map-light-time').fill('17');
  await page.getByTestId('map-light-bearing').fill('270');
  // Live preview: the sun moves before the dialog is applied.
  const sunPreview = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.sun());
  expect(sunPreview).not.toEqual(sunBefore);
  expect(sunPreview![0]).toBeLessThan(0); // west is -x
  await page.getByTestId('map-submit').click();
  await settle(page);
  expect((await state(page)).light).toEqual({ time: 17, bearing: 270 });
  await page.screenshot({ path: testInfo.outputPath('light-17h-west.png') });
  await page.getByTestId('editor-undo').click();
  await settle(page);
  expect((await state(page)).light).toEqual(before.light);
  expect(await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.sun())).toEqual(sunBefore);
  await page.getByTestId('editor-properties').click();
  await page.getByTestId('map-light-time').fill('7');
  await page.getByTestId('map-light-bearing').fill('90');
  await page.getByTestId('map-submit').click();
  await settle(page);
  await page.screenshot({ path: testInfo.outputPath('light-7h-east.png') });
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
  // refine-map-editor D1: the road leaves the relief alone (no sink, no camber); its ditch still digs.
  expect(await heightAt(page, 0, 10)).toBeCloseTo(0, 3);
  await expect(page.getByLabel(/camber|abaulamento/i)).toHaveCount(0);
  expect((await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.coverKinds())).trench ?? 0).toBeGreaterThan(0);

  await tool(page, 'select');
  await dragGround(page, { x: 0, y: 10 }, { x: 0, y: 40 });
  expect(await surfaceAt(page, 0, 40)).toBe('dirt-road');
  await page.getByTestId('editor-undo').click();
  expect(await surfaceAt(page, 0, 40)).not.toBe('dirt-road');
  expect(await surfaceAt(page, 0, 10)).toBe('dirt-road');
});

test('a 60 m fire trench faces north, flips with X, and its slots are the game\'s', async ({ page }) => {
  // refine-map-editor 2.5.
  await openEditor(page);
  await tool(page, 'trench');
  await clickGround(page, -30, 0);
  await clickGround(page, 30, 0);
  await page.keyboard.press('Enter');
  const [trench] = (await state(page)).trenches;
  expect(trench).toMatchObject({ kind: 'fire', facing: 'left' });
  expect(trench!.length).toBeCloseTo(60, 0);
  type Slot = { x: number; y: number; guard: { x: number; y: number } | null };
  const slots = () => page.evaluate((id) => (window as unknown as { __prestesEditor: { trenchSlots: (id: number) => Slot[] } }).__prestesEditor.trenchSlots(id), trench!.id);
  // Travelling east, left is north: one slot per 1.2 m on the fire step, facing north.
  const north = await slots();
  expect(north).toHaveLength(50);
  expect(north.every((slot) => slot.guard!.y < -0.99 && slot.y < 0)).toBe(true);

  await tool(page, 'select');
  await clickGround(page, 10, 0);
  await expect(page.getByTestId('trench-slots')).toContainText('50');
  await expect(page.getByTestId('trench-length')).toContainText('60');
  await page.keyboard.press('KeyX');
  expect((await state(page)).trenches[0]!.facing).toBe('right');
  const south = await slots();
  expect(south).toHaveLength(50);
  expect(south.every((slot) => slot.guard!.y > 0.99 && slot.y > 0)).toBe(true);
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

// garrison-and-assault 4.6: the properties panel reads what the battle makes of a building and a trench line.
test('a farmhouse and a trench line show their capacity, entrances and ports; the cover overlay draws the ports', async ({ page }) => {
  await openEditor(page);
  await tool(page, 'place');
  await page.locator('details', { has: page.locator('[data-object="farmhouse"]') }).locator('summary').click();
  await page.locator('[data-object="farmhouse"]').click();
  await clickGround(page, 40, 30);
  await tool(page, 'trench');
  await clickGround(page, -15, 0);
  await clickGround(page, 15, 0);
  await page.keyboard.press('Enter');
  const current = await state(page);
  const farmhouse = current.objects[0]!;
  const trench = current.trenches[0]!;
  const position = (kind: 'object' | 'trench', id: number) =>
    page.evaluate(([k, i]) => (window as unknown as Bridge).__prestesEditor!.position(k as 'object' | 'trench', i as number), [kind, id] as const);
  const house = (await position('object', farmhouse.id))!;
  const line = (await position('trench', trench.id))!;
  expect(house.capacity).toBe(6);

  await tool(page, 'select');
  await clickGround(page, 40, 30);
  await expect(page.getByTestId('position-capacity')).toHaveAttribute('data-value', '6');
  await expect(page.getByTestId('position-capacity')).toContainText('6');
  await expect(page.getByTestId('position-entrances')).toHaveAttribute('data-value', String(house.entrances));
  await expect(page.getByTestId('position-ports')).toHaveAttribute('data-value', String(house.ports));
  expect(house.entrances).toBeGreaterThan(0);
  expect(house.ports).toBeGreaterThan(0);

  await clickGround(page, 10, 0);
  await expect(page.getByTestId('position-capacity')).toHaveAttribute('data-value', String(line.capacity));
  await expect(page.getByTestId('position-ports')).toHaveAttribute('data-value', String(line.ports));

  // The cover overlay draws a tick at every post of both.
  const ports = () => page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.coverPorts());
  expect(await ports()).toBe(0);
  await page.getByTestId('editor-cover').click();
  await expect.poll(ports).toBe(house.ports + line.ports);
});

test("count the slots of a trench: its badge and hover show the game's slots on the fire step", async ({ page }) => {
  // refine-map-editor 6.1.
  await openEditor(page);
  await tool(page, 'trench');
  await clickGround(page, -15, 0);
  await clickGround(page, 15, 0);
  await page.keyboard.press('Enter');
  const [trench] = (await state(page)).trenches;
  const slots = await page.evaluate((id) => (window as unknown as Bridge).__prestesEditor!.trenchSlots(id), trench!.id);
  expect(slots).toHaveLength(25);
  // The dots line the fire step: 0.45 m forward of the centreline, toward the parapet (north).
  expect(slots.every((slot) => Math.abs(slot.y + 0.45) < 0.01)).toBe(true);

  await page.getByTestId('editor-cover').click();
  await look(page, 0, 0, 80);
  const badge = page.locator(`.editor-badge[data-piece="trench:${trench!.id}"]`);
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(String(slots.length));
  const at = await screen(page, slots[3]!.x, slots[3]!.y);
  await page.mouse.move(at.x, at.y);
  await expect(page.getByTestId('cover-hover')).toHaveAttribute('data-count', String(slots.length));
  await expect(badge).toHaveAttribute('data-hover', 'true');

  // At strategic span the badges cluster per 50 m cell.
  await look(page, 0, 0, 240);
  await expect(badge).toBeHidden();
  await expect(page.locator('.editor-badge[data-cluster]').first()).toHaveText(String(slots.length));
});

test('zone totals: a stone wall inside the column zone adds its slots there', async ({ page }) => {
  // refine-map-editor 6.1.
  await openEditor(page);
  await page.getByTestId('editor-cover').click();
  const section = (await state(page)).sections.column[0]!;
  const total = page.getByTestId('zone-total-column');
  const before = Number(await total.getAttribute('data-total'));
  const legalist = await page.getByTestId('zone-total-legalist').getAttribute('data-total');
  await tool(page, 'line');
  await clickGround(page, section.x - 10, section.y + 15);
  await clickGround(page, section.x + 10, section.y + 15);
  await page.keyboard.press('Enter');
  const { pieces } = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.coverPreview());
  const wall = pieces['line:1'];
  expect(wall).toBeGreaterThan(20);
  await expect(total).toHaveAttribute('data-total', String(before + wall!));
  await expect(page.getByTestId('zone-total-legalist')).toHaveAttribute('data-total', legalist!);
  await expect(page.getByTestId('cover-panel')).toContainText(String(before + wall!));
});

test('W A S D move the camera and pick no tool; Q and E turn it', async ({ page }) => {
  // Hand check 2026-11-09: the battle's camera keys are not tool shortcuts.
  await openEditor(page);
  await tool(page, 'paint');
  const before = await screen(page, 0, 0);
  for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(150);
    await page.keyboard.up(key);
    expect((await state(page)).tool).toBe('paint');
  }
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  const after = await screen(page, 0, 0);
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(20);
  // The tools that had those letters moved: wall L, trees Y, deployment K, eraser C, smooth M.
  for (const [key, id] of [['l', 'line'], ['y', 'trees'], ['k', 'deployment'], ['c', 'erase'], ['m', 'smooth']] as const) {
    await page.keyboard.press(key);
    expect((await state(page)).tool).toBe(id);
  }
});

test('the vegetation brush plants corn', async ({ page }) => {
  await openEditor(page);
  await tool(page, 'vegetation');
  await page.getByTestId('prop-vegetation').selectOption({ label: 'Corn' });
  await dragGround(page, { x: -3, y: -40 }, { x: 3, y: -40 });
  expect(await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.vegetationAt(0, -40))).toBe('corn');
});

// author-game-maps: density is the look only; the painted kind stays capim.
test('vegetation density: dense capim is painted, the kind and the concealment stay capim', async ({ page }) => {
  await openEditor(page);
  await tool(page, 'vegetation');
  await page.getByTestId('prop-vegetation').selectOption({ label: 'Capim' });
  await page.getByTestId('prop-vegetation-density').selectOption({ label: 'Dense' });
  await dragGround(page, { x: -3, y: -40 }, { x: 3, y: -40 });
  expect(await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.vegetationAt(0, -40))).toBe('tall-grass');
});

test('capim painted across a river grows on both banks, not in the water', async ({ page }) => {
  // refine-map-editor 3.1: the brush skips cells where nothing grows.
  await openEditor(page);
  await tool(page, 'river');
  await clickGround(page, -80, 0);
  await clickGround(page, 80, 0);
  await page.keyboard.press('Enter');
  await tool(page, 'vegetation');
  await page.getByTestId('prop-vegetation').selectOption({ label: 'Capim' });
  await dragGround(page, { x: 0, y: -16 }, { x: 0, y: 16 });
  const plant = (x: number, y: number) => page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.vegetationAt(px!, py!), [x, y]);
  expect(await plant(0.5, 0.5)).toBeNull();
  expect(await plant(0.5, -14.5)).toBe('tall-grass');
  expect(await plant(0.5, 14.5)).toBe('tall-grass');
});

// author-game-maps: a river drawn deep gets a ford on one stretch afterwards, and undo restores it.
test('river stretches: a stretch of a drawn river is set to a ford, and undo makes it deep again', async ({ page }) => {
  await openEditor(page);
  await newMap(page, 'teste-rio', 'small');
  await tool(page, 'river');
  await clickGround(page, -60, 0);
  await clickGround(page, 0, 0);
  await clickGround(page, 60, 0);
  await page.keyboard.press('Enter');
  await tool(page, 'select');
  await clickGround(page, 30, 0);
  await expect(page.getByTestId('river-stretches')).toBeVisible();
  const kinds = async () => ((await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.document())) as { rivers: { kinds: string[] }[] }).rivers[0]!.kinds;
  expect(await kinds()).toEqual(['deep', 'deep']);
  await page.getByTestId('river-stretch-1').selectOption('ford');
  expect(await kinds()).toEqual(['deep', 'ford']);
  await page.getByTestId('editor-undo').click();
  expect(await kinds()).toEqual(['deep', 'deep']);
});

// refine-map-editor 5.1: the trees tool.
async function cerradoGrove(page: Page): Promise<{ id: number; type: string; x: number; y: number }[]> {
  await openEditor(page);
  await tool(page, 'river');
  await clickGround(page, -80, 0);
  await clickGround(page, 80, 0);
  await page.keyboard.press('Enter');
  await tool(page, 'trees');
  await page.getByTestId('tree-mode-scatter').click();
  await page.getByTestId('tree-biome').selectOption('cerrado');
  await page.getByTestId('tree-density').selectOption('medium');
  // A 20 m brush.
  for (let press = 0; press < 16; press += 1) await page.keyboard.press(']');
  const before = (await state(page)).objects.length;
  await dragGround(page, { x: -10, y: 10 }, { x: 10, y: 10 });
  const objects = (await state(page)).objects;
  expect(objects.length).toBeGreaterThan(before);
  return objects.filter((object) => ['cerrado-tree', 'buriti', 'bush'].includes(object.type));
}

test('scatter a cerrado grove: cerrado trees inside the stroke, 2 m apart, none in the water', async ({ page }) => {
  const trees = await cerradoGrove(page);
  expect(trees.length).toBeGreaterThan(5);
  for (const tree of trees) {
    // Inside the stroke: within the brush's 10 m of the line from (-10, 10) to (10, 10).
    const dx = Math.max(0, Math.abs(tree.x) - 10);
    expect(Math.hypot(dx, tree.y - 10)).toBeLessThanOrEqual(10.2);
    // The river is 14 m wide along y = 0.
    expect(Math.abs(tree.y)).toBeGreaterThan(7);
  }
  for (let a = 0; a < trees.length; a += 1) {
    for (let b = a + 1; b < trees.length; b += 1) expect(Math.hypot(trees[a]!.x - trees[b]!.x, trees[a]!.y - trees[b]!.y)).toBeGreaterThanOrEqual(2);
  }
  // The thumbnails show the species.
  await expect(page.locator('[data-thumbnail="cerrado-tree"]')).toBeVisible();
  // One stroke is one undo step.
  await page.keyboard.press('Control+z');
  expect((await state(page)).objects.filter((object) => object.type === 'cerrado-tree' || object.type === 'buriti' || object.type === 'bush')).toHaveLength(0);
});

// author-game-maps: in scatter mode the author picks the species; the biome only fills the starting list.
test('scatter with chosen species: switching araucária off plants none along the river', async ({ page }) => {
  await openEditor(page);
  await tool(page, 'river');
  await clickGround(page, -80, 0);
  await clickGround(page, 80, 0);
  await page.keyboard.press('Enter');
  await tool(page, 'trees');
  await page.getByTestId('tree-mode-scatter').click();
  await page.getByTestId('tree-biome').selectOption('atlantic-edge');
  await expect(page.getByTestId('tree-mix-hint')).toBeVisible();
  const araucaria = page.locator('[data-tree="tree-araucaria"]');
  await expect(araucaria).toHaveAttribute('aria-selected', 'true');
  await araucaria.click();
  await expect(araucaria).toHaveAttribute('aria-selected', 'false');
  await page.getByTestId('tree-density').selectOption('dense');
  for (let press = 0; press < 16; press += 1) await page.keyboard.press(']');
  await dragGround(page, { x: -40, y: 14 }, { x: 40, y: 14 });
  const types = new Set((await state(page)).objects.map((object) => object.type));
  expect(types.has('tree-broad')).toBe(true);
  expect(types.has('tree-araucaria')).toBe(false);
});

test('erase trees: the trees under the brush go, and undo brings them back', async ({ page }) => {
  const grove = await cerradoGrove(page);
  await page.getByTestId('tree-mode-erase').click();
  // A 6 m brush across the western half.
  for (let press = 0; press < 14; press += 1) await page.keyboard.press('[');
  await dragGround(page, { x: -12, y: 12 }, { x: -2, y: 12 });
  const left = (await state(page)).objects;
  const gone = grove.filter((tree) => !left.some((object) => object.id === tree.id));
  expect(gone.length).toBeGreaterThan(0);
  expect(gone.length).toBeLessThan(grove.length);
  for (const tree of gone) expect(tree.x).toBeLessThan(2);
  await page.keyboard.press('Control+z');
  const back = (await state(page)).objects;
  for (const tree of grove) expect(back.some((object) => object.id === tree.id)).toBe(true);
});

test('the section starts follow the deployment area (author-game-maps 8.3)', async ({ page }) => {
  await openEditor(page);
  const before = (await state(page)).sections.column;
  await tool(page, 'deployment');
  // Grabbing where a section point used to be now grabs the area itself.
  await dragGround(page, before[1]!, { x: before[1]!.x, y: before[1]!.y - 20 });
  const after = (await state(page)).sections.column;
  expect(after).toEqual(before.map((p) => ({ x: p.x, y: p.y - 20 })));
  expect((await state(page)).selection).toEqual([{ kind: 'area', side: 'column' }]);
});

test('shape a deployment area', async ({ page }) => {
  await openEditor(page);
  await tool(page, 'deployment');
  const area = (await state(page)).areas.legalist;
  const corner = area[0]!;
  // Drag a corner: the area follows.
  const moved = { x: corner.x + 10, y: corner.y - 10 };
  await dragGround(page, corner, moved);
  const dragged = (await state(page)).areas.legalist[0]!;
  expect(Math.hypot(dragged.x - moved.x, dragged.y - moved.y)).toBeLessThanOrEqual(1.5); // the drag snaps to the grid
  // Double-click an edge: a corner is added there.
  const [a, b] = [(await state(page)).areas.legalist[1]!, (await state(page)).areas.legalist[2]!];
  const mid = await screen(page, (a.x + b.x) / 2, (a.y + b.y) / 2);
  await page.mouse.dblclick(mid.x, mid.y);
  expect((await state(page)).areas.legalist).toHaveLength(area.length + 1);
  // Select that corner and Delete it.
  const added = (await state(page)).areas.legalist[2]!;
  await clickGround(page, added.x, added.y);
  expect((await state(page)).selection).toEqual([{ kind: 'area', side: 'legalist', point: 2 }]);
  await page.keyboard.press('Delete');
  expect((await state(page)).areas.legalist).toHaveLength(area.length);
  // Drag the whole legalist area onto the column's: the areas overlap (its section starts go with it).
  const { column, legalist } = (await state(page)).sections;
  const centre = (points: Point[]) => ({ x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length });
  const shift = { x: centre(column).x - centre(legalist).x, y: centre(column).y - centre(legalist).y };
  const grab = { x: (legalist[0]!.x + legalist[1]!.x) / 2, y: (legalist[0]!.y + legalist[1]!.y) / 2 };
  await dragGround(page, grab, { x: grab.x + shift.x, y: grab.y + shift.y });
  await page.getByTestId('editor-validate').click();
  await expect(page.locator('[data-code="areas-overlap"]')).toBeVisible();
  await expect(page.locator('[data-code="section-outside-area"]')).toHaveCount(0);
});

test('a section start in a pond is a problem; choosing it selects the area', async ({ page }) => {
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
  expect(current.selection).toEqual([{ kind: 'area', side: 'legalist' }]);
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
  await tool(page, 'deployment');
  await dragGround(page, before, { x: before.x - 30, y: before.y });
  // author-game-maps 8: the drag moves the side's area; the section start is
  // derived from the area again, so it moves 30 m west and y may re-round.
  const moved = (await state(page)).sections.column[0]!;
  expect(moved.x).toBe(before.x - 30);
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
  // add-deployment-phase 3.3: the playtest opens in deployment, bound by the map's areas.
  await expect(page.getByTestId('deployment-banner')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __prestes: { frame: () => { phase?: string } } }).__prestes.frame().phase)).toBe('deployment');
  const enemy = units.filter((unit) => unit.faction === 'legalist');
  const enemyCentre = { x: enemy.reduce((sum, unit) => sum + unit.x, 0) / enemy.length, y: enemy.reduce((sum, unit) => sum + unit.y, 0) / enemy.length };
  const ids = (await page.evaluate(() => (window as unknown as { __prestes: { frame: () => { units: { id: number; faction: string; squadId: number }[] } } }).__prestes.frame().units))
    .filter((unit) => unit.faction === 'column' && unit.squadId === 1)
    .map((unit) => unit.id);
  await page.evaluate(([unitIds, to]) => (window as unknown as { __prestes: { command: (command: unknown) => void } }).__prestes.command({ type: 'move', unitIds, to }), [ids, enemyCentre] as const);
  await expect(page.getByTestId('deployment-refusal')).toHaveAttribute('data-reason', 'outside_deployment_area');
  await page.getByTestId('start-battle').click();
  await expect(page.getByTestId('deployment-banner')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __prestes: { frame: () => { phase?: string } } }).__prestes.frame().phase))
    .toBe('battle');
  await page.getByTestId('playtest-back').click();
  await page.waitForURL(/editor\.html/);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  expect((await state(page)).id).toBe('teste-jogo');
});

// author-game-maps 4.1: a new map takes a campaign slot, and the document records the mission.
test('slots: a new map for a campaign mission records it, and saving over a held mission asks first', async ({ page }) => {
  await openEditor(page);
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('teste-anel');
  await page.getByTestId('map-name-en').fill('Iron ring');
  await page.getByTestId('map-name-pt').fill('Anel de ferro');
  await expect(page.getByTestId('map-slot').locator('option[value="mission:anel-de-ferro"]')).toHaveText(/^02 /);
  await page.getByTestId('map-slot').selectOption('mission:anel-de-ferro');
  await expect(page.getByTestId('map-slot-hint')).toBeVisible();
  await page.getByTestId('map-source').fill('Campaign book, chapter 02.');
  await page.getByTestId('map-submit').click();
  await settle(page);
  const document = (await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.document())) as { use: string; mission?: string };
  expect(document).toMatchObject({ use: 'campaign', mission: 'anel-de-ferro' });

  // The dev server answers that another map holds the mission; the editor asks, then saves with replace.
  const saves: string[] = [];
  await page.route('**/__editor/save-map**', async (route) => {
    const url = route.request().url();
    saves.push(url);
    if (url.includes('replace=1')) await route.fulfill({ status: 200, json: { ok: true, file: 'teste-anel.map.json', moved: 'outro-anel' } });
    else await route.fulfill({ status: 409, json: { ok: false, reason: 'mission-taken', holder: 'outro-anel' } });
  });
  let asked = '';
  page.once('dialog', (dialog) => {
    asked = dialog.message();
    void dialog.accept();
  });
  await page.getByTestId('editor-save-project').click();
  await expect(page.getByTestId('editor-message')).toContainText('outro-anel');
  expect(asked).toContain('outro-anel');
  expect(saves).toHaveLength(2);
  expect(saves[1]).toContain('replace=1');
});

// author-game-maps 4.2: Open lists the project's maps by slot and loads one.
test('open: the project maps are listed by slot, and opening one loads it', async ({ page }) => {
  await openEditor(page);
  await page.getByTestId('editor-open').click();
  await expect(page.getByTestId('open-dialog')).toBeVisible();
  await expect(page.getByTestId('open-slot-anel-de-ferro')).toBeVisible();
  await expect(page.getByTestId('open-test').getByTestId('open-map-campo-de-provas')).toBeVisible();
  await page.getByTestId('open-campo-de-provas').click();
  await settle(page);
  await expect(page.getByTestId('open-dialog')).toHaveCount(0);
  expect((await state(page)).id).toBe('campo-de-provas');
});

// author-game-maps 5.4: the framed view becomes the map's thumbnail.
test('thumbnail: the editor sends the framed view as a square PNG', async ({ page }) => {
  await openEditor(page);
  let body = '';
  await page.route('**/__editor/thumbnail**', async (route) => {
    body = route.request().postData() ?? '';
    await route.fulfill({ status: 200, json: { ok: true, file: 'apps/game/public/maps/novo-mapa.png' } });
  });
  await page.getByTestId('editor-thumbnail').click();
  await expect(page.getByTestId('editor-message')).toContainText('novo-mapa.png');
  expect(body.startsWith('data:image/png;base64,')).toBe(true);
  const size = await page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return [image.width, image.height];
  }, body);
  expect(size).toEqual([256, 256]);
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

// add-map-objectives 1.3: the objective tool places an objective, its fields edit it, undo takes it back.
test('the objective tool places, names and removes an objective', async ({ page }) => {
  await openEditor(page);
  await newMap(page, 'teste-objetivo', 'small');
  await tool(page, 'objective');
  await clickGround(page, 10, -20);
  const objectives = async () => ((await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.document())) as { objectives?: { name: { 'pt-BR': string }; owner: string; flag: { x: number; y: number } }[] }).objectives ?? [];
  await expect.poll(async () => (await objectives()).length).toBe(1);
  const placed = (await objectives())[0]!;
  expect(Math.hypot(placed.flag.x - 10, placed.flag.y + 20)).toBeLessThan(2);
  await page.getByTestId('objective-name-pt').fill('Ponte');
  await page.getByTestId('objective-owner').selectOption('legalist');
  await expect.poll(async () => (await objectives())[0]?.owner).toBe('legalist');
  expect((await objectives())[0]!.name['pt-BR']).toBe('Ponte');
  await page.getByTestId('editor-undo').click();
  await expect.poll(async () => (await objectives())[0]?.owner).toBe('neutral');
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await objectives()).length).toBe(0);
});
