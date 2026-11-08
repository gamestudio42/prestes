import { expect, test } from '@playwright/test';

// The desk compendium in Portuguese: a section, an entry with its sources and
// confidence, and the corrections. Page turning, ribbons and the locale switch
// are covered in desk-books.spec.ts.
test('the compendium opens on a section and reads an entry with its sources', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('prestes.locale', 'pt-BR'));
  await page.goto('/');
  await page.getByTestId('start-codex').click();
  await expect(page.getByTestId('codex')).toBeVisible();
  await page.getByTestId('codex-tab-events').click();
  await page.getByTestId('codex-entry-revolt-1922').click();
  await expect(page.getByTestId('codex-page')).toContainText('1922-07-05');
  await expect(page.getByTestId('codex-page')).toContainText('Revolta dos 18 do Forte');
  await expect(page.getByTestId('book-confidence')).toContainText('alta');
  // A long entry continues on the next spread; its sources close it.
  for (let i = 0; i < 4 && (await page.getByTestId('book-sources').count()) === 0; i++) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByTestId('book-sources').first()).toContainText('Macaulay');

  await page.getByTestId('book-ribbon-corrections').click();
  await expect(page.getByTestId('codex-page')).toContainText('Prestes não estava no Forte');
});
