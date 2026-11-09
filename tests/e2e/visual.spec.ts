import { expect, test, type Page } from '@playwright/test';

// Local visual regression for the HUD and start screen. The 3D canvas is hidden
// and the live numbers are masked; the rest of the chrome must match the baselines.

const SCREENSHOT = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 } as const;

// The menu video holds its first frame for reduced motion, but that frame depends on
// when the video finishes loading, so the screenshots hide it. A mask would cover the
// book too: the video canvas fills the screen.
const HIDE_MENU_VIDEO = '[data-testid="menu-video"] { visibility: hidden; }';
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
  await page.addStyleTag({ content: HIDE_MENU_VIDEO });
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
  await page.addStyleTag({ content: HIDE_MENU_VIDEO });
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
  await page.addStyleTag({ content: HIDE_MENU_VIDEO });
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
  await page.addStyleTag({ content: HIDE_MENU_VIDEO });
  await stableFonts(page);
  await expect(page).toHaveScreenshot('desk-gramophone.png', SCREENSHOT);
});

test('3v3 HUD matches the baseline', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as unknown as { __prestes?: unknown }).__prestes));
  // Pause so the panels stop changing, then show the orders panel.
  await page.evaluate(() =>
    (window as unknown as { __prestes: { step: (ticks: number) => void } }).__prestes.step(1),
  );
  if ((await page.getByTestId('orders-toggle').getAttribute('aria-label'))?.match(/show|mostrar/i)) {
    await page.getByTestId('orders-toggle').click();
  }
  // The full-screen 3D canvas sits behind the HUD; hide it rather than mask it.
  await page.addStyleTag({ content: '[data-testid="game-canvas"] { visibility: hidden !important; }' });
  await stableFonts(page);
  await expect(page).toHaveScreenshot('battle-hud.png', {
    ...SCREENSHOT,
    mask: [
      page.getByTestId('weapon-card').locator('.status-row'),
      page.getByTestId('weapon-card').locator('.status-details'),
      page.getByTestId('squad-status').locator('.mini-bar'),
    ],
  });
});

async function openPausedHud(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
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
];

test('collapsed orders panel matches the baseline', async ({ page }) => {
  await openPausedHud(page);
  if ((await page.getByTestId('orders-toggle').getAttribute('aria-label'))?.match(/hide|ocultar/i)) {
    await page.getByTestId('orders-toggle').click();
  }
  await expect(page).toHaveScreenshot('orders-collapsed.png', { ...SCREENSHOT, mask: liveNumbers(page) });
});

test('sandbox panel matches the baseline', async ({ page }) => {
  await openPausedHud(page);
  await page.keyboard.press('F1');
  await expect(page.getByTestId('sandbox-panel')).toBeVisible();
  await expect(page).toHaveScreenshot('sandbox-panel.png', {
    ...SCREENSHOT,
    mask: [...liveNumbers(page), page.getByTestId('sandbox-panel').locator('dl, .sandbox-inspector')],
  });
});
