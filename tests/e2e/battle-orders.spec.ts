import { expect, test, type Page } from '@playwright/test';

// refine-battle-controls: Shift appends orders to the section's queue, the HUD
// shows them, and a fourth is refused with a localized reason.

interface Bridge {
  __prestes?: {
    frame: () => { units: Array<{ id: number; faction: string; squadId: number; x: number; y: number; alive: boolean }> } | null;
  };
  __prestesScene?: {
    focusOn: (x: number, y: number) => void;
    groundToScreen: (x: number, y: number) => { x: number; y: number } | null;
  };
}

async function startBattle(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 })));
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.getByTestId('start-battle').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0))
    .toBe(66);
}

async function clickGround(page: Page, x: number, y: number, shift = false): Promise<void> {
  await page.evaluate(({ x, y }) => (window as unknown as Bridge).__prestesScene!.focusOn(x, y), { x, y });
  await page.waitForTimeout(250);
  const screen = await page.evaluate(
    ({ x, y }) => (window as unknown as Bridge).__prestesScene!.groundToScreen(x, y),
    { x, y },
  );
  expect(screen).not.toBeNull();
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.click(screen!.x, screen!.y);
  if (shift) await page.keyboard.up('Shift');
}

/** Arms Move on the board and clicks a ground point. */
async function moveTo(page: Page, x: number, y: number, shift = false): Promise<void> {
  await page.getByTestId('order-move').click();
  await clickGround(page, x, y, shift);
}

test('shift queues two orders and the HUD shows both chips', async ({ page }) => {
  await startBattle(page);
  const squad = await page.evaluate(() => {
    const units = (window as unknown as Bridge).__prestes!.frame()!.units.filter(
      (unit) => unit.faction === 'column' && unit.squadId === 1,
    );
    return {
      x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
      y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
    };
  });
  // A long first move keeps the section busy while the queued orders go in.
  await moveTo(page, squad.x, squad.y - 45);
  await moveTo(page, squad.x + 12, squad.y - 45, true);
  await moveTo(page, squad.x - 12, squad.y - 45, true);
  const queue = page.getByTestId('order-queue');
  await expect(queue).toBeVisible();
  await expect(queue.locator('li')).toHaveCount(2);
  await expect(queue.locator('li').first()).toHaveText('Move');

  // A third order fills the queue; the fourth is refused and says why.
  await moveTo(page, squad.x + 6, squad.y - 50, true);
  await expect(queue.locator('li')).toHaveCount(3);
  await moveTo(page, squad.x - 6, squad.y - 50, true);
  await expect(page.getByTestId('order-notice')).toContainText('three queued orders');
  await expect(queue.locator('li')).toHaveCount(3);
});
