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
  revealed?: boolean;
  aboardFerry?: boolean;
  waitingFerry?: boolean;
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

/** The desk's map fan shows one sheet on top; clicking it brings the next. */
async function chooseMap(page: Page, map: string): Promise<void> {
  const active = page.locator('[role="radio"][aria-checked="true"]');
  for (let i = 0; i < 4 && (await active.getAttribute('data-testid')) !== `map-option-${map}`; i++) {
    await active.click();
  }
  await expect(page.getByTestId(`map-option-${map}`)).toHaveAttribute('aria-checked', 'true');
}

async function startOn(page: Page, map: string): Promise<void> {
  await page.goto('/');
  await chooseMap(page, map);
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
  for (const map of ['vila-militar', 'fazenda', 'serra-rio', 'bairro']) {
    await expect(page.getByTestId(`map-option-${map}`)).toBeAttached();
  }
  await expect(page.getByTestId('map-option-vila-militar')).toHaveAttribute('aria-checked', 'true');
});

// refine-battle-maps 6.3: each map on the skirmish page has its rendered preview.
test('the skirmish page shows a preview of each map', async ({ page }) => {
  await page.goto('/');
  for (const map of ['vila-militar', 'fazenda', 'serra-rio', 'bairro']) {
    const preview = page.getByTestId(`map-preview-${map}`);
    await expect(preview).toBeAttached();
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBeGreaterThan(0);
  }
  // The active sheet shows its own.
  await expect(page.getByTestId('map-preview-vila-militar')).toBeVisible();
});

for (const map of ['fazenda', 'serra-rio', 'bairro']) {
  test(`the 3 vs 3 starts on ${map} with 66 soldiers`, async ({ page }) => {
    await startOn(page, map);
    const start = await frame(page);
    expect(start.units.filter((unit) => unit.faction === 'column')).toHaveLength(33);
    expect(Boolean(start.ferries?.length)).toBe(map === 'serra-rio');
  });
}

test('a section crosses Serra e Rio by the ferry, and the HUD shows it at the ferry', async ({ page }) => {
  await startOn(page, 'serra-rio');
  await page.getByTestId('squad-3').click();
  await expect(page.getByTestId('squad-3')).toHaveAttribute('aria-pressed', 'true');
  const section = (await frame(page)).units.filter((unit) => unit.squadId === 3).map((unit) => unit.id);
  await page.evaluate((ids) => (window as unknown as Bridge).__prestes!.command({ type: 'move', unitIds: ids, to: { x: 130, y: 40 } }), section);
  await stepAndWait(page, 900);
  await expect(page.getByTestId('ferry-value')).toHaveCount(0);
  await page.evaluate((ids) => (window as unknown as Bridge).__prestes!.command({ type: 'move', unitIds: ids, to: { x: 130, y: -40 } }), section);
  // refine-battle-maps 5.4: while men wait at the landing or ride the raft,
  // the HUD says how many, and the counts match the simulation.
  let seen = false;
  for (let stepped = 0; stepped < 1400; stepped += 50) {
    await stepAndWait(page, 50);
    const units = (await frame(page)).units.filter((unit) => section.includes(unit.id) && unit.alive);
    const waiting = units.filter((unit) => unit.waitingFerry).length;
    const aboard = units.filter((unit) => unit.aboardFerry).length;
    if (!seen && waiting + aboard > 0) {
      const hud = page.getByTestId('ferry-value');
      await expect(hud).toBeVisible();
      await expect(hud).toHaveAttribute('data-waiting', String(waiting));
      await expect(hud).toHaveAttribute('data-aboard', String(aboard));
      await expect(hud).toContainText(/Balsa|Ferry/);
      seen = true;
    }
  }
  expect(seen).toBe(true);
  const end = await frame(page);
  const crossed = end.units.filter((unit) => section.includes(unit.id) && unit.alive && unit.y < -12);
  expect(crossed.length).toBeGreaterThan(0);
  // By the ferry, not round by the bridge 110 m west (a man who crossed may
  // since have run some way along the far bank under fire).
  for (const unit of crossed) expect(Math.abs(unit.x - 130)).toBeLessThan(60);
});

