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
    window.__prestes!.step(600);
  });
  await page.waitForTimeout(300);
  if ((await page.getByTestId('pause-button').getAttribute('aria-label')) === 'Resume') {
    await page.getByTestId('pause-button').click();
  }
  await page.waitForFunction(
    () => {
      const text = document.querySelector('[data-testid="training-objective"]')?.textContent ?? '';
      return /suppress|suprimir/i.test(text);
    },
    null,
    { timeout: 15000 },
  );
  await expect(page.getByTestId('training-objective')).toContainText(/suppress|suprimir/i);
  await expect
    .poll(async () =>
      (await currentFrame(page)).units.filter((unit) => unit.role === 'training-enemy').length,
    )
    .toBe(6);
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

  const stepAndResume = async (ticks: number): Promise<void> => {
    await page.evaluate((count) => window.__prestes!.step(count), ticks);
    await page.waitForTimeout(300);
    if ((await page.getByTestId('pause-button').getAttribute('aria-label')) === 'Resume') {
      await page.getByTestId('pause-button').click();
    }
  };
  const moveTo = async (x: number, y: number): Promise<void> => {
    await page.evaluate(
      ({ to }) => {
        const frame = window.__prestes!.frame()!;
        const unitIds = frame.units
          .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive)
          .map((unit) => unit.id);
        window.__prestes!.command({ type: 'move', unitIds, to });
        window.__prestes!.step(1);
      },
      { to: { x, y } },
    );
    await page.waitForFunction(() =>
      window.__prestes!.frame()!.units.some(
        (unit) => unit.faction === 'column' && unit.squadId === 1 && unit.order === 'move',
      ),
    );
  };

  await moveTo(28, 4);
  await stepAndResume(600);
  await page.waitForFunction(
    () => /suppress|suprimir/i.test(document.querySelector('[data-testid="training-objective"]')?.textContent ?? ''),
    null,
    { timeout: 15000 },
  );
  await expect
    .poll(async () =>
      (await currentFrame(page)).units.filter((unit) => unit.role === 'training-enemy').length,
    )
    .toBe(6);
  await moveTo(52, -18);
  await stepAndResume(500);
  await page.waitForFunction(
    () => /hold the trench|segurar a trincheira/i.test(document.querySelector('[data-testid="training-objective"]')?.textContent ?? ''),
    null,
    { timeout: 15000 },
  );
  await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', 'hold');
  await expect
    .poll(async () => {
      const enemies = (await currentFrame(page)).units.filter(
        (unit) => unit.role === 'training-enemy',
      );
      return (
        enemies.length === 6 &&
        enemies.every((unit) => unit.x > 70 && unit.y > 0)
      );
    })
    .toBe(true);
  await page.waitForTimeout(300);
  await moveTo(20, 4);
  await stepAndResume(900);
  await expect(page.getByTestId('training-failure')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('training-retry').click();
  await expect(page.getByTestId('training-failure')).toHaveCount(0);
  await expect(page.getByTestId('training-objective')).toContainText(/hold the trench|segurar a trincheira/i);
  await expect
    .poll(async () =>
      (await currentFrame(page)).units.filter((unit) => unit.role === 'training-enemy').length,
    )
    .toBe(6);
});







