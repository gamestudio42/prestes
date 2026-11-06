import { expect, test, type Page } from '@playwright/test';

// add-battle-maps: the battlefields, chosen on the menu.

interface Unit {
  id: number;
  x: number;
  y: number;
  faction: string;
  squadId: number;
  alive: boolean;
  concealed?: boolean;
}
interface Frame {
  tick: number;
  units: Unit[];
  ferries?: { id: number; x: number; y: number; moving: boolean }[];
}
interface Bridge {
  __prestes?: {
    frame: () => Frame | null;
    command: (command: unknown) => void;
    step: (ticks: number) => void;
  };
}

async function startOn(page: Page, map: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('menu-mark-skirmish').click();
  await page.getByTestId(`map-option-${map}`).click();
  await expect(page.getByTestId(`map-option-${map}`)).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0))
    .toBe(66);
}

const frame = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!);

const tick = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!.tick);

/** Pauses the battle and steps it `ticks` ticks, waiting for the worker. */
async function stepAndWait(page: Page, ticks: number): Promise<void> {
  const before = await tick(page);
  await page.evaluate((count) => (window as unknown as Bridge).__prestes!.step(count), ticks);
  await expect.poll(() => tick(page), { timeout: 60_000 }).toBeGreaterThanOrEqual(before + ticks);
}

test('the menu lists the four battlefields, Vila Militar first and chosen', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('menu-mark-skirmish').click();
  for (const map of ['vila-militar', 'fazenda', 'serra-rio', 'bairro']) {
    await expect(page.getByTestId(`map-option-${map}`)).toBeVisible();
  }
  await expect(page.getByTestId('map-option-vila-militar')).toHaveAttribute('aria-checked', 'true');
});

for (const map of ['fazenda', 'serra-rio', 'bairro']) {
  test(`the 3 vs 3 starts on ${map} with 66 soldiers`, async ({ page }) => {
    await startOn(page, map);
    const start = await frame(page);
    expect(start.units.filter((unit) => unit.faction === 'column')).toHaveLength(33);
    expect(Boolean(start.ferries?.length)).toBe(map === 'serra-rio');
  });
}

test('a section crosses Serra e Rio by the ferry', async ({ page }) => {
  await startOn(page, 'serra-rio');
  const section = (await frame(page)).units.filter((unit) => unit.squadId === 3).map((unit) => unit.id);
  await page.evaluate((ids) => (window as unknown as Bridge).__prestes!.command({ type: 'move', unitIds: ids, to: { x: 130, y: 40 } }), section);
  await stepAndWait(page, 900);
  await page.evaluate((ids) => (window as unknown as Bridge).__prestes!.command({ type: 'move', unitIds: ids, to: { x: 130, y: -40 } }), section);
  await stepAndWait(page, 1400);
  const end = await frame(page);
  const crossed = end.units.filter((unit) => section.includes(unit.id) && unit.alive && unit.y < -12);
  expect(crossed.length).toBeGreaterThan(0);
  // By the ferry, not round by the bridge 110 m west.
  for (const unit of crossed) expect(Math.abs(unit.x - 130)).toBeLessThan(30);
});

test('a crouched section in the Fazenda canefield is concealed, and the HUD says so', async ({ page }) => {
  await startOn(page, 'fazenda');
  const section = (await frame(page)).units.filter((unit) => unit.squadId === 1).map((unit) => unit.id);
  await page.evaluate((ids) => {
    const bridge = (window as unknown as Bridge).__prestes!;
    bridge.command({ type: 'stance', unitIds: ids, stance: 'crouched' });
    bridge.command({ type: 'move', unitIds: ids, to: { x: -88, y: 20 } });
  }, section);
  await stepAndWait(page, 900);
  const end = await frame(page);
  expect(end.units.filter((unit) => section.includes(unit.id) && unit.concealed).length).toBeGreaterThan(5);
  await expect(page.getByTestId('concealed-value')).toBeVisible();
});
