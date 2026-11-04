import { expect, test } from '@playwright/test';

const PROGRESS_KEY = 'prestes.bootcamp.stations.v2';

test('offers Start with no progress and shows the period kicker once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect(page.getByTestId('start-continue')).toHaveCount(0);
  await expect(page.getByTestId('start-screen')).not.toContainText('Visual prototype');
  await expect(page.getByText('The Prestes Column', { exact: false })).toHaveCount(2);
});

test('continues and restarts saved bootcamp progress', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        phaseIndex: 3,
        completedPhases: ['formation', 'fire', 'maneuver'],
        completed: false,
        bestTimeTicks: 0,
      }),
    );
  }, PROGRESS_KEY);
  await page.reload();
  await expect(page.getByTestId('start-continue')).toContainText('station 4/7');
  await page.getByTestId('start-continue').click();
  await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', 'defense');

  await page.goto('/');
  await page.getByTestId('start-restart').click();
  await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', 'formation');
});

test('toggles sound from the start screen', async ({ page }) => {
  await page.goto('/');
  const audio = page.getByTestId('start-audio');
  const before = await audio.getAttribute('aria-pressed');
  await audio.click();
  await expect(audio).not.toHaveAttribute('aria-pressed', before ?? '');
});

test('the menu shows the marching column and the arrow keys move the cursor', async ({ page }) => {
  await page.goto('/');
  const scene = page.getByTestId('marching-scene');
  await expect(scene).toBeVisible();
  // The column moves: two frames of the scene differ.
  const first = await scene.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.waitForTimeout(400);
  const second = await scene.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  expect(second).not.toBe(first);

  await page.getByTestId('start-button').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('start-codex')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('start-button')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('language-select')).toBeFocused();
});
