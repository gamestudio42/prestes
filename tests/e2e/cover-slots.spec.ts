import { expect, test, type Page } from '@playwright/test';
import type { Command, Frame, Vec2 } from '@prestes/shared';
import { STATION_OFFSETS, stationPoint } from '../../packages/shared/src/training-ground';

type Bridge = {
  __prestes?: { command: (command: Command) => void; step: (ticks: number) => void; frame: () => Frame | null };
  __prestesScene?: { groundToScreen: (x: number, y: number) => Vec2 | null };
};

test.setTimeout(120_000);

const TRENCH = stationPoint('defense', STATION_OFFSETS.line);
const STATIONS = ['formation', 'fire', 'maneuver', 'defense'];

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

test('hovering the trench shows its slots and a click fills them', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    (done) =>
      window.localStorage.setItem(
        'prestes.bootcamp.stations.v2',
        JSON.stringify({ phaseIndex: 3, completedPhases: done, completed: false, bestTimeTicks: 0 }),
      ),
    STATIONS.slice(0, 3),
  );
  await page.reload();
  await page.getByTestId('start-continue').click();
  await page.waitForFunction(() => Boolean((window as unknown as Bridge).__prestes?.frame()));
  await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', 'defense');
  await stepRendered(page, 2);
  // Walk the section close to the trench so the camera frames it.
  const ids = (await frame(page)).units
    .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive)
    .map((unit) => unit.id);
  await page.evaluate(
    (next) => (window as unknown as Bridge).__prestes!.command(next),
    { type: 'move', unitIds: ids, to: { x: TRENCH.x, y: TRENCH.y + 10 } } as Command,
  );
  await stepRendered(page, 300);
  await page.waitForTimeout(400);

  const point = await screenOf(page, TRENCH);
  await page.getByTestId('game-canvas').hover({ position: point });
  const count = page.getByTestId('slot-count');
  await expect(count).toBeVisible();
  expect(Number(await count.getAttribute('data-total'))).toBeGreaterThanOrEqual(8);
  expect(Number(await count.getAttribute('data-free'))).toBeGreaterThanOrEqual(8);

  await page.getByTestId('order-tab-movement').click();
  await page.getByTestId('order-move').click();
  const again = await screenOf(page, TRENCH);
  await page.getByTestId('game-canvas').hover({ position: again });
  await expect(count).toHaveAttribute('data-planned', /^(?:[8-9]|1\d)$/);
  await page.getByTestId('game-canvas').click({ position: again });
  await stepRendered(page, 400);
  const settled = await frame(page);
  const slotted = settled.units.filter((unit) => ids.includes(unit.id) && unit.slotId != null);
  expect(slotted.length).toBeGreaterThanOrEqual(8);
  expect(new Set(slotted.map((unit) => unit.slotId)).size).toBe(slotted.length);
});
