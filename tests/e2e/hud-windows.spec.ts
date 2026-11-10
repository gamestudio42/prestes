import { expect, test, type Page } from '@playwright/test';
import type { Command, Frame } from '@prestes/shared';

type Bridge = {
  __prestes?: { command: (command: Command) => void; step: (ticks: number) => void; frame: () => Frame | null };
};

test.setTimeout(90_000);

async function start(page: Page): Promise<void> {
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => Boolean((window as unknown as Bridge).__prestes?.frame()));
  await expect(page.getByTestId('window-orders')).toBeVisible();
}

const box = async (page: Page, id: string) => (await page.getByTestId(`window-${id}`).boundingBox())!;

test('HUD windows can be dragged, minimized and stay where the player left them', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('prestes.hud.windows.v1'));
  await page.reload();
  await start(page);

  // Three windows, none covering the top bar.
  for (const id of ['orders', 'troops', 'summary']) {
    expect((await box(page, id)).y).toBeGreaterThanOrEqual(56);
  }

  // Drag Orders by its title bar to the top left.
  const title = (await page.getByTestId('window-orders-title').boundingBox())!;
  await page.mouse.move(title.x + 60, title.y + title.height / 2);
  await page.mouse.down();
  await page.mouse.move(80, 90, { steps: 8 });
  await page.mouse.up();
  const moved = await box(page, 'orders');
  expect(moved.x).toBeLessThan(40);
  expect(moved.y).toBeLessThan(120);

  // Minimize the summary: only the title bar remains.
  const full = await box(page, 'summary');
  await page.getByTestId('window-summary-toggle').click();
  await expect(page.getByTestId('window-summary')).toHaveAttribute('data-minimized', 'true');
  await expect(page.getByTestId('troop-helmets')).toHaveCount(0);
  expect((await box(page, 'summary')).height).toBeLessThan(full.height / 2);

  // After a reload the layout is the same.
  await page.reload();
  await start(page);
  const again = await box(page, 'orders');
  expect(Math.abs(again.x - moved.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(again.y - moved.y)).toBeLessThanOrEqual(2);
  await expect(page.getByTestId('window-summary')).toHaveAttribute('data-minimized', 'true');
  await page.getByTestId('window-summary-toggle').click();
  await expect(page.getByTestId('troop-helmets')).toBeVisible();
});

test('the troop summary shows a helmet and three bars per soldier', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('prestes.hud.windows.v1'));
  await page.reload();
  await start(page);
  await expect(page.locator('[data-testid^="helmet-"]')).toHaveCount(11);
  const first = page.locator('[data-testid^="helmet-"]').first();
  await expect(first.locator('.helmet-bar')).toHaveCount(3);

  // Wound one soldier: his helmet turns to the wounded colour.
  const id = await page.evaluate(() => {
    const bridge = (window as unknown as Bridge).__prestes!;
    const soldier = bridge.frame()!.units.find((unit) => unit.squadId === 1 && unit.alive)!;
    bridge.command({ type: 'wound', targetId: soldier.id, hp: 30 });
    bridge.step(2);
    return soldier.id;
  });
  await expect(page.getByTestId(`helmet-${id}`)).toHaveAttribute('data-tone', 'wounded');
});

test('the Orders window turns into a tall column, resizes and keeps its shape', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('prestes.hud.windows.v1'));
  await page.reload();
  await start(page);

  const wide = await box(page, 'orders');
  expect(wide.width).toBeGreaterThan(wide.height);
  await expect(page.getByTestId('window-orders')).toHaveAttribute('data-orientation', 'horizontal');

  // The column button lays it out narrow and tall, its buttons stacked.
  await page.getByTestId('window-orders-orientation').click();
  await expect(page.getByTestId('window-orders')).toHaveAttribute('data-orientation', 'vertical');
  const column = await box(page, 'orders');
  expect(column.width).toBeLessThan(200);
  expect(column.height).toBeGreaterThan(600);
  expect(column.y).toBeGreaterThanOrEqual(56);
  const sectors = page.getByTestId('order-board').locator('.order-sector');
  const first = (await sectors.nth(0).boundingBox())!;
  const second = (await sectors.nth(1).boundingBox())!;
  expect(second.y).toBeGreaterThan(first.y + first.height - 1);
  const posture = (await page.locator('.posture-group').boundingBox())!;
  const fire = (await page.getByTestId('fire-control').boundingBox())!;
  expect(fire.y).toBeGreaterThan(posture.y);
  // Every order button still fits inside the column.
  const attack = (await page.getByTestId('order-attack').boundingBox())!;
  expect(attack.x + attack.width).toBeLessThanOrEqual(column.x + column.width);

  // Drag the grip: a shorter, narrower column (it sits against the right edge).
  const grip = (await page.getByTestId('window-orders-resize').boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 - 8, grip.y + grip.height / 2 - 200, { steps: 8 });
  await page.mouse.up();
  const resized = await box(page, 'orders');
  expect(Math.abs(resized.height - (column.height - 200))).toBeLessThanOrEqual(4);
  expect(Math.abs(resized.width - (column.width - 8))).toBeLessThanOrEqual(4);

  // The size is part of the saved layout and survives a reload.
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('prestes.hud.windows.v1') ?? '{}'));
  expect(saved.orders.w).toBeGreaterThan(0);
  expect(saved.orders.h).toBeGreaterThan(saved.orders.w);
  await page.reload();
  await start(page);
  await expect(page.getByTestId('window-orders')).toHaveAttribute('data-orientation', 'vertical');
  const again = await box(page, 'orders');
  expect(Math.abs(again.height - resized.height)).toBeLessThanOrEqual(2);

  // And back to the wide row.
  await page.getByTestId('window-orders-orientation').click();
  await expect(page.getByTestId('window-orders')).toHaveAttribute('data-orientation', 'horizontal');
  const back = await box(page, 'orders');
  expect(back.width).toBeGreaterThan(back.height);
});
