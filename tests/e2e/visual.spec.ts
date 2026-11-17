import { expect, test, type Page } from '@playwright/test';

// Local visual regression for the HUD and start screen. The 3D canvas is hidden
// and the live numbers are masked; the rest of the chrome must match the baselines.

const SCREENSHOT = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 } as const;

// camp-tent-menu: the menu's backdrop is a still image (the camp table), so the
// screenshots draw it; there is no video frame to hide.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

async function stableFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

test('desk start screen matches the baseline', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.removeItem('prestes.menu.desk.v1');
  });
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await stableFonts(page);
  await expect(page).toHaveScreenshot('desk-start-screen.png', SCREENSHOT);
});

test('desk compendium matches the baseline', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.removeItem('prestes.menu.desk.v1');
  });
  await page.goto('/');
  await page.getByTestId('start-codex').click();
  await expect(page.getByTestId('codex')).toBeVisible();
  await stableFonts(page);
  await expect(page).toHaveScreenshot('desk-compendium.png', SCREENSHOT);
});

test('desk campaign chapter opening matches the baseline', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.removeItem('prestes.menu.desk.v1');
  });
  await page.goto('/');
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-a-divisao').click();
  await expect(page.getByTestId('chapter-commander')).toHaveText('Miguel Costa');
  await expect
    .poll(() => page.getByTestId('book-plate-image').evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
  await page.mouse.move(0, 0);
  await stableFonts(page);
  await expect(page).toHaveScreenshot('desk-campaign-chapter.png', SCREENSHOT);
});

test('desk gramophone screen matches the baseline', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.removeItem('prestes.menu.desk.v1');
  });
  await page.goto('/');
  await page.getByTestId('desk-gramophone-object').click();
  await expect(page.getByTestId('gramophone-title')).toBeVisible();
  await page.mouse.move(0, 0);
  await stableFonts(page);
  await expect(page).toHaveScreenshot('desk-gramophone.png', SCREENSHOT);
});

test('3v3 HUD matches the baseline', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __prestes?: unknown }).__prestes));
  // Pause so the panels stop changing.
  await page.evaluate(() =>
    (window as unknown as { __prestes: { step: (ticks: number) => void } }).__prestes.step(1),
  );
  // The full-screen 3D canvas sits behind the HUD; hide it rather than mask it.
  await page.addStyleTag({ content: '[data-testid="game-canvas"] { visibility: hidden !important; }' });
  await stableFonts(page);
  await expect(page).toHaveScreenshot('battle-hud.png', {
    ...SCREENSHOT,
    mask: [
      page.getByTestId('weapon-card').locator('.status-row'),
      page.getByTestId('weapon-card').locator('.status-details'),
      page.getByTestId('squad-status').locator('.mini-bar'),
      // troop-thumbnails-and-panel 4.1: the gauges move with the ticks run before the pause.
      page.getByTestId('troop-gauges'),
    ],
  });
});

async function openPausedHud(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __prestes?: unknown }).__prestes));
  await page.evaluate(() =>
    (window as unknown as { __prestes: { step: (ticks: number) => void } }).__prestes.step(1),
  );
  await page.addStyleTag({ content: '[data-testid="game-canvas"] { visibility: hidden !important; }' });
  await stableFonts(page);
}

const liveNumbers = (page: Page) => [
  page.getByTestId('weapon-card').locator('.status-row'),
  page.getByTestId('weapon-card').locator('.status-details'),
  page.getByTestId('squad-status').locator('.mini-bar'),
  page.getByTestId('troop-gauges'),
];

test('orders window as a column matches the baseline', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem('prestes.hud.docks.v1'));
  await openPausedHud(page);
  await expect(page.getByTestId('window-orders')).toHaveAttribute('data-minimized', 'false');
  await expect(page).toHaveScreenshot('orders-column.png', { ...SCREENSHOT, mask: liveNumbers(page) });
});

// troop-thumbnails-and-panel 4.1: the roster builder's type cards with their pictures.
test('skirmish roster builder matches the baseline', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem('prestes.roster.v1'));
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await expect(page.getByTestId('skirmish-setup')).toBeVisible();
  // scale-forces-by-map-size: the baseline shows the small map's 33-man limit.
  await page.getByTestId('map-option-paiolzinho').click();
  await expect
    .poll(() => page.getByTestId('roster-thumb-metralhadora').evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
  await page.mouse.move(0, 0);
  await stableFonts(page);
  await expect(page.getByTestId('roster-builder')).toHaveScreenshot('roster-builder.png', SCREENSHOT);
});
