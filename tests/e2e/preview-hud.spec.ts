import { expect, test } from '@playwright/test';

test('toggles the opt-in preview and hides/restores the HUD', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __prestes?: { frame?: () => unknown } }).__prestes?.frame?.()));
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');

  await expect(page.getByTestId('preview-toggle')).not.toHaveClass(/active/);
  await page.getByTestId('preview-toggle').hover();
  await expect(page.getByRole('tooltip')).toContainText('Preview');
  await page.getByTestId('preview-toggle').click();
  await expect(page.getByTestId('preview-toggle')).toHaveClass(/active/);

  await page.getByTestId('order-attack').click();
  await page.getByTestId('game-canvas').hover({ position: { x: 700, y: 300 } });
  await expect(page.getByTestId('target-reticle')).toBeVisible();
  await page.getByTestId('order-cancel').click();
  await page.getByTestId('order-tab-troop').click();
  await page.getByTestId('order-defend').click();
  await page.getByTestId('game-canvas').hover({ position: { x: 900, y: 300 } });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/preview-hud.png' });
  await expect(page.getByTestId('game-canvas')).not.toHaveAttribute('data-preview', '0');

  await page.getByTestId('hud-more').click();
  await expect(page.getByTestId('audio-toggle')).toBeVisible();
  await page.getByTestId('audio-toggle').click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('prestes.audio.v1'))).toContain('"muted":true');
  await page.getByTestId('hide-hud').click();
  await expect(page.getByTestId('hud')).toHaveCount(0);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('hud-restore')).toBeVisible();

  await page.getByTestId('hud-restore').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.keyboard.press('h');
  await expect(page.getByTestId('hud')).toHaveCount(0);
  await page.keyboard.press('h');
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.setViewportSize({ width: 1000, height: 800 });
  await page.screenshot({ path: 'test-results/hud-narrow.png' });
});







