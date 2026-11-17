import { expect, test, type Page } from '@playwright/test';

// improve-soldier-models 6.1: the soldier is fetched when the skirmish setup
// (or a briefing) opens, before Start is pressed, and only once per page.

async function openDesk(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
  });
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
}

test('the skirmish setup starts the soldier download before Start, and a second battle asks for it no more', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (/\/soldier\.glb(\?|$)/.test(request.url())) asked.push(request.url());
  });
  await openDesk(page);
  expect(asked).toHaveLength(0);
  await page.getByTestId('open-skirmish').click();
  await expect(page.getByTestId('start-battle-3v3')).toBeVisible();
  await expect.poll(() => asked.length).toBe(1);

  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('deployment-banner')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('hud-menu').click();
  await page.getByTestId('leave-battle').click();
  await page.getByTestId('leave-confirm').click();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('deployment-banner')).toBeVisible({ timeout: 30_000 });
  expect(asked).toHaveLength(1);
});

test('a chapter briefing open on the desk starts the soldier download', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (/\/soldier\.glb(\?|$)/.test(request.url())) asked.push(request.url());
  });
  await openDesk(page);
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await page.getByTestId('campaign-chapter-anel-de-ferro').click();
  expect(asked).toHaveLength(0);
  const frame = page.getByTestId('campaign-book').locator('.desk-book-frame');
  await frame.focus();
  for (let i = 0; i < 12 && (await page.getByTestId('chapter-briefing').count()) === 0; i += 1) await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('chapter-briefing')).toBeVisible();
  await expect.poll(() => asked.length).toBe(1);
});
