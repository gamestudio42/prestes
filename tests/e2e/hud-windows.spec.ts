import { expect, test, type Page } from '@playwright/test';
import type { Command, Frame } from '@prestes/shared';

type Bridge = {
  __prestes?: { command: (command: Command) => void; step: (ticks: number) => void; frame: () => Frame | null };
};

test.setTimeout(90_000);

async function start(page: Page, ordersOpen = true): Promise<void> {
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => Boolean((window as unknown as Bridge).__prestes?.frame()));
  await expect(page.getByTestId('window-orders')).toBeVisible();
  if (ordersOpen) await expect(page.getByTestId('order-board')).toBeVisible();
}

const box = async (page: Page, id: string) => (await page.getByTestId(`window-${id}`).boundingBox())!;

type SceneHook = { __prestesScene?: { mapLayers: () => { contours: boolean; cover: boolean; coverSlots: number } } };

test('HUD panels are docked, collapse toward their edge and stay collapsed after a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1790, height: 878 });
  await page.goto('/');
  // An old floating-window layout is ignored: every panel opens docked.
  await page.evaluate(() => {
    window.localStorage.removeItem('prestes.hud.docks.v1');
    window.localStorage.setItem('prestes.hud.windows.v1', JSON.stringify({ orders: { x: 400, y: 400, minimized: true } }));
  });
  await page.reload();
  await start(page);

  const top = (await page.getByTestId('hud').boundingBox())!;
  const troops = await box(page, 'troops');
  const summary = await box(page, 'summary');
  const orders = await box(page, 'orders');
  for (const panel of [troops, summary, orders]) expect(panel.y).toBeGreaterThanOrEqual(top.y + top.height - 1);
  expect(troops.x).toBeLessThan(40);
  expect(summary.x).toBeLessThan(40);
  expect(orders.x + orders.width).toBeGreaterThan(1790 - 40);
  expect(summary.y).toBeGreaterThan(troops.y + troops.height);
  for (const id of ['troops', 'summary', 'orders']) {
    await expect(page.getByTestId(`window-${id}`)).toHaveAttribute('data-minimized', 'false');
  }
  // The troop selector keeps the reference's height whatever the number of sections.
  expect(Math.round(troops.height)).toBe(428);
  // No drag handle, no resize grip.
  await expect(page.locator('[data-testid$="-resize"]')).toHaveCount(0);

  // Troops folds up under the top bar; Summary and Orders fold down to the bottom edge.
  for (const id of ['troops', 'summary', 'orders']) await page.getByTestId(`window-${id}-toggle`).click();
  await expect(page.getByTestId('troop-helmets')).toHaveCount(0);
  const troopsTab = await box(page, 'troops');
  const summaryTab = await box(page, 'summary');
  const ordersTab = await box(page, 'orders');
  expect(Math.abs(troopsTab.y - troops.y)).toBeLessThanOrEqual(2);
  expect(troopsTab.height).toBeLessThan(60);
  expect(summaryTab.y + summaryTab.height).toBeGreaterThan(878 - 20);
  // Orders folds down to the bottom of its column, just above the kit strip.
  expect(ordersTab.y + ordersTab.height).toBeGreaterThan(878 - 120);
  expect(ordersTab.y).toBeGreaterThan(orders.y + 200);
  expect(ordersTab.height).toBeLessThan(60);

  await page.reload();
  await start(page, false);
  for (const id of ['troops', 'summary', 'orders']) {
    await expect(page.getByTestId(`window-${id}`)).toHaveAttribute('data-minimized', 'true');
  }
  await page.getByTestId('window-summary-toggle').click();
  await expect(page.getByTestId('troop-helmets')).toBeVisible();
});

for (const locale of ['en', 'pt-BR'] as const) {
  test(`at 1280 x 720 (${locale}) the docked panels neither overlap nor leave the screen`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.evaluate((value) => {
      window.localStorage.removeItem('prestes.hud.docks.v1');
      window.localStorage.setItem('prestes.locale', value);
    }, locale);
    await page.reload();
    await start(page);
    const panels = await Promise.all(['troops', 'summary', 'orders'].map((id) => box(page, id)));
    for (const panel of panels) {
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.y + panel.height).toBeLessThanOrEqual(720);
      expect(panel.x + panel.width).toBeLessThanOrEqual(1280);
    }
    const [troops, summary, orders] = panels as [typeof panels[0], typeof panels[0], typeof panels[0]];
    expect(troops.y + troops.height).toBeLessThanOrEqual(summary.y);
    expect(summary.x + summary.width).toBeLessThan(orders.x);
    // Every order button sits inside the Orders column.
    const column = (await page.getByTestId('window-orders').boundingBox())!;
    for (const button of await page.getByTestId('window-orders').locator('button').all()) {
      const rect = (await button.boundingBox())!;
      expect(rect.x + rect.width).toBeLessThanOrEqual(column.x + column.width + 1);
      expect(rect.y + rect.height).toBeLessThanOrEqual(column.y + column.height + 1);
    }
  });
}

