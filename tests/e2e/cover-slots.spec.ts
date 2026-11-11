import { expect, test, type Page } from '@playwright/test';
import type { Command, Frame, Vec2 } from '@prestes/shared';

type Bridge = {
  __prestes?: { command: (command: Command) => void; step: (ticks: number) => void; frame: () => Frame | null };
  __prestesScene?: { groundToScreen: (x: number, y: number) => Vec2 | null };
};

test.setTimeout(120_000);

/**
 * A stone in the middle of the campo-de-provas field (cover 5022). Its slots
 * guard north and south; the column comes up from the south, so the slots it
 * can use are the ones that guard north, toward the enemy.
 */
const STONE = { x: -20, y: -12 };

async function frame(page: Page): Promise<Frame> {
  return page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!);
}

async function stepRendered(page: Page, ticks: number): Promise<void> {
  const target = (await frame(page)).tick + ticks;
  await page.evaluate((count) => (window as unknown as Bridge).__prestes!.step(count), ticks);
  await page.waitForFunction(
    (tick) => Number(document.querySelector('[data-testid="app"]')?.getAttribute('data-tick')) >= tick,
    target,
  );
}

/** Canvas-relative position of a world point, after the camera looked at it. */
async function screenOf(page: Page, point: Vec2): Promise<Vec2> {
  const box = (await page.getByTestId('game-canvas').boundingBox())!;
  const screen = await page.evaluate(
    ({ x, y }) => (window as unknown as Bridge).__prestesScene!.groundToScreen(x, y),
    point,
  );
  expect(screen).not.toBeNull();
  expect(screen!.x).toBeGreaterThan(0);
  expect(screen!.x).toBeLessThan(box.width);
  expect(screen!.y).toBeGreaterThan(0);
  expect(screen!.y).toBeLessThan(box.height);
  return screen!;
}

test('hovering a stone shows its slots and a click fills the planned ones', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => Boolean((window as unknown as Bridge).__prestes?.frame()));
  await stepRendered(page, 2);
  // The enemy holds its fire: this test is about the slots, not the fight.
  const legalists = (await frame(page)).units.filter((unit) => unit.faction === 'legalist').map((unit) => unit.id);
  await page.evaluate(
    (next) => (window as unknown as Bridge).__prestes!.command(next),
    { type: 'hold_fire', unitIds: legalists, hold: true } as Command,
  );
  // Walk the section up near the stone, out of reach of its slots, so the camera frames it.
  const ids = (await frame(page)).units
    .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive)
    .map((unit) => unit.id);
  await page.evaluate(
    (next) => (window as unknown as Bridge).__prestes!.command(next),
    { type: 'move', unitIds: ids, to: { x: STONE.x, y: STONE.y + 28 } } as Command,
  );
  await stepRendered(page, 1800);
  await page.evaluate(({ x, y }) => (window as unknown as { __prestesScene: { focusOn: (x: number, y: number) => void } }).__prestesScene.focusOn(x, y), STONE);
  await page.waitForTimeout(600);

  const point = await screenOf(page, STONE);
  await page.getByTestId('game-canvas').hover({ position: point });
  const count = page.getByTestId('slot-count');
  await expect(count).toBeVisible();
  const total = Number(await count.getAttribute('data-total'));
  expect(total).toBeGreaterThanOrEqual(2);
  expect(Number(await count.getAttribute('data-free'))).toBe(total);

  await page.getByTestId('order-tab-movement').click();
  await page.getByTestId('order-move').click();
  const again = await screenOf(page, STONE);
  await page.getByTestId('game-canvas').hover({ position: again });
  // author-game-maps 3.6: the preview plans as the order does, against the
  // nearest enemy the column sees (or the way it faces). The count covers
  // every planned slot, on the stone and on any cover near it.
  await expect.poll(async () => Number(await count.getAttribute('data-planned'))).toBeGreaterThan(0);
  const planned = Number(await count.getAttribute('data-planned'));
  await page.getByTestId('game-canvas').click({ position: again });
  await stepRendered(page, 400);
  const settled = await frame(page);
  const slotted = settled.units.filter((unit) => ids.includes(unit.id) && unit.slotId != null);
  // The order fills exactly the slots the preview planned, one man each.
  expect(slotted.length).toBe(planned);
  expect(new Set(slotted.map((unit) => unit.slotId)).size).toBe(slotted.length);
});
