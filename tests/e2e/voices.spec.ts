import { expect, test, type Page } from '@playwright/test';

// ambient-sound-and-voices 5.4-5.5: an order is spoken and answered in the
// battle, and its caption shows by the language: on in English, off in
// Portuguese until the player turns it on in the options.

type Bridge = {
  __prestes?: { command: (command: unknown) => void; frame: () => { units: { id: number; faction: string; squadId: number; x: number; y: number }[] } | null };
  __prestesAudio?: { voices: () => string[] };
};

async function openDesk(page: Page, locale: 'en' | 'pt-BR') {
  await page.addInitScript((value) => {
    window.localStorage.setItem('prestes.locale', value);
    // Kept over a reload, so the captions choice made in the options stays.
    if (!window.localStorage.getItem('prestes.audio.v1')) window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
  }, locale);
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
}

async function startBattle(page: Page) {
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  // A real click opens the audio context; the voices load once the battle runs.
  await page.getByTestId('start-battle').click();
  await expect(page.getByTestId('deployment-banner')).toHaveCount(0);
}

/** Orders the first section to hold, again until the voice files are loaded and its line is spoken. */
async function orderUntilSpoken(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const host = window as unknown as Bridge;
          const units = host.__prestes!.frame()!.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1).map((unit) => unit.id);
          host.__prestes!.command({ type: 'hold', unitIds: units });
          await new Promise((resolve) => setTimeout(resolve, 400));
          return host.__prestesAudio!.voices().some((id) => id.startsWith('comandante/hold-'));
        }),
      { timeout: 30_000 },
    )
    .toBe(true);
}

test('in English an order is spoken, answered and captioned', async ({ page }) => {
  await openDesk(page, 'en');
  await startBattle(page);
  await orderUntilSpoken(page);
  await expect(page.getByTestId('voice-caption')).toContainText(/Commander:|Soldier:/);
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestesAudio!.voices().some((id) => id.startsWith('soldado/hold-ack-'))), { timeout: 5000 }).toBe(true);
});

test('in Portuguese the captions are off until turned on in the options', async ({ page }) => {
  await openDesk(page, 'pt-BR');
  await startBattle(page);
  await orderUntilSpoken(page);
  await expect(page.getByTestId('voice-caption')).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await page.getByTestId('menu-mark-options').click();
  await expect(page.getByTestId('audio-captions')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('audio-captions').click();
  await expect(page.getByTestId('audio-captions')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await startBattle(page);
  await orderUntilSpoken(page);
  await expect(page.getByTestId('voice-caption')).toContainText(/Comandante:|Soldado:/);
});
