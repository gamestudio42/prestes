import { expect, test } from '@playwright/test';

// make-campaign-playable 3.1: on the dev server, a chapter's briefing links to
// the editor on that chapter's map.

type EditorBridge = { state: () => { id: string } };

test('the edit link of chapter 6 opens Serra Nova in the editor', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('prestes.locale', 'en');
    localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
  });
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await page.getByTestId('campaign-chapter-serra-nova').click();
  const frame = page.getByTestId('campaign-book').locator('.desk-book-frame');
  await frame.focus();
  for (let i = 0; i < 12 && (await page.getByTestId('chapter-briefing').count()) === 0; i += 1) await page.keyboard.press('ArrowRight');
  const link = page.getByTestId('chapter-edit-map-serra-nova');
  await expect(link).toHaveText('Edit this map');
  await expect(link).toHaveAttribute('href', './editor.html?map=serra-nova');
  await link.click();
  await expect(page).toHaveURL(/editor\.html\?map=serra-nova$/);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __prestesEditor?: EditorBridge }).__prestesEditor?.state().id ?? ''), { timeout: 20_000 })
    .toBe('serra-nova');
  await expect(page.getByTestId('open-conflict')).toHaveCount(0);
});
