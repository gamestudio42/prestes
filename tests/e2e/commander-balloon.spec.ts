import { expect, test, type Page } from '@playwright/test';
import type { Command, Frame } from '@prestes/shared';

type Bridge = {
  __prestes?: { command: (command: Command) => void; step: (ticks: number) => void; frame: () => Frame | null };
};

test.setTimeout(90_000);

async function stepRendered(page: Page, ticks: number): Promise<void> {
  const target = (await page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!.tick)) + ticks;
  await page.evaluate((count) => (window as unknown as Bridge).__prestes!.step(count), ticks);
  await page.waitForFunction(
    (tick) => Number(document.querySelector('[data-testid="app"]')?.getAttribute('data-tick')) >= tick,
    target,
  );
}

test('the instructor says the current order in a balloon and the panel names the place', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => Boolean((window as unknown as Bridge).__prestes?.frame()));
  await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', 'formation');
  await stepRendered(page, 3);

  // The station is named on the panel, and the camera starts on it.
  await expect(page.getByTestId('training-area')).toContainText('Vila Militar');

  // The balloon shows the active objective's order and stays up.
  const balloon = page.getByTestId('commander-balloon');
  await expect(balloon).toBeVisible();
  const first = (await balloon.textContent())?.trim() ?? '';
  expect(first.length).toBeGreaterThan(5);
  await stepRendered(page, 60);
  await expect(balloon).toHaveText(first);

  // Completing the objective (select the section) moves the balloon to the next order.
  await page.getByTestId('squad-1').click();
  await stepRendered(page, 2);
  await expect(page.getByTestId('training-objective-formation-select')).toHaveAttribute('data-done', 'true');
  await expect(balloon).not.toHaveText(first);
});
