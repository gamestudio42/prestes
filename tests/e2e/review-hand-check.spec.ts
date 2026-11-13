import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// revise-buildings-and-stone 6.4: at the owner's request (2026-11-13), a town
// and a river camp built in the editor and played, for the hand check. Two
// throwaway maps in the test browser; nothing is saved to the project. Runs
// only with PRESTES_REVIEW=1.

interface Bridge {
  __prestesEditor?: {
    state: () => { objects: { type: string; variant?: string }[]; lineKinds: { kind: string }[] };
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    viewport: () => { view: { camera: { targetYaw: number; tiltOverride: number | null } } } | null;
  };
  __prestes?: {
    frame: () => { phase?: string; units: { faction: string; alive: boolean }[] } | null;
  };
}

type Spot = [type: string, x: number, y: number, look?: string];
type Line = [kind: string, points: [number, number][]];

const OUT = 'docs/review/buildings/hand-check';

async function at(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
  if (!point) throw new Error(`${x}, ${y} is off screen`);
  return point;
}

async function click(page: Page, x: number, y: number): Promise<void> {
  const point = await at(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function newMap(page: Page, id: string, en: string, pt: string): Promise<void> {
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill(id);
  await page.getByTestId('map-size').selectOption('small');
  await page.getByTestId('map-name-en').fill(en);
  await page.getByTestId('map-name-pt').fill(pt);
  await page.getByTestId('map-submit').click();
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const editor = (window as unknown as Bridge).__prestesEditor!;
    editor.topDown();
    editor.look(0, 0, 130);
  });
  await page.waitForTimeout(2000);
}

async function place(page: Page, spots: readonly Spot[]): Promise<void> {
  await page.locator('[data-tool="place"]').click();
  for (const [type, x, y] of spots) {
    const button = page.locator(`[data-object="${type}"]`);
    if (!(await button.isVisible())) await page.locator('details', { has: button }).locator('summary').click();
    await button.click();
    await click(page, x, y);
  }
  // Looks and sides, from the selection panel.
  await page.locator('[data-tool="select"]').click();
  for (const [, x, y, look] of spots) {
    if (!look) continue;
    await click(page, x, y);
    const picker = look === 'legalist' ? page.getByTestId('object-side').locator('[data-side="legalist"]') : page.getByTestId('object-variant').locator(`[data-variant="${look}"]`);
    await picker.click();
  }
  await page.keyboard.press('Escape');
}

async function draw(page: Page, lines: readonly Line[]): Promise<void> {
  await page.locator('[data-tool="line"]').click();
  for (const [kind, points] of lines) {
    await page.getByTestId('prop-line-kind').locator(`[data-line-kind="${kind}"]`).click();
    for (const [x, y] of points) await click(page, x, y);
    await page.keyboard.press('Enter');
  }
}

async function shots(page: Page, name: string, focus: [number, number]): Promise<void> {
  await page.locator('[data-tool="select"]').click();
  await page.getByRole('button', { name: /^3D$/ }).click();
  await page.keyboard.press('Escape');
  const box = (await page.getByTestId('editor-viewport').boundingBox())!;
  const width = Math.min(box.width, box.height * 1.6) * 0.95;
  const clip = { x: box.x + (box.width - width) / 2, y: box.y + (box.height - width / 1.6) / 2, width, height: width / 1.6 };
  for (const [band, span, tilt] of [['tactical', 62, 0.6], ['strategic', 150, null]] as const) {
    await page.evaluate(([x, y, s, t]) => {
      const editor = (window as unknown as Bridge).__prestesEditor!;
      editor.look(x!, y!, s!);
      const camera = editor.viewport()!.view.camera;
      camera.targetYaw = Math.PI / 6;
      camera.tiltOverride = t;
    }, [focus[0], focus[1], span, tilt] as const);
    await page.waitForTimeout(3500);
    writeFileSync(`${OUT}/${name}-${band}.png`, await page.screenshot({ clip }));
  }
}

