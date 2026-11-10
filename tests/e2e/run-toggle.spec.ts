import { expect, test, type Page } from '@playwright/test';

// add-run-toggle 2.1: the order board's pace, Walk or Run, and the R key.

interface Unit {
  id: number;
  faction: string;
  squadId: number;
  hurry?: boolean;
  gait?: string;
}
interface Bridge {
  __prestes?: { command: (command: unknown) => void; step: (ticks: number) => void; frame: () => { tick: number; units: Unit[] } | null };
}

const firstSection = async (page: Page) =>
  (await page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!.units)).filter((unit) => unit.faction === 'column' && unit.squadId === 1);

test('run toggle: Run hurries the selected section, R walks it again', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => Boolean((window as unknown as Bridge).__prestes?.frame()));
  await page.getByTestId('squad-1').click();
  await expect(page.getByTestId('pace')).toHaveAttribute('data-value', 'walk');
  await expect(page.getByTestId('pace-walk')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('pace-run').click();
  await expect(page.getByTestId('pace')).toHaveAttribute('data-value', 'run');
  expect((await firstSection(page)).every((unit) => unit.hurry === true)).toBe(true);

  // A move goes at a run.
  const ids = (await firstSection(page)).map((unit) => unit.id);
  await page.evaluate((unitIds) => (window as unknown as Bridge).__prestes!.command({ type: 'move', unitIds, to: { x: 0, y: 60 } }), ids);
  await expect.poll(async () => (await firstSection(page)).filter((unit) => unit.gait === 'run').length).toBeGreaterThan(5);

  await page.keyboard.press('r');
  await expect(page.getByTestId('pace')).toHaveAttribute('data-value', 'walk');
  expect((await firstSection(page)).some((unit) => unit.hurry)).toBe(false);
});

test('the pace speaks Portuguese', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await page.getByTestId('start-battle').click();
  await page.getByTestId('hud-language-select').selectOption('pt-BR');
  await expect(page.getByTestId('pace-run')).toHaveText('Correr');
  await expect(page.getByTestId('pace-walk')).toHaveText('Andar');
});
