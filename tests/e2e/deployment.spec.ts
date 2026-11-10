import { expect, test, type Page } from '@playwright/test';

// add-deployment-phase 3.1: the skirmish opens in the deployment phase.

interface Unit {
  id: number;
  x: number;
  y: number;
  faction: string;
  squadId: number;
}
interface Bridge {
  __prestes?: {
    command: (command: unknown) => void;
    frame: () => { tick: number; phase?: string; units: Unit[] } | null;
  };
  __prestesScene?: { deploymentAreas: () => boolean };
}

const frame = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!);

async function openDeployment(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('deployment-banner')).toBeVisible();
  await expect.poll(async () => (await frame(page)).units.length).toBe(66);
}

const centre = (units: readonly Unit[]) => ({
  x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
  y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
});

test('deploy a section, start the battle and see the clock run', async ({ page }) => {
  await openDeployment(page);
  await expect(page.getByTestId('deployment-banner')).toContainText('Deployment');
  await expect(page.getByTestId('start-battle')).toContainText('Start battle');
  await expect(page.getByTestId('reset-deployment')).toHaveText('Reset deployment');
  // No speed controls, both areas drawn, and time stands still.
  await expect(page.getByTestId('speed-2')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as Bridge).__prestesScene!.deploymentAreas())).toBe(true);
  await page.waitForTimeout(1500);
  expect((await frame(page)).tick).toBe(0);

  // A move 10 m sideways takes effect at once.
  const first = (await frame(page)).units.filter((unit) => unit.faction === 'column' && unit.squadId === 1);
  const from = centre(first);
  const to = { x: from.x + 10, y: from.y };
  await page.evaluate(([ids, x, y]) => (window as unknown as Bridge).__prestes!.command({ type: 'move', unitIds: ids, to: { x, y } }), [first.map((unit) => unit.id), to.x, to.y] as const);
  await expect.poll(async () => {
    const moved = (await frame(page)).units.filter((unit) => unit.faction === 'column' && unit.squadId === 1);
    return Math.round(Math.hypot(centre(moved).x - to.x, centre(moved).y - to.y));
  }).toBeLessThan(4);
  expect((await frame(page)).tick).toBe(0);

  // A move far out of the area is refused, with its reason.
  await page.evaluate(([ids]) => (window as unknown as Bridge).__prestes!.command({ type: 'move', unitIds: ids, to: { x: 0, y: 0 } }), [first.map((unit) => unit.id)] as const);
  await expect(page.getByTestId('deployment-refusal')).toHaveText('Outside your deployment area');

  // Reset puts the section back.
  await page.getByTestId('reset-deployment').click();
  await expect.poll(async () => {
    const back = (await frame(page)).units.filter((unit) => unit.faction === 'column' && unit.squadId === 1);
    return Math.round(Math.hypot(centre(back).x - from.x, centre(back).y - from.y));
  }).toBe(0);

  // Enter starts the battle: the banner goes and ticks run.
  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('deployment-banner')).toHaveCount(0);
  await expect.poll(async () => (await frame(page)).tick, { timeout: 10_000 }).toBeGreaterThan(5);
  await expect(page.getByTestId('speed-2')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Bridge).__prestesScene!.deploymentAreas())).toBe(false);
});

test('the banner speaks Portuguese', async ({ page }) => {
  await openDeployment(page);
  await page.getByTestId('hud-language-select').selectOption('pt-BR');
  await expect(page.getByTestId('deployment-banner')).toContainText('Desdobramento');
  await expect(page.getByTestId('start-battle')).toContainText('Iniciar batalha');
  await expect(page.getByTestId('reset-deployment')).toHaveText('Refazer desdobramento');
  await page.getByTestId('start-battle').click();
  await expect(page.getByTestId('deployment-banner')).toHaveCount(0);
});

test('preview along a wall: slots by class and a count per piece', async ({ page }) => {
  await openDeployment(page);
  type Scene = { groundToScreen: (x: number, y: number) => { x: number; y: number } | null; slotPreview: () => { markers: number; badges: string[] } };
  // The cover nearest the column, inside its area, with room for a section.
  const target = await page.evaluate(() => {
    const current = (window as unknown as { __prestes: { frame: () => { units: Unit[]; covers: { x: number; y: number; halfWidth: number; blocksMovement: boolean }[] } } }).__prestes.frame();
    const column = current.units.filter((unit) => unit.faction === 'column');
    const cx = column.reduce((sum, unit) => sum + unit.x, 0) / column.length;
    const cy = column.reduce((sum, unit) => sum + unit.y, 0) / column.length;
    const covers = current.covers.filter((cover) => cover.halfWidth >= 2);
    covers.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    return covers[0] ? { x: covers[0].x, y: covers[0].y } : null;
  });
  expect(target).not.toBeNull();
  await page.getByTestId('squad-1').click();
  await page.getByTestId('order-tab-movement').click();
  await page.getByTestId('order-move').click();
  const box = (await page.getByTestId('game-canvas').boundingBox())!;
  await page.evaluate(({ x, y }) => (window as unknown as { __prestesScene: { focusOn: (x: number, y: number) => void } }).__prestesScene.focusOn(x, y), target!);
  await page.waitForTimeout(600);
  const point = await page.evaluate(({ x, y }) => (window as unknown as { __prestesScene: Scene }).__prestesScene.groundToScreen(x, y), target!);
  expect(point).not.toBeNull();
  expect(point!.x).toBeGreaterThan(0);
  expect(point!.x).toBeLessThan(box.width);
  expect(point!.y).toBeGreaterThan(0);
  expect(point!.y).toBeLessThan(box.height);
  await page.getByTestId('game-canvas').hover({ position: point! });
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __prestesScene: Scene }).__prestesScene.slotPreview())).markers).toBeGreaterThan(0);
  const state = await page.evaluate(() => (window as unknown as { __prestesScene: Scene }).__prestesScene.slotPreview());
  expect(state.badges.length).toBeGreaterThan(0);
  for (const text of state.badges) expect(text).toMatch(/^\d+\/\d+$/);
  await expect(page.getByTestId('slot-badge').first()).toBeVisible();
  // The battle clears it: the slot count of battle is shown only on a hovered cover.
  await page.getByTestId('start-battle').click();
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __prestesScene: Scene }).__prestesScene.slotPreview())).badges.length).toBe(0);
});
