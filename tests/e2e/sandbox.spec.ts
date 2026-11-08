import { expect, test } from '@playwright/test';

test('opens the sandbox, steps, spawns and resets', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.keyboard.press('F1');
  await expect(page.getByTestId('sandbox-panel')).toBeVisible();
  // retire-bootcamp: the sandbox opens over the 3v3 field and its covers.
  await expect(page.getByTestId('sandbox-counts')).toContainText(/Covers: [1-9]\d*/);
  const startCovers = Number(/Covers: (\d+)/.exec((await page.getByTestId('sandbox-counts').textContent()) ?? '')![1]);

  const tickBefore = await page.getByTestId('tick-value').textContent();
  await page.getByTestId('sandbox-step').click();
  await expect(page.getByTestId('pause-button')).toHaveAttribute('aria-label', 'Resume');
  await expect(page.getByTestId('tick-value')).not.toHaveText(tickBefore ?? '');

  await page.getByTestId('sandbox-tool-sandbag').click();
  await expect(page.getByTestId('sandbox-panel')).toContainText('Right-click the ground');
  const canvas = page.getByTestId('game-canvas');
  for (const [x, y] of [[1100, 350], [1050, 400], [1000, 300]] as const) {
    await canvas.click({ position: { x, y } });
    await page.getByTestId('sandbox-step').click();
    await page.waitForTimeout(200);
    if ((await page.getByTestId('sandbox-counts').textContent())?.includes(`Covers: ${startCovers + 1}`)) break;
  }
  await expect(page.getByTestId('sandbox-counts')).toContainText(`Covers: ${startCovers + 1}`);

  await page.getByTestId('sandbox-tool-dummy').click();
  for (const [x, y] of [[1100, 350], [1050, 400], [1000, 300]] as const) {
    await canvas.click({ position: { x, y } });
    await page.getByTestId('sandbox-step').click();
    await page.waitForTimeout(200);
    if ((await page.getByTestId('sandbox-counts').textContent())?.includes('Dummies: 1')) break;
  }
  await expect(page.getByTestId('sandbox-counts')).toContainText('Dummies: 1');

  await page.getByTestId('sandbox-reset').click();
  await expect(page.getByTestId('sandbox-counts')).toContainText(`Covers: ${startCovers}`);
  await expect(page.getByTestId('sandbox-counts')).toContainText('Dummies: 0');
});

test('drills a casualty, shows progress and completes recovery', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.keyboard.press('F1');
  await page.getByTestId('sandbox-incapacitate').click();
  await expect(page.getByTestId('sandbox-rescue')).toBeEnabled({ timeout: 5000 });

  await page.getByTestId('sandbox-rescue').click();
  await expect(page.getByTestId('rescue-status')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('rescue-status')).toContainText('Rescue');
  await expect(page.getByTestId('rescue-status')).toContainText('#1');

  // Each advance pauses and steps 60 ticks. Advance until each stage is reached,
  // so progress depends on simulated ticks rather than on wall-clock time.
  const tick = (): Promise<number> =>
    page.evaluate(
      () =>
        (window as unknown as { __prestes?: { frame: () => { tick: number } | null } }).__prestes?.frame()
          ?.tick ?? 0,
    );
  const advanceUntil = async (done: () => Promise<boolean>, maxClicks: number): Promise<void> => {
    for (let index = 0; index < maxClicks; index += 1) {
      if (await done()) {
        return;
      }
      const before = await tick();
      await page.getByTestId('sandbox-advance').click();
      await expect.poll(tick).toBeGreaterThanOrEqual(before + 60);
    }
    expect(await done()).toBe(true);
  };
  const recovered = (): Promise<boolean> =>
    page.evaluate(() => {
      const bridge = (
        window as unknown as {
          __prestes?: {
            frame: () => {
              units: Array<{ id: number; alive: boolean; soldierState: string }>;
            } | null;
          };
        }
      ).__prestes;
      const unit = bridge?.frame()?.units.find((candidate) => candidate.id === 1);
      return unit?.alive === true && unit.soldierState !== 'recovering';
    });

  await advanceUntil(async () => !(await page.getByTestId('rescue-status').isVisible()), 20);
  await advanceUntil(recovered, 20);
});













test('starts the 3v3 battle laboratory', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-battle-3v3').click();
  await page.waitForTimeout(600);
  await page.keyboard.press('F1');
  await page.getByTestId('sandbox-battle-3v3').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __prestes?: { frame: () => unknown } }).__prestes?.frame()));
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __prestes: { frame: () => { units: unknown[] } } }).__prestes.frame().units.length,
      ),
    )
    .toBe(66);
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');
});

