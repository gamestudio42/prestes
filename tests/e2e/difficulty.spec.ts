import { expect, test } from '@playwright/test';

// add-difficulty-levels 3.2: the level is chosen on the setup screen, rides
// the battle's frames and is named on the end panel; the economical fire
// button sits in the order board's Fire row.

interface Bridge {
  __prestes?: {
    frame: () => { difficulty?: string; units: Array<{ id: number; faction: string; fireControl?: string }> } | null;
    step: (ticks: number) => void;
  };
}

test.beforeEach(async ({ page }) => {
  // Keep the game muted while it runs (the owner's rule for the preview).
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
    } catch {
      // storage blocked: the test does not depend on it
    }
  });
});

test('Level chosen and started: Oficial is fought, framed and named at the end', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await expect(page.getByTestId('difficulty-soldado')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('difficulty-oficial').click();
  await expect(page.getByTestId('difficulty-oficial')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('setup-difficulty-description')).not.toBeEmpty();
  await page.getByTestId('time-limit-9000').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.difficulty))
    .toBe('oficial');

  // The Fire row offers economical fire for the selected section.
  await expect(page.getByTestId('fire-economy')).toBeVisible();
  await page.getByTestId('fire-economy').click();
  await expect(page.getByTestId('fire-economy')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('start-battle').click();
  await page.evaluate(() => (window as unknown as Bridge).__prestes!.step(9000));
  await expect(page.getByTestId('battle-end')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('battle-end-difficulty')).toHaveAttribute('data-value', 'oficial');
});

test('Level remembered: História is offered again after a battle', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('difficulty-historia').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await expect(page.getByTestId('difficulty-historia')).toHaveAttribute('aria-pressed', 'true');
});
