import { expect, test } from '@playwright/test';

// ambient-sound-and-voices 6.1 (D9): sound never holds a battle. With every
// audio file slow, a skirmish still opens and starts; the order lines are
// asked for before the call-outs, and the voices play once they arrive.

type Bridge = {
  __prestes?: { command: (command: unknown) => void; frame: () => { units: { id: number; faction: string; squadId: number }[] } | null };
  __prestesAudio?: { voices: () => string[] };
};

test('a battle opens and starts while every audio file is slow, the order lines first', async ({ page }) => {
  test.setTimeout(90_000);
  const requested: string[] = [];
  await page.route(/\/audio\//, async (route) => {
    requested.push(new URL(route.request().url()).pathname);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
  });
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await page.getByTestId('start-battle').click({ timeout: 20_000 });
  const started = Date.now();
  await expect(page.getByTestId('deployment-banner')).toHaveCount(0, { timeout: 2000 });
  expect(Date.now() - started).toBeLessThan(2000);

  // The order lines and answers are asked for first; the call-outs after them.
  await expect.poll(() => requested.some((path) => /\/voice\/soldado\/[a-z-]+-\d\.mp3$/.test(path) && !path.includes('-ack-')), { timeout: 20_000 }).toBe(true);
  const voices = requested.filter((path) => path.includes('/voice/'));
  const lastOrder = voices.map((path) => /\/voice\/(comandante\/|soldado\/.*-ack-)/.test(path)).lastIndexOf(true);
  const firstCallout = voices.findIndex((path) => /\/voice\/(xingamento|inimigo)\/|\/voice\/soldado\/(?!.*-ack-)/.test(path));
  expect(lastOrder).toBeLessThan(firstCallout);

  // Once loaded, an order is spoken.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const host = window as unknown as Bridge;
          const units = host.__prestes!.frame()!.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1).map((unit) => unit.id);
          host.__prestes!.command({ type: 'hold', unitIds: units });
          await new Promise((resolve) => setTimeout(resolve, 500));
          return host.__prestesAudio!.voices().some((id) => id.startsWith('comandante/'));
        }),
      { timeout: 30_000 },
    )
    .toBe(true);
});
