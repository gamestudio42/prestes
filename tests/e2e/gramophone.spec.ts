import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('prestes.locale', 'en'));
});

// On the desk the gramophone opens from its object; opening it is the gesture
// that starts the music.
const openGramophone = (page: Page) => page.getByTestId('desk-gramophone-object').click();

test('starts on the first gesture, changes tracks and shows the record facts', async ({ page }) => {
  await page.goto('/');
  await openGramophone(page);
  const widget = page.getByTestId('gramophone');
  const play = page.getByTestId('gramophone-play');

  await expect(widget).toBeVisible();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Plangente');
  await expect(widget).toContainText('Track 1 of 17');
  await expect(play).toHaveAttribute('data-state', 'playing');

  await page.getByTestId('gramophone-next').click();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Escovado');
  // The open screen lists the record's facts beside the cabinet.
  const card = widget;
  await expect(card).toContainText('Ernesto Nazareth');
  await expect(card).toContainText('Banda do 1º Regimento');
  await expect(card).toContainText('1905');
  await expect(card).toContainText('Public domain since 2005');
  await expect(card.locator('.desk-gramophone-source')).toHaveAttribute(
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
  await page.keyboard.press('Escape');
  await openGramophone(page);
  await expect(page.getByTestId('gramophone-play')).toHaveAttribute('data-state', 'paused');
  await expect(page.getByTestId('gramophone')).toContainText('Sound is off');

  await page.getByTestId('gramophone-play').click();
  await expect(page.getByTestId('gramophone-play')).toHaveAttribute('data-state', 'playing');
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-mark-options').click();
  await expect(page.getByTestId('start-audio')).toHaveAttribute('aria-pressed', 'true');
});

test('remembers the selected track after a reload', async ({ page }) => {
  await page.goto('/');
  await openGramophone(page);
  await page.getByTestId('gramophone-next').click();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Escovado');

  await page.reload();
  if ((await page.getByTestId('gramophone-title').count()) === 0) await openGramophone(page);
  await expect(page.getByTestId('gramophone-title')).toHaveText('Escovado');
});
