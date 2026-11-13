import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// revise-buildings-and-stone 5.3: the six new fences and walls drawn in the
// editor, the open gates standing in gaps left in them, in the 3D view, for
// the owner's review sheet. A throwaway map; nothing is saved. Runs only with
// PRESTES_REVIEW=1.

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string }[]; lineKinds: { kind: string }[] };
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    viewport: () => { view: { camera: { targetYaw: number; tiltOverride: number | null } } } | null;
  };
}

// Each row: a line kind, and the gate in its gap (or none: drawn whole).
// The gap is the gate's width: the fence meets its posts.
const ROWS: [string, string | null, number][] = [
  ['rail-fence', 'farm-gate', 1.9],
  ['bamboo-fence', 'rail-gate', 1.7],
  ['wattle-fence', 'yard-gate', 1],
  ['adobe-wall', null, 0],
  ['coped-wall', 'iron-gate', 2.2],
  ['iron-railing', null, 0],
];

test.skip(!process.env.PRESTES_REVIEW, 'review pictures only on demand');

test('the new fences and walls, and the open gates', async ({ page }) => {
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
  const y = (row: number) => -25 + row * 10;
  await page.locator('[data-tool="line"]').click();
  for (const [row, [kind, gate, half]] of ROWS.entries()) {
    await page.getByTestId('prop-line-kind').selectOption(kind);
    const runs = gate ? [[-18, -half], [half, 18]] : [[-18, 18]];
    for (const [from, to] of runs) {
      await click(from!, y(row));
      await click(to!, y(row));
      await page.keyboard.press('Enter');
    }
  }
  await page.locator('[data-tool="place"]').click();
  for (const [row, [, gate]] of ROWS.entries()) {
    if (!gate) continue;
    const button = page.locator(`[data-object="${gate}"]`);
    if (!(await button.isVisible())) await page.locator('details', { has: button }).locator('summary').click();
    await button.click();
    await click(0, y(row));
  }
  const state = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state());
  expect(new Set(state.lineKinds.map((line) => line.kind))).toEqual(new Set(ROWS.map(([kind]) => kind)));
  expect(state.objects.map((object) => object.type)).toEqual(ROWS.flatMap(([, gate]) => (gate ? [gate] : [])));
  await page.locator('[data-tool="select"]').click();
  await page.getByRole('button', { name: /^3D$/ }).click();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const editor = (window as unknown as Bridge).__prestesEditor!;
    editor.look(0, 0, 46);
    // Low and from a corner, so the open gates' leaves read.
    const camera = editor.viewport()!.view.camera;
    camera.targetYaw = Math.PI / 6;
    camera.tiltOverride = 0.55;
  });
  await page.waitForTimeout(2500);
  const box = (await page.getByTestId('editor-viewport').boundingBox())!;
  const width = Math.min(box.width, box.height * 1.6) * 0.95;
  const height = width / 1.6;
  const clip = { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
  mkdirSync('docs/review/buildings', { recursive: true });
  writeFileSync('docs/review/buildings/fences-and-gates.png', await page.screenshot({ clip }));
  // Close on the gates: the farm gate, the rail gate and the yard gate, then the iron gate.
  for (const [name, row] of [['gates-close', 1], ['iron-gate-close', 4]] as const) {
    await page.evaluate((focus) => (window as unknown as Bridge).__prestesEditor!.look(0, focus, 16), y(row));
    await page.waitForTimeout(2000);
    writeFileSync(`docs/review/buildings/${name}.png`, await page.screenshot({ clip }));
  }
});