interface SceneBridge {
  __prestesScene?: { view: () => { x: number; y: number; span: number }; deploymentMarks: () => boolean };
}

const view = (page: Page) => page.evaluate(() => (window as unknown as SceneBridge).__prestesScene!.view());

// refine-battle-maps 6.1: a battle opens close in on the first section; Home frames the map.
test('camera on the sections', async ({ page }) => {
  await startOn(page, 'fazenda');
  const units = (await frame(page)).units.filter((unit) => unit.squadId === 1);
  const x = units.reduce((sum, unit) => sum + unit.x, 0) / units.length;
  const y = units.reduce((sum, unit) => sum + unit.y, 0) / units.length;
  const start = await view(page);
  expect(start.span).toBeLessThanOrEqual(80);
  expect(Math.hypot(start.x - x, start.y - y)).toBeLessThan(15);
});

// refine-battle-maps 6.2: the two deployment zones are marked for the first 10 s, then fade.
test('deployment marks show, then fade', async ({ page }) => {
  await startOn(page, 'fazenda');
  await expect(page.getByTestId('deployment-label-own')).toBeVisible();
  await expect(page.getByTestId('deployment-label-own')).toHaveText(/Sua tropa|Your troops/);
  // The enemy's side may be off screen at tactical zoom; its label is there.
  await expect(page.getByTestId('deployment-label-enemy')).toHaveText(/Inimigo|Enemy/);
  expect(await page.evaluate(() => (window as unknown as SceneBridge).__prestesScene!.deploymentMarks())).toBe(true);
  await expect(page.getByTestId('deployment-label-own')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByTestId('deployment-label-enemy')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as SceneBridge).__prestesScene!.deploymentMarks())).toBe(false);
});

test('frame the map', async ({ page }) => {
  await startOn(page, 'serra-rio');
  await page.keyboard.press('Home');
  await expect.poll(async () => (await view(page)).span, { timeout: 10_000 }).toBeGreaterThan(380);
  const framed = await view(page);
  expect(Math.abs(framed.x)).toBeLessThan(1);
  expect(Math.abs(framed.y)).toBeLessThan(1);
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

// refine-battle-maps 5.14: a close shot from the capim gives the shooter away.
test('a section firing from the capim at close range is marked "Revelado"', async ({ page }) => {
  await startOn(page, 'serra-rio');
  const section = (await frame(page)).units.filter((unit) => unit.squadId === 1).map((unit) => unit.id);
  const send = (command: unknown) => page.evaluate((c) => (window as unknown as Bridge).__prestes!.command(c), command);
  // Down to the capim on the column's bank, then flat in it.
  await send({ type: 'stance', unitIds: section, stance: 'crouched' });
  await send({ type: 'move', unitIds: section, to: { x: -44, y: 24 } });
  await stepAndWait(page, 1100);
  await send({ type: 'stance', unitIds: section, stance: 'prone' });
  await stepAndWait(page, 30);
  // Three legalists, holding their fire, in the open 36 m behind them.
  await send({ type: 'spawn_troop', faction: 'legalist', to: { x: -44, y: 60 }, count: 3, holdFire: true });
  let revealed = 0;
  for (let step = 0; step < 40 && revealed === 0; step += 1) {
    await stepAndWait(page, 10);
    revealed = (await frame(page)).units.filter((unit) => section.includes(unit.id) && unit.revealed).length;
  }
  expect(revealed).toBeGreaterThan(0);
  await expect(page.getByTestId('revealed-value')).toBeVisible();
  await expect(page.getByTestId('revealed-value')).toContainText(/Revelado|Revealed/);
});
