import { expect, test, type Page } from '@playwright/test';

// battle-feel-3v3: the 3 vs 3 battle from the main menu to its end panel.

interface Bridge {
  __prestes?: {
    command: (command: unknown) => void;
    frame: () => { units: Array<{ id: number; faction: string; alive: boolean; incapacitated: boolean }>; outcome: string } | null;
  };
}

async function startFromMenu(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0))
    .toBe(66);
}

/** Puts every legalist out of action through the sandbox command. */
async function breakTheEnemy(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bridge = (window as unknown as Bridge).__prestes!;
    for (const unit of bridge.frame()!.units) {
      if (unit.faction === 'legalist' && unit.alive) bridge.command({ type: 'incapacitate', targetId: unit.id });
    }
  });
}

// refine-battle-maps: a broken side out of contact falls back; the end panel
// counts the men who fell back as routed.
test('the last survivors fall back and the end panel counts them as routed', async ({ page }) => {
  await startFromMenu(page);
  await page.evaluate(() => {
    const bridge = (window as unknown as Bridge).__prestes!;
    const units = bridge.frame()!.units;
    const legalists = units.filter((unit) => unit.faction === 'legalist');
    for (const unit of legalists.slice(3)) bridge.command({ type: 'incapacitate', targetId: unit.id });
    // The column pulls back out of sight and holds its fire: no contact.
    const column = units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
    bridge.command({ type: 'fire_control', unitIds: column, mode: 'hold' });
    bridge.command({ type: 'withdraw', unitIds: column });
    (bridge as unknown as { step: (ticks: number) => void }).step(1500);
  });
  await expect(page.getByTestId('battle-end')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('battle-end-result')).toHaveText('Victory');
  await expect(page.getByTestId('battle-end-legalist').locator('td').nth(2)).toHaveText('3');
});

test('starts the 3 vs 3 from the menu and ends it in victory', async ({ page }) => {
  await startFromMenu(page);
  await expect(page.getByTestId('battle-end')).toHaveCount(0);
  await breakTheEnemy(page);
  await expect(page.getByTestId('battle-end')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('battle-end-result')).toHaveText('Victory');
  await expect(page.getByTestId('battle-end-legalist')).toContainText('33');

  // Fight again: a fresh battle with all 66 soldiers.
  await page.getByTestId('battle-end-restart').click();
  await expect(page.getByTestId('battle-end')).toHaveCount(0);
  // add-deployment-phase: the fresh battle opens in deployment too.
  await page.getByTestId('start-battle').click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const frame = (window as unknown as Bridge).__prestes?.frame();
        return frame ? frame.units.filter((unit) => unit.alive && !unit.incapacitated).length : 0;
      }),
    )
    .toBe(66);

  // And back to the main menu.
  await breakTheEnemy(page);
  await expect(page.getByTestId('battle-end')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('battle-end-menu').click();
  await expect(page.getByTestId('start-screen')).toBeVisible();
});
