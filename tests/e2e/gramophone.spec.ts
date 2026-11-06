import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('prestes.locale', 'en'));
});

test('starts on the first gesture, changes tracks and shows the card', async ({ page }) => {
  await page.goto('/');
  const widget = page.getByTestId('gramophone');
  const play = page.getByTestId('gramophone-play');

  await expect(widget).toBeVisible();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Plangente');
  await expect(play).toHaveAttribute('data-state', 'paused');
  await expect(widget).toContainText('Track 1 of 17');

  // The first click on the book is the gesture that starts the music.
  await page.getByTestId('menu-mark-skirmish').click();
  await expect(play).toHaveAttribute('data-state', 'playing');

  await page.getByTestId('gramophone-next').click();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Escovado');
  const card = page.getByTestId('gramophone-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Composer');
  await expect(card).toContainText('Ernesto Nazareth');
  await expect(card).toContainText('Banda do 1º Regimento');
  await expect(card).toContainText('1905');
  await expect(card).toContainText('Public domain since 2005');
  await expect(card.getByRole('link')).toHaveAttribute(
    'href',
    'https://discografiabrasileira.com.br/fonograma/8224/escovado-odeon-r-10149',
  );

  await page.getByTestId('gramophone-previous').click();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Plangente');
  await expect(card).toContainText('Ernesto Nazareth');

  await play.click();
  await expect(play).toHaveAttribute('data-state', 'paused');
  await play.click();
  await expect(play).toHaveAttribute('data-state', 'playing');
});

test('play enables sound after the options mute', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('menu-mark-options').click();
  const audio = page.getByTestId('start-audio');

  await audio.click();
  await expect(audio).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('gramophone-play')).toHaveAttribute('data-state', 'paused');
  await expect(page.getByTestId('gramophone')).toContainText('Sound is off');

  await page.getByTestId('gramophone-play').click();
  await expect(audio).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('gramophone-play')).toHaveAttribute('data-state', 'playing');
});

test('remembers the selected track after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('gramophone-next').click();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Escovado');

  await page.reload();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Escovado');
  await expect(page.getByTestId('gramophone-play')).toHaveAttribute('data-state', 'paused');
});
