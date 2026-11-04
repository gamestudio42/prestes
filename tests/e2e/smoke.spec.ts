import { expect, test } from '@playwright/test';

test('boots, selects a section, gives orders, fights and toggles the post', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();

  await page.getByTestId('language-select').selectOption('pt-BR');
  await expect(page.getByTestId('start-button')).toHaveText('Iniciar bootcamp');

  await page.reload();
  await expect(page.getByTestId('start-button')).toHaveText('Iniciar bootcamp');

  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 16px "Pixelify Sans"'))).toBe(true);
  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByTestId('squad-status')).toBeVisible();
  await expect(page.getByTestId('tutorial-panel')).toHaveCount(0);
  await expect(page.getByTestId('portrait-placeholder')).toHaveCount(1);
  await expect(page.getByTestId('weapon-value')).toContainText('Fuzil Mauser 7 mm');
  await expect(page.getByTestId('weapon-card')).toContainText(/\d+\/\d+/);
  await expect(page.getByTestId('morale-state')).toContainText('Estado: Firme');
  await expect(page.getByTestId('morale-state')).toContainText(/Cobertura: \d+%/);
  await expect(page.getByTestId('app')).not.toHaveAttribute('data-tick', '0', { timeout: 5000 });
  await expect(page.getByTestId('hud')).not.toContainText('Tick');
  await expect(page.getByTestId('band-value')).toContainText('Estratégica');
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

  await page.getByTestId('order-tab-troop').click();
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

  await page.getByRole('button', { name: 'Códice' }).click();
  await expect(page.getByTestId('codex')).toBeVisible();
  await expect(page.getByTestId('codex-label-historical').first()).toHaveText('Histórico');
});















