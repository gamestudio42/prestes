import { expect, test } from '@playwright/test';

test('picking an order shows its preview, and the HUD hides and comes back', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __prestes?: { frame?: () => unknown } }).__prestes?.frame?.()));
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');

  // No preview switch in the Troops window, nor a "More" button by the weapon:
  // the preview comes on by itself when an order is picked.
  await expect(page.getByTestId('preview-toggle')).toHaveCount(0);
  await expect(page.getByTestId('hud-more')).toHaveCount(0);

  await page.getByTestId('order-attack').click();
  await page.getByTestId('game-canvas').hover({ position: { x: 700, y: 300 } });
  await expect(page.getByTestId('target-reticle')).toBeVisible();
  await page.getByTestId('order-cancel').click();
  await page.getByTestId('order-defend').click();
  await page.getByTestId('game-canvas').hover({ position: { x: 900, y: 300 } });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/preview-hud.png' });
  await expect(page.getByTestId('game-canvas')).not.toHaveAttribute('data-preview', '0');
  await page.getByTestId('order-cancel').click();

  // H hides the HUD; the restore button or H again bring it back.
  await page.keyboard.press('h');
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
