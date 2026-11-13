import { expect, test, type Page } from '@playwright/test';

// ambient-sound-and-voices 2.1: the mute and the three channel volumes, in
// the battle's menu and in the options compass, applied to the mixer.

interface AudioBridge {
  __prestesAudio?: {
    levels: () => { ready: boolean; muted?: boolean; effects?: number; ambience?: number; voices?: number };
  };
}

const levels = (page: Page) => page.evaluate(() => (window as unknown as AudioBridge).__prestesAudio?.levels() ?? { ready: false });

async function toDeployment(page: Page): Promise<void> {
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
}

test('voices without ambience: the ambience bus at zero, voices and effects up, kept after a reload', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: false, volume: 0.02 }));
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto('/');
  await toDeployment(page);
  await page.getByTestId('hud-menu').click();
  await expect(page.getByTestId('audio-channels')).toBeVisible();
  await page.getByTestId('audio-ambience').fill('0');
  await page.getByTestId('audio-voices').fill('100');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('hud-menu-panel')).toHaveCount(0);
  // Starting the battle is the gesture that opens the audio.
  await page.getByTestId('start-battle').click();
  await expect.poll(() => levels(page)).toMatchObject({ ready: true, muted: false, ambience: 0, voices: 1 });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('prestes.audio.v1')!));
  expect(stored).toMatchObject({ muted: false, ambience: 0, voices: 1 });

  await page.reload();
  await toDeployment(page);
  await page.getByTestId('hud-menu').click();
  await expect(page.getByTestId('audio-ambience')).toHaveValue('0');
  await expect(page.getByTestId('audio-voices')).toHaveValue('100');
});

test('an older muted setting keeps the game muted, and the menu unmutes it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 })));
  await page.goto('/');
  await toDeployment(page);
  await page.getByTestId('start-battle').click();
  await page.getByTestId('hud-menu').click();
  await expect(page.getByTestId('hud-audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('hud-audio-toggle').click();
  await expect.poll(() => levels(page)).toMatchObject({ ready: true, muted: false, effects: 1 });
  await page.getByTestId('hud-audio-toggle').click();
  await expect.poll(() => levels(page)).toMatchObject({ muted: true });
});

test('the options compass has the three channel volumes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35, ambience: 0.4 })));
  await page.goto('/');
  await page.getByTestId('menu-mark-options').click();
  await expect(page.getByTestId('audio-channels')).toBeVisible();
  await expect(page.getByTestId('audio-effects')).toHaveValue('100');
  await expect(page.getByTestId('audio-ambience')).toHaveValue('40');
  await page.getByTestId('audio-effects').fill('50');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prestes.audio.v1')!).effects)).toBe(0.5);
});
