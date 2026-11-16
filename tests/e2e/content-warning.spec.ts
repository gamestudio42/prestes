import { expect, test, type Page } from '@playwright/test';

// ambient-sound-and-voices D11: the content warning on the first opening,
// in both languages, and the choice to go on without the soldiers' swearing.

// Start as a first opening: no answered warning (the config seeds one).
test.use({ storageState: { cookies: [], origins: [] } });

const audio = (page: Page) =>
  page.evaluate(() => JSON.parse(window.localStorage.getItem('prestes.audio.v1') ?? '{}') as { curses?: boolean });

test('shows on the first opening in English, and not again once answered', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true }));
  });
  await page.goto('/');
  const warning = page.getByTestId('content-warning');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('Content warning');
  await expect(warning).toContainText('filho da puta');
  await expect(page.getByTestId('content-warning-continue')).toBeFocused();

  await page.getByTestId('content-warning-continue').click();
  await expect(warning).toHaveCount(0);
  expect((await audio(page)).curses).not.toBe(false);

  await page.reload();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await expect(page.getByTestId('content-warning')).toHaveCount(0);
});

test('in Portuguese, going on without swearing turns the option off', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'pt-BR');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true }));
  });
  await page.goto('/');
  const warning = page.getByTestId('content-warning');
  await expect(warning).toContainText('Aviso de conteúdo');
  await expect(warning).toContainText('filho de uma rapariga');

  await page.getByTestId('content-warning-clean').click();
  await expect(warning).toHaveCount(0);
  expect((await audio(page)).curses).toBe(false);

  await page.getByTestId('menu-mark-options').click();
  const toggle = page.getByTestId('audio-curses');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toContainText('Palavrões nas vozes: desligados');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect((await audio(page)).curses).toBe(true);
});
