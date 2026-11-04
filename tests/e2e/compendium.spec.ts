import { expect, test } from '@playwright/test';

test('the compendium opens on a section, reads an entry and follows the language', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.setItem('prestes.locale', 'pt-BR'));
  await page.reload();
  await page.getByTestId('start-codex').click();
  await expect(page.getByTestId('codex')).toBeVisible();
  await page.getByTestId('codex-tab-events').click();
  await page.getByTestId('codex-entry-revolt-1922').click();
  await expect(page.getByTestId('codex-page')).toContainText('1922-07-05');
  await expect(page.getByTestId('codex-page')).toContainText('Revolta dos 18 do Forte');
  await expect(page.getByTestId('codex-source')).toContainText('Macaulay, ch. II, pp. 37–38');
  await expect(page.getByTestId('codex-confidence')).toContainText('alta');

  await page.getByTestId('codex-tab-corrections').click();
  await expect(page.getByTestId('codex-page')).toContainText('Prestes não estava no Forte');

  // In English the tabs, the entry and its confidence change too.
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByTestId('language-select').selectOption('en');
  await page.getByTestId('start-codex').click();
  await page.getByTestId('codex-tab-events').click();
  await page.getByTestId('codex-entry-revolt-1922').click();
  await expect(page.getByTestId('codex-tab-events')).toHaveText('Events');
  await expect(page.getByTestId('codex-page')).toContainText('Revolt of the 18 of the Fort');
  await expect(page.getByTestId('codex-confidence')).toContainText('high');
  await page.getByTestId('language-select').evaluate(() => window.localStorage.setItem('prestes.locale', 'pt-BR'));
});
