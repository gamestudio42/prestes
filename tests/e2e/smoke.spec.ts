import { expect, test } from '@playwright/test';

test('boots, selects a section, gives orders, fights and toggles the post', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();

  await page.getByTestId('menu-mark-options').click();
  await page.getByTestId('language-select').selectOption('pt-BR');
  await expect(page.getByTestId('menu-mark-campaign')).toContainText('Campanha');

  await page.reload();
  await expect(page.getByTestId('menu-mark-campaign')).toContainText('Campanha');

  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 16px "Pixelify Sans"'))).toBe(true);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('squad-status')).toBeVisible();
  await expect(page.getByTestId('tutorial-panel')).toHaveCount(0);
  // The 3v3: one card per section.
  // troop-thumbnails-and-panel 3.5: each section card shows its type's picture.
  await expect(page.getByTestId('portrait-placeholder')).toHaveCount(0);
  await expect(page.locator('[data-testid^="section-thumb-"]')).toHaveCount(3);
  await expect(page.locator('[data-testid^="section-thumb-"]').first()).toHaveAttribute('src', /assets\/sections\/[a-z0-9-]+\.png\?v=[\w-]+$/);
  await expect(page.getByTestId('weapon-value')).toContainText('Fuzil Mauser 7 mm');
  await expect(page.getByTestId('weapon-card')).toContainText(/\d+\/\d+/);
  // troop-thumbnails-and-panel 3.3: the state and cover are the troop panel's gauges.
  await expect(page.getByTestId('gauge-morale')).toContainText('Firme');
  await expect(page.getByTestId('gauge-cover')).toContainText(/Cobertura\s*\d+/);
  await expect(page.getByTestId('app')).not.toHaveAttribute('data-tick', '0', { timeout: 5000 });
  await expect(page.getByTestId('hud')).not.toContainText('Tick');
  // refine-battle-maps 6.1: the battle opens at tactical span on the first section.
  await expect(page.getByTestId('band-value')).toContainText('Tática');
  await expect(page.getByTestId('squad-1')).toHaveAttribute('aria-pressed', 'true');
  // The game starts at the speed labelled 1x; 0.5x is the slow option.
  await expect(page.getByTestId('speed-2')).toHaveClass(/active/);
  await expect(page.getByTestId('speed-2')).toHaveAttribute('aria-label', '1x');


  await page.getByTestId('pause-button').click();
  await expect(page.getByTestId('pause-button')).toHaveAttribute('aria-label', 'Retomar');
  await page.getByTestId('pause-button').click();
  await expect(page.getByTestId('pause-button')).toHaveAttribute('aria-label', 'Pausar');
  await expect(page.getByTestId('speed-2')).toHaveClass(/active/);

  await page.getByTestId('speed-2').click();
  await expect(page.getByTestId('speed-2')).toHaveClass(/active/);
  // 1x is real time; 4x hurries a quiet stretch (order-tempo-and-facing).
  await expect(page.getByTestId('speed-8')).toHaveAttribute('aria-label', '4x');
  await page.getByTestId('speed-8').click();
  await expect(page.getByTestId('speed-8')).toHaveClass(/active/);
  await page.getByTestId('speed-1').click();

  await page.getByTestId('stance-crouch').click();
  await expect(page.getByTestId('stance-value')).toContainText('Agachado');
  await page.getByTestId('stance-prone').click();
  await expect(page.getByTestId('stance-value')).toContainText('Deitado');
  await page.getByTestId('stance-stand').click();
  await expect(page.getByTestId('stance-value')).toContainText('Em pé');

  await page.getByTestId('order-suppress').click();
  await expect(page.getByTestId('order-suppress')).toHaveClass(/active/);
  await expect(page.getByTestId('order-hint')).toContainText('suprimir');
  await page.getByTestId('order-cancel').click();
  await expect(page.getByTestId('order-suppress')).not.toHaveClass(/active/);

  await page.getByTestId('order-tab-fire').click();
  await page.getByTestId('order-flank').click();
  await expect(page.getByTestId('order-flank')).toHaveClass(/active/);
  await expect(page.getByTestId('order-hint')).toContainText('flanquear');
  await page.getByTestId('order-cancel').click();

  await page.mouse.move(640, 360);
  for (let index = 0; index < 6; index += 1) {
    await page.mouse.wheel(0, 120);
  }
  await expect(page.getByTestId('band-value')).toContainText('Estratégica');

  await expect(page.getByTestId('post-mode')).toContainText('Pós: Forte');
  await page.getByTestId('post-mode').click();
  await expect(page.getByTestId('post-mode')).toContainText('Pós: Limpo');

  // refine-battle-controls 4.1: the battle HUD has no codex; the desk's compendium is its home.
  await expect(page.getByRole('button', { name: 'Códice' })).toHaveCount(0);
});















