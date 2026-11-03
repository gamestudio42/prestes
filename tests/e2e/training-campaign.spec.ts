import { expect, test, type Page } from '@playwright/test';
import type { Command, Frame } from '@prestes/shared';

declare global {
  interface Window {
    __prestes?: {
      command: (command: Command) => void;
      step: (ticks: number) => void;
      frame: () => Frame | null;
    };
  }
}

test.use({ video: { mode: 'on', size: { width: 1440, height: 900 } } });
test.setTimeout(180_000);

async function currentFrame(page: Page): Promise<Frame> {
  const frame = await page.evaluate(() => window.__prestes?.frame() ?? null);
  if (!frame) {
    throw new Error('simulation frame is unavailable');
  }
  return frame;
}

// Advances the paused simulation in fixed chunks until the page condition holds.
// Progress depends on simulated ticks, not on wall-clock time, so a slow or busy
// machine cannot starve the exercise director of ticks. Each chunk waits until
// the HUD has rendered the new tick and effects have flushed, so the director's
// own commands always land before the next chunk and the run stays deterministic.
async function stepUntil(
  page: Page,
  condition: () => boolean,
  { maxTicks, chunk = 300 }: { maxTicks: number; chunk?: number },
): Promise<void> {
  for (let stepped = 0; stepped <= maxTicks; stepped += chunk) {
    if (await page.evaluate(condition)) {
      return;
    }
    await stepRendered(page, chunk);
  }
  throw new Error(`condition not met within ${maxTicks} ticks: ${condition.toString()}`);
}

async function stepRendered(page: Page, ticks: number): Promise<void> {
  const target = (await currentFrame(page)).tick + ticks;
  await page.evaluate((count) => window.__prestes!.step(count), ticks);
  await page.waitForFunction(
    (tick) =>
      Number(document.querySelector('[data-testid="tick-value"]')?.textContent?.split(':').pop()) >= tick,
    target,
  );
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))),
  );
}

const assaultObjective = (): boolean =>
  /suppress|suprimir/i.test(document.querySelector('[data-testid="training-objective"]')?.textContent ?? '');
const holdObjective = (): boolean =>
  /hold the trench|segurar a trincheira/i.test(
    document.querySelector('[data-testid="training-objective"]')?.textContent ?? '',
  );
const sixTrainingEnemies = (): boolean =>
  (window.__prestes?.frame()?.units.filter((unit) => unit.role === 'training-enemy').length ?? 0) === 6;

test('opens the bootcamp with the player troop, instructor and first objective', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('training-panel')).toBeVisible();
  await expect(page.getByTestId('training-objective')).toContainText(/assembly|reuni/i);
  await expect(page.getByTestId('training-dialogue')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await expect
    .poll(async () => (await currentFrame(page)).units.filter((unit) => unit.squadId === 1).length)
    .toBe(11);
  const frame = await currentFrame(page);
  expect(frame.units.filter((unit) => unit.squadId === 99)).toHaveLength(1);
  expect(frame.units.filter((unit) => unit.role === 'training-enemy')).toHaveLength(0);
  expect(
    frame.units
      .filter((unit) => unit.faction === 'column' && unit.squadId !== 99)
      .every((unit) => unit.targetId === null),
  ).toBe(true);
  expect(frame.events.filter((event) => event.type === 'shot')).toHaveLength(0);
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');
  await page.screenshot({ path: 'test-results/bootcamp-start.png' });
});

test('reaches the assembly zone and opens the assault phase', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));

  await page.evaluate(() => {
    const frame = window.__prestes!.frame()!;
    const unitIds = frame.units
      .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive)
      .map((unit) => unit.id);
    window.__prestes!.command({ type: 'move', unitIds, to: { x: 28, y: 4 } });
  });
  await stepUntil(page, assaultObjective, { maxTicks: 1500 });
  await expect(page.getByTestId('training-objective')).toContainText(/suppress|suprimir/i);
  await stepUntil(page, sixTrainingEnemies, { maxTicks: 60, chunk: 1 });
  const frame = await currentFrame(page);
  expect(
    frame.units
      .filter((unit) => unit.role === 'training-enemy')
      .every((unit) => unit.nonLethal === true),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/bootcamp-assault.png' });
});

