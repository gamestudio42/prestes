import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// ambient-sound-and-voices 2.1: pictures of the battle menu and the compass
// for the owner's review. Runs only with PRESTES_REVIEW=1.

const OUT = 'docs/review/sound';

test.skip(!process.env.PRESTES_REVIEW, 'review pictures only on demand');

test('review: the battle menu and the options compass', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 })));
  await page.goto('/');
  await page.getByTestId('menu-mark-options').click();
  await expect(page.getByTestId('audio-channels')).toBeVisible();
  await page.waitForTimeout(800);
  writeFileSync(`${OUT}/options-compass.png`, await page.screenshot());
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('start-battle-3v3').click();
  await page.getByTestId('start-battle').click();
  await page.getByTestId('hud-menu').click();
  await expect(page.getByTestId('hud-menu-panel')).toBeVisible();
  await page.waitForTimeout(800);
  writeFileSync(`${OUT}/battle-menu.png`, await page.screenshot({ clip: { x: 760, y: 0, width: 640, height: 300 } }));
});
