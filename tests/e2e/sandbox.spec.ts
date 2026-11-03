import { expect, test } from '@playwright/test';

test('opens the sandbox, steps, spawns and resets', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.keyboard.press('F1');
  await expect(page.getByTestId('sandbox-panel')).toBeVisible();
  await expect(page.getByTestId('sandbox-counts')).toContainText('Covers: 19');

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
    if ((await page.getByTestId('sandbox-counts').textContent())?.includes('Covers: 20')) break;
  }
  await expect(page.getByTestId('sandbox-counts')).toContainText('Covers: 20');

  await page.getByTestId('sandbox-tool-dummy').click();
  for (const [x, y] of [[1100, 350], [1050, 400], [1000, 300]] as const) {
    await canvas.click({ position: { x, y } });
    await page.getByTestId('sandbox-step').click();
    await page.waitForTimeout(200);
    if ((await page.getByTestId('sandbox-counts').textContent())?.includes('Dummies: 1')) break;
  }
  await expect(page.getByTestId('sandbox-counts')).toContainText('Dummies: 1');

  await page.getByTestId('sandbox-reset').click();
  await expect(page.getByTestId('sandbox-counts')).toContainText('Covers: 19');
  await expect(page.getByTestId('sandbox-counts')).toContainText('Dummies: 0');
});

test('drills a casualty, shows progress and completes recovery', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.keyboard.press('F1');
  await page.getByTestId('sandbox-incapacitate').click();
  await expect(page.getByTestId('sandbox-rescue')).toBeEnabled({ timeout: 5000 });

  await page.getByTestId('sandbox-rescue').click();
  await expect(page.getByTestId('rescue-status')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('rescue-status')).toContainText('Rescue');
  await expect(page.getByTestId('rescue-status')).toContainText('#1');

  for (let index = 0; index < 8; index += 1) {
    await page.getByTestId('sandbox-advance').click();
  }
  await expect(page.getByTestId('rescue-status')).toBeHidden({ timeout: 10000 });
  await page.waitForFunction(() => {
    const bridge = (
      window as unknown as {
        __prestes?: {
          frame: () => {
            units: Array<{ id: number; alive: boolean; soldierState: string }>;
          } | null;
        };
      }
    ).__prestes;
    const recovered = bridge?.frame()?.units.find((unit) => unit.id === 1);
    return recovered?.alive === true && recovered.soldierState !== 'recovering';
  });
});













test('starts the 3v3 battle laboratory', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
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