test('shows a sandbox preview for every placement and inserts an enemy troop with rotation', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await page.keyboard.press('F1');
  await expect(page.getByTestId('sandbox-panel')).toBeVisible();

  for (const tool of ['sandbag', 'stone', 'trench', 'dummy', 'enemy-troop', 'command-troop']) {
    await page.getByTestId(`sandbox-tool-${tool}`).click();
    const canvas = page.getByTestId('game-canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.36, box!.y + box!.height * 0.28);
    await expect(page.getByTestId('placement-status')).toBeVisible();
  }

  await page.getByTestId('sandbox-tool-enemy-troop').click();
  const before = await currentFrame(page);
  const canvas = page.getByTestId('game-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.36, box!.y + box!.height * 0.28);
  await page.keyboard.press('x');
  await expect(page.getByTestId('placement-status')).toBeVisible();
  if ((await page.getByTestId('placement-status').textContent())?.match(/blocked|bloqueada/i)) {
    await page.mouse.move(box!.x + box!.width * 0.42, box!.y + box!.height * 0.22);
  }
  await page.mouse.click(box!.x + box!.width * 0.42, box!.y + box!.height * 0.22);
  await expect
    .poll(async () => (await currentFrame(page)).units.length, { timeout: 5000 })
    .toBeGreaterThan(before.units.length);
});

test('fails the hold phase and retries the phase in place', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));

  const moveTo = async (x: number, y: number): Promise<void> => {
    await page.evaluate(
      ({ to }) => {
        const frame = window.__prestes!.frame()!;
        const unitIds = frame.units
          .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive)
          .map((unit) => unit.id);
        window.__prestes!.command({ type: 'move', unitIds, to });
      },
      { to: { x, y } },
    );
    await stepRendered(page, 1);
    await page.waitForFunction(() =>
      window.__prestes!.frame()!.units.some(
        (unit) => unit.faction === 'column' && unit.squadId === 1 && unit.order === 'move',
      ),
    );
  };

  await moveTo(28, 4);
  await stepUntil(page, assaultObjective, { maxTicks: 1500 });
  await stepUntil(page, sixTrainingEnemies, { maxTicks: 60, chunk: 1 });
  await moveTo(52, -18);
  await stepUntil(page, holdObjective, { maxTicks: 3000 });
  await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', 'hold');
  await stepUntil(
    page,
    () => {
      const enemies =
        window.__prestes?.frame()?.units.filter((unit) => unit.role === 'training-enemy') ?? [];
      return enemies.length === 6 && enemies.every((unit) => unit.x > 70 && unit.y > 0);
    },
    { maxTicks: 60, chunk: 1 },
  );
  // Pinned soldiers cannot move and the training fire keeps them pinned, then
  // they stay prone and crawl. Lift the fire and stand the section up first, so
  // abandoning the trench does not depend on timing.
  await page.evaluate(() => window.__prestes!.command({ type: 'despawn_role', role: 'training-enemy' }));
  await stepUntil(
    page,
    () =>
      window.__prestes!.frame()!.units.every((unit) => unit.squadId !== 1 || unit.state !== 'pinned'),
    { maxTicks: 400, chunk: 10 },
  );
  await page.evaluate(() => {
    const unitIds = window.__prestes!.frame()!.units
      .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive)
      .map((unit) => unit.id);
    window.__prestes!.command({ type: 'stance', unitIds, stance: 'standing' });
  });
  await moveTo(20, 4);
  await stepUntil(page, () => document.querySelector('[data-testid="training-failure"]') !== null, {
    maxTicks: 400,
    chunk: 10,
  });
  await page.getByTestId('training-retry').click();
  await expect(page.getByTestId('training-failure')).toHaveCount(0);
  await expect(page.getByTestId('training-objective')).toContainText(/hold the trench|segurar a trincheira/i);
  await stepUntil(page, sixTrainingEnemies, { maxTicks: 60, chunk: 1 });
});







