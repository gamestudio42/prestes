import { expect, test } from '@playwright/test';

const PROGRESS_KEY = 'prestes.bootcamp.stations.v2';

test('offers Start with no progress and shows the period kicker once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect(page.getByTestId('start-continue')).toHaveCount(0);
  await expect(page.getByTestId('start-screen')).not.toContainText('Visual prototype');
  await expect(page.getByText('The Prestes Column', { exact: false })).toHaveCount(1);
});

test('retire-bootcamp: old bootcamp progress is cleared and no bootcamp is offered', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify({ phaseIndex: 3, completedPhases: [], completed: false, bestTimeTicks: 0 }));
  }, PROGRESS_KEY);
  await page.reload();
  await expect(page.getByTestId('campaign-preparing')).toBeVisible();
  await expect(page.getByTestId('start-continue')).toHaveCount(0);
  await expect(page.getByTestId('start-restart')).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), PROGRESS_KEY)).toBeNull();
  // The campaign page's action opens the skirmish page.
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('start-battle-3v3')).toBeVisible();
});

test('toggles sound from the start screen', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('menu-mark-options').click();
  const audio = page.getByTestId('start-audio');
  const before = await audio.getAttribute('aria-pressed');
  await audio.click();
  await expect(audio).not.toHaveAttribute('aria-pressed', before ?? '');
});

test('the menu is a book over the pixel video; bookmarks open its spreads', async ({ page }) => {
  await page.goto('/');
  // The backdrop is the menu video drawn as pixel art, or the marching column if it cannot play.
  const scene = page.getByTestId('menu-video').or(page.getByTestId('marching-scene'));
  await expect(scene).toBeVisible();

  // Campaign is the first spread; the arrow keys move between the bookmarks.
  await expect(page.getByTestId('menu-mark-campaign')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('menu-mark-campaign').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('menu-mark-skirmish')).toBeFocused();
  await expect(page.getByTestId('start-battle-3v3')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('start-codex')).toBeFocused();
  await expect(page.getByTestId('codex')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('language-select')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('menu-mark-campaign')).toBeFocused();
  await expect(page.getByTestId('start-button')).toBeVisible();
});