test('the strategic band offers contour and cover layers, off at the start', async ({ page }) => {
  await page.goto('/');
  await start(page);
  const layers = () => page.evaluate(() => (window as unknown as SceneHook).__prestesScene!.mapLayers());

  // Tactical band: no switches.
  await expect(page.getByTestId('map-layers')).toHaveCount(0);
  await page.getByTestId('camera-strategic').click();
  await expect(page.getByTestId('layer-contours')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('layer-cover')).toHaveAttribute('aria-pressed', 'false');
  expect(await layers()).toEqual({ contours: false, cover: false, coverSlots: 0 });

  await page.getByTestId('layer-contours').click();
  await page.getByTestId('layer-cover').click();
  await expect(page.getByTestId('layer-cover')).toHaveAttribute('aria-pressed', 'true');
  const shown = await layers();
  expect(shown.contours).toBe(true);
  expect(shown.cover).toBe(true);
  expect(shown.coverSlots).toBeGreaterThan(0);

  // The layer draws the map's slots, not who holds them: time passing changes nothing.
  await page.evaluate(() => (window as unknown as Bridge).__prestes!.step(40));
  expect((await layers()).coverSlots).toBe(shown.coverSlots);

  // Back to tactical hides them; strategic again restores them.
  await page.getByTestId('camera-tactical').click();
  await expect(page.getByTestId('map-layers')).toHaveCount(0);
  await expect.poll(layers).toEqual({ contours: false, cover: false, coverSlots: 0 });
  await page.getByTestId('camera-strategic').click();
  await expect.poll(layers).toEqual(shown);
});

test('the troop summary draws a soldier figure per man: cover helmet, health body, five-round clip', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('prestes.hud.docks.v1'));
  await page.reload();
  await start(page);
  const figures = page.locator('[data-testid^="helmet-"]');
  await expect(figures).toHaveCount(11);
  await expect(figures.first().locator('svg.soldier-figure')).toHaveCount(1);
  await expect(figures.first()).toHaveAttribute('data-health', 'fit');
  await expect(figures.first()).toHaveAttribute('data-cover', /none|light|good|inside/);
  await expect(figures.first()).toHaveAttribute('data-rounds', '5');

  // Wound one soldier: his body turns to the wounded colour and he wears a bandage.
  const id = await page.evaluate(() => {
    const bridge = (window as unknown as Bridge).__prestes!;
    const soldier = bridge.frame()!.units.find((unit) => unit.squadId === 1 && unit.alive)!;
    bridge.command({ type: 'wound', targetId: soldier.id, hp: 30 });
    bridge.step(2);
    return soldier.id;
  });
  await expect(page.getByTestId(`helmet-${id}`)).toHaveAttribute('data-tone', 'wounded');
  await expect(page.getByTestId(`helmet-${id}`)).toHaveAttribute('data-health', /wounded|badly/);
  // Eleven figures fit on the card's width.
  const card = (await page.getByTestId('troop-helmets').boundingBox())!;
  const last = (await figures.last().boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(card.x + card.width + 1);
});

// troop-thumbnails-and-panel 3.1-3.2: the header and the figures read a section.
test('the troop panel header and figures: picture, order, counts, leader, wound and a man in a trench', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.removeItem('prestes.hud.docks.v1'));
  await page.reload();
  await start(page);
  await expect(page.getByTestId('troop-thumb')).toHaveAttribute('src', /assets\/sections\/[a-z0-9-]+\.png$/);
  await expect(page.getByTestId('troop-order')).toBeVisible();
  const counts = page.getByTestId('troop-counts');
  const fitBefore = Number(await counts.getAttribute('data-fit'));
  // The leader stands first and wears his star.
  const figures = page.locator('[data-testid^="helmet-"]');
  await expect(figures.first()).toHaveAttribute('data-leader', 'true');
  await expect(figures.first().locator('[data-mark="leader"]')).toHaveCount(1);
  await expect(page.locator('[data-leader="true"]')).toHaveCount(1);

  const ids = await page.evaluate(() => {
    const bridge = (window as unknown as Bridge).__prestes!;
    const men = bridge.frame()!.units.filter((unit) => unit.squadId === 1 && unit.alive);
    const hurt = men[men.length - 1]!;
    const dug = men[men.length - 2]!;
    bridge.command({ type: 'wound', targetId: hurt.id, hp: 30 });
    bridge.command({ type: 'spawn_cover', kind: 'trench', to: { x: dug.x, y: dug.y } });
    bridge.command({ type: 'stance', unitIds: [dug.id], stance: 'prone' });
    bridge.step(20);
    return { hurt: hurt.id, dug: dug.id };
  });
  // The wounded man: wounded body, a bandage, his tooltip says so; the header counts him.
  const hurt = page.getByTestId(`helmet-${ids.hurt}`);
  await expect(hurt).toHaveAttribute('data-health', /wounded|badly/);
  await expect(hurt).toHaveAttribute('title', /wounded|ferido/);
  await expect(counts).toHaveAttribute('data-fit', String(fitBefore - 1));
  await expect(counts).toHaveAttribute('data-wounded', '1');
  // The man prone in the trench: his helmet shows good cover; the tooltip names his role.
  const dug = page.getByTestId(`helmet-${ids.dug}`);
  await expect(dug).toHaveAttribute('data-cover', 'good');
  await expect(dug).toHaveAttribute('title', /Rifleman|Loader|Gunner|Bugler|Fuzileiro|Municiador|Atirador|Corneteiro/);
});
