import { expect, test, type Page } from '@playwright/test';

// refine-battle-controls: double-click centres the view; the top bar leaves the
// battle with a confirmation; the battle offers no codex.
interface Bridge {
  __prestes?: {
    frame: () => { units: Array<{ id: number; faction: string; squadId: number; alive: boolean; routed: boolean; x: number; y: number }> } | null;
  };
  __prestesScene?: { view: () => { x: number; y: number; span: number } };
}

async function startBattle(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 })));
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.getByTestId('start-battle').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0)).toBe(66);
}

const centroid = (page: Page, squadId: number) =>
  page.evaluate((squad) => {
    const units = (window as unknown as Bridge).__prestes!.frame()!.units.filter(
      (unit) => unit.squadId === squad && unit.alive && !unit.routed,
    );
    return {
      x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
      y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
    };
  }, squadId);

const view = (page: Page) =>
  page.evaluate(() => (window as unknown as Bridge).__prestesScene!.view());

test('a double-click centres the selected section, and the card double-click selects and centres it', async ({ page }) => {
  await startBattle(page);
  // Select the second section, then double-click its summary.
  await page.getByTestId('squad-2').click();
  await page.getByTestId('troop-summary').dblclick();
  const second = await centroid(page, 2);
  await expect
    .poll(async () => {
      const at = await view(page);
      return Math.hypot(at.x - second.x, at.y - second.y);
    })
    .toBeLessThan(8);

  // A double-click on a card selects and centres that section.
  await page.getByTestId('squad-3').dblclick();
  await expect(page.getByTestId('squad-3')).toHaveAttribute('aria-pressed', 'true');
  const third = await centroid(page, 3);
  await expect
    .poll(async () => {
      const at = await view(page);
      return Math.hypot(at.x - third.x, at.y - third.y);
    })
    .toBeLessThan(8);
});

test('the top bar leaves the battle only after confirmation, and the battle has no codex', async ({ page }) => {
  await startBattle(page);
  await expect(page.getByTestId('codex-toggle')).toHaveCount(0);
  await page.getByTestId('hud-menu').click();
  await page.getByTestId('leave-battle').click();
  await expect(page.getByTestId('leave-battle-dialog')).toBeVisible();
  await page.getByTestId('leave-cancel').click();
  await expect(page.getByTestId('leave-battle-dialog')).toHaveCount(0);
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.getByTestId('hud-menu').click();
  await page.getByTestId('leave-battle').click();
  await page.getByTestId('leave-confirm').click();
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('hud')).toHaveCount(0);
  // The desk's compendium book is still the way to read it.
  await expect(page.getByTestId('start-codex')).toBeVisible();
});
