import { expect, test } from '@playwright/test';

test('click and directional drag select the whole troop or soldiers only', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await page.waitForTimeout(800);
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');

  // Leftward marquee: blue, every player unit including the officer.
  await page.mouse.move(1200, 650);
  await page.mouse.down();
  await page.mouse.move(300, 120, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');

  // Rightward marquee keeps the whole troop selected.
  await page.mouse.move(300, 120);
  await page.mouse.down();
  await page.mouse.move(1200, 650, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');

  await page.getByTestId('squad-1').click();
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');
});

