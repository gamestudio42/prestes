import { expect, test, type Page } from '@playwright/test';

// Local visual regression for the HUD and start screen. The 3D canvas is hidden
// and the live numbers are masked; the rest of the chrome must match the baselines.

const SCREENSHOT = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 } as const;

async function stableFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

test('start screen matches the baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await stableFonts(page);
  await expect(page).toHaveScreenshot('start-screen.png', SCREENSHOT);
});

test('bootcamp HUD matches the baseline', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
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
  await expect(page).toHaveScreenshot('bootcamp-hud.png', {
    ...SCREENSHOT,
    mask: [
      page.getByTestId('tick-value'),
      page.getByTestId('weapon-card').locator('.status-row'),
      page.getByTestId('weapon-card').locator('.status-details'),
      page.getByTestId('squad-status').locator('.mini-bar'),
    ],
  });
});
