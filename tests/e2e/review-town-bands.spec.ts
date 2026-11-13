import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// revise-buildings-and-stone 6.1: a small town in the 3D view, close (each
// building whole, its file loaded because the map has a town) and from the
// strategic band (each building without its small features, D8), for the
// owner's review sheet. A throwaway map; nothing is saved. Runs only with
// PRESTES_REVIEW=1.

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string }[] };
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    viewport: () => { view: { camera: { targetYaw: number; tiltOverride: number | null } } } | null;
  };
}

const TOWN = ['church', 'sobrado', 'casa-terrea', 'venda', 'armazem', 'town-hall', 'school', 'jail', 'terraced-house', 'railway-station'];

test.skip(!process.env.PRESTES_REVIEW, 'review pictures only on demand');

test('a town close and from the strategic band', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  await page.waitForTimeout(1500);
  await page.locator('[data-tool="place"]').click();
  const group = page.locator('.editor-catalog details[data-group="building"]');
  if (!(await group.evaluate((element) => (element as HTMLDetailsElement).open))) await group.locator('summary').click();
  for (const [index, type] of TOWN.entries()) {
    await group.locator(`[data-object="${type}"]`).click();
    const point = await page.evaluate(([x, y]) => (window as unknown as Bridge).__prestesEditor!.toScreen(x!, y!), [-40 + (index % 5) * 20, index < 5 ? -12 : 12]);
    await page.mouse.click(point!.x, point!.y);
  }
  expect((await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state())).objects).toHaveLength(TOWN.length);
  await page.locator('[data-tool="select"]').click();
  await page.getByRole('button', { name: /^3D$/ }).click();
  await page.keyboard.press('Escape');
  mkdirSync('docs/review/buildings', { recursive: true });
  const box = (await page.getByTestId('editor-viewport').boundingBox())!;
  const width = Math.min(box.width, box.height * 1.6) * 0.95;
  const clip = { x: box.x + (box.width - width) / 2, y: box.y + (box.height - width / 1.6) / 2, width, height: width / 1.6 };
  for (const [name, span] of [['town-tactical', 70], ['town-strategic', 150]] as const) {
    await page.evaluate((s) => {
      const editor = (window as unknown as Bridge).__prestesEditor!;
      editor.look(0, 0, s);
      editor.viewport()!.view.camera.targetYaw = Math.PI / 6;
    }, span);
    await page.waitForTimeout(3000);
    writeFileSync(`docs/review/buildings/${name}.png`, await page.screenshot({ clip }));
  }
});
