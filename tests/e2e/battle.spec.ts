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
  await page.getByTestId('menu-mark-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
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
