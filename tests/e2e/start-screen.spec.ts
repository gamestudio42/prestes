import { expect, test } from '@playwright/test';

const PROGRESS_KEY = 'prestes.bootcamp.stations.v2';

test('opens the desk over the pixel video with no continue action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  // The backdrop is the menu video drawn as pixel art, or the marching column if it cannot play.
  await expect(page.getByTestId('menu-video').or(page.getByTestId('marching-scene'))).toBeVisible();
  await expect(page.getByTestId('start-continue')).toHaveCount(0);
  await expect(page.getByTestId('start-screen')).not.toContainText('Visual prototype');
});

test('retire-bootcamp: old bootcamp progress is cleared and no bootcamp is offered', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify({ phaseIndex: 3, completedPhases: [], completed: false, bestTimeTicks: 0 }));
  }, PROGRESS_KEY);
  await page.reload();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await expect(page.getByTestId('start-continue')).toHaveCount(0);
  await expect(page.getByTestId('start-restart')).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), PROGRESS_KEY)).toBeNull();
  await expect(page.getByTestId('open-skirmish')).toBeVisible();
});

test('toggles sound from the start screen', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('menu-mark-options').click();
  const audio = page.getByTestId('start-audio');
  const before = await audio.getAttribute('aria-pressed');
  await audio.click();
  await expect(audio).not.toHaveAttribute('aria-pressed', before ?? '');
});