/** Plays the map: deployment, then a few seconds of battle; the shot is the battle view. */
async function play(page: Page, name: string): Promise<void> {
  await page.getByTestId('editor-playtest').click();
  await page.waitForURL(/index\.html\?playtest=1/);
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0), { timeout: 30_000 }).toBeGreaterThan(20);
  await page.getByTestId('start-battle').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.phase)).toBe('battle');
  await page.waitForTimeout(8000);
  writeFileSync(`${OUT}/${name}-battle.png`, await page.screenshot());
  await page.getByTestId('playtest-back').click();
  await page.waitForURL(/editor\.html/);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
}

test.skip(!process.env.PRESTES_REVIEW, 'review pictures only on demand');
test.describe.configure({ mode: 'serial' });

for (const [name, build] of [
  [
    'town',
    async (page: Page) => {
      await newMap(page, 'teste-vila', 'Test town', 'Vila de teste');
      // The church in its yard behind a coped wall, the iron gate in its front.
      await draw(page, [
        ['coped-wall', [[-2.2, -4], [-12, -4], [-12, 24], [12, 24], [12, -4], [2.2, -4]]],
        ['iron-railing', [[-14, -30], [14, -30]]],
        ['adobe-wall', [[26, 4], [26, 26]]],
      ]);
      await place(page, [
        ['church', 0, 10],
        ['iron-gate', 0, -4],
        ['sobrado', -24, -12, 'blue'],
        ['casa-terrea', -36, 16, 'whitewash'],
        ['casa-terrea', -26, 16, 'ochre'],
        ['casa-terrea', -36, -12, 'rose'],
        ['venda', 20, -14],
        ['armazem', 36, -12, 'ochre'],
        ['casa-terrea', -38, -28, 'zinc'],
        ['jail', 38, 16],
        ['coreto', 0, -20],
        ['fountain', -10, -20],
        ['square-bench', 9, -24],
        ['motor-car', 22, -28],
        ['market-stall', -22, -28],
        ['street-sign', 14, -2],
      ]);
      return [0, -2] as [number, number];
    },
  ],
  [
    'river-camp',
    async (page: Page) => {
      await newMap(page, 'teste-acampamento', 'Test river camp', 'Acampamento de teste');
      // A wide bend of the river on the east side.
      await page.locator('[data-tool="pond"]').click();
      for (const [x, y] of [[30, -30], [70, -30], [70, 30], [30, 30]] as const) {
        await click(page, x, y);
        await page.waitForTimeout(400);
      }
      await page.keyboard.press('Enter');
      await draw(page, [
        ['rail-fence', [[-40, -26], [-1.9, -26]]],
        ['rail-fence', [[1.9, -26], [22, -26]]],
        ['bamboo-fence', [[-40, -26], [-40, 8]]],
      ]);
      await place(page, [
        ['farm-gate', 0, -26],
        ['landing-stage', 28, 0],
        ['mooring-post', 29, 5],
        ['dugout-canoe', 36, 4],
        ['canoa-de-tolda', 42, -10],
        ['river-raft', 40, 14],
        ['boat-overturned', 24, 12],
        ['ridge-tent', -30, 4],
        ['ridge-tent', -22, 4],
        ['bell-tent', -30, -12, 'legalist'],
        ['poncho-lean-to', -14, 12],
        ['field-kitchen', 0, -10],
        ['mess-tent', 12, 4],
        ['campfire', -8, 0],
        ['rifle-stack', -12, -4],
        ['ammo-boxes', 14, -14, 'legalist'],
        ['supply-cart', 20, -18, 'legalist'],
        ['camp-barrels', -2, 4],
        ['hammock', -24, 14],
      ]);
      return [4, -4] as [number, number];
    },
  ],
] as const) {
  test(`hand check: the ${name}, built and played`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
    await page.goto('/editor.html');
    await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
    mkdirSync(OUT, { recursive: true });
    const focus = await build(page);
    const state = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state());
    writeFileSync(`${OUT}/${name}.json`, JSON.stringify(state, null, 2));
    await shots(page, name, focus);
    await play(page, name);
    expect(errors).toEqual([]);
  });
}
