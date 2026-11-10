import { expect, test, type Page } from '@playwright/test';

// add-battle-maps: the battlefields, chosen on the menu.

interface Unit {
  id: number;
  x: number;
  y: number;
  faction: string;
  squadId: number;
  alive: boolean;
}
interface Frame {
  tick: number;
  units: Unit[];
}
interface Bridge {
  __prestes?: {
    frame: () => Frame | null;
    command: (command: unknown) => void;
    step: (ticks: number) => void;
  };
}

/** pre-battle-roster 5.1: the desk's map opens the setup screen, where the map is chosen. */
async function chooseMap(page: Page, map: string): Promise<void> {
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId(`map-option-${map}`).click();
  await expect(page.getByTestId(`map-option-${map}`)).toHaveAttribute('aria-checked', 'true');
  // These scenarios were set against three rifle sections: each map's 3 x 11 preset.
  await page.getByTestId(`enemy-preset-${THREE_RIFLE_SECTIONS[map]}`).check();
}

/** The preset of each map that is three rifle sections (pre-battle-roster's table). */
const THREE_RIFLE_SECTIONS: Record<string, number> = { 'campo-de-provas': 0 };

async function startOn(page: Page, map: string): Promise<void> {
  await page.goto('/');
  await chooseMap(page, map);
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0))
    .toBe(66);
}

const frame = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!);

interface SceneBridge {
  __prestesScene?: { view: () => { x: number; y: number; span: number }; deploymentMarks: () => boolean };
}

const view = (page: Page) => page.evaluate(() => (window as unknown as SceneBridge).__prestesScene!.view());

// refine-battle-maps 6.1: a battle opens close in on the first section; Home frames the map.
test('camera on the sections', async ({ page }) => {
  await startOn(page, 'campo-de-provas');
  const units = (await frame(page)).units.filter((unit) => unit.squadId === 1);
  const x = units.reduce((sum, unit) => sum + unit.x, 0) / units.length;
  const y = units.reduce((sum, unit) => sum + unit.y, 0) / units.length;
  const start = await view(page);
  expect(start.span).toBeLessThanOrEqual(80);
  expect(Math.hypot(start.x - x, start.y - y)).toBeLessThan(15);
});

// refine-battle-maps 6.2: the two deployment zones are marked for the first 10 s, then fade.
test('deployment marks show, then fade', async ({ page }) => {
  await startOn(page, 'campo-de-provas');
  await expect(page.getByTestId('deployment-label-own')).toBeVisible();
  await expect(page.getByTestId('deployment-label-own')).toHaveText(/Sua tropa|Your troops/);
  // The enemy's side may be off screen at tactical zoom; its label is there.
  await expect(page.getByTestId('deployment-label-enemy')).toHaveText(/Inimigo|Enemy/);
  expect(await page.evaluate(() => (window as unknown as SceneBridge).__prestesScene!.deploymentMarks())).toBe(true);
  await expect(page.getByTestId('deployment-label-own')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByTestId('deployment-label-enemy')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as SceneBridge).__prestesScene!.deploymentMarks())).toBe(false);
});

test('frame the map', async ({ page }) => {
  await startOn(page, 'campo-de-provas');
  await page.keyboard.press('Home');
  await expect.poll(async () => (await view(page)).span, { timeout: 10_000 }).toBeGreaterThan(380);
  const framed = await view(page);
  expect(Math.abs(framed.x)).toBeLessThan(1);
  expect(Math.abs(framed.y)).toBeLessThan(1);
});
