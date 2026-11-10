import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { compileMapDocument, parseMapDocument, positionsFor, type Command, type Frame, type PositionDef, type Vec2 } from '@prestes/shared';

// garrison-and-assault 4.1: Ocupar a house by clicking it, Sair to a clicked point inside the 30 m ring;
// 4.2: the door arrows while walking in and the banner with the men inside.

interface Bridge {
  __prestes?: { command: (command: Command) => void; step: (ticks: number) => void; frame: () => Frame | null };
  __prestesScene?: {
    groundToScreen: (x: number, y: number) => { x: number; y: number } | null;
    focusOn: (x: number, y: number) => void;
    rangeRing: () => { x: number; y: number; radius: number } | null;
    garrisonMarks: () => { banners: { positionId: number; side: string; text: string }[]; arrows: number; assaults: { positionId: number }[] };
  };
}

const frame = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!);
const command = (page: Page, sent: Command) => page.evaluate((c) => (window as unknown as Bridge).__prestes!.command(c), sent);
const step = (page: Page, ticks: number) => page.evaluate((n) => (window as unknown as Bridge).__prestes!.step(n), ticks);

/** Clicks the canvas at a ground point, after centring the camera on it. */
async function clickGround(page: Page, point: Vec2): Promise<void> {
  await page.evaluate(({ x, y }) => (window as unknown as Bridge).__prestesScene!.focusOn(x, y), point);
  await page.waitForTimeout(300);
  const screen = await page.evaluate(({ x, y }) => (window as unknown as Bridge).__prestesScene!.groundToScreen(x, y), point);
  expect(screen).not.toBeNull();
  await page.mouse.click(screen!.x, screen!.y);
}

/** The test map, compiled here (Playwright's Node cannot import the JSON the game's loader imports). */
function testMap() {
  const parsed = parseMapDocument(JSON.parse(readFileSync('packages/shared/src/maps/authored/campo-de-provas.map.json', 'utf8')) as unknown);
  if (!parsed.ok) throw new Error('test map');
  return compileMapDocument(parsed.document);
}

async function startTestMap(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 })));
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('start-battle-3v3').click();
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => (window as unknown as Bridge).__prestes?.frame()?.phase !== 'deployment');
}

test('Ocupar a house by clicking it, then Sair to a point inside the 30 m ring', async ({ page }) => {
  await startTestMap(page);
  // Nobody fires: the test is about going in and out.
  const all = (await frame(page)).units.map((unit) => unit.id);
  await command(page, { type: 'hold_fire', unitIds: all, hold: true });
  await page.getByTestId('squad-1').click();
  const start = await frame(page);
  const squad = start.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1);
  const centre = { x: squad.reduce((s, u) => s + u.x, 0) / squad.length, y: squad.reduce((s, u) => s + u.y, 0) / squad.length };
  const map = testMap();
  const positions = positionsFor({ buildings: map.buildings, covers: start.covers, garrisonYards: map.garrisonYards });
  const house: PositionDef = positions
    .filter((position) => position.kind === 'building' && position.capacity === 4)
    .reduce((best, position) => ((position.x - centre.x) ** 2 + (position.y - centre.y) ** 2 < (best.x - centre.x) ** 2 + (best.y - centre.y) ** 2 ? position : best));

  await page.getByTestId('order-enter').click();
  await clickGround(page, { x: house.x, y: house.y });
  // 4.2: while the selected section walks in, arrows mark the house's doors.
  await step(page, 20);
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestesScene!.garrisonMarks().arrows)).toBe(house.entrances.length);
  await step(page, 900);
  await expect.poll(async () => (await frame(page)).garrisons?.find((entry) => entry.positionId === house.id)?.unitIds.length ?? 0).toBe(4);
  // 4.2: the house's banner reads the men inside; the arrows are gone.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestesScene!.garrisonMarks()))
    .toMatchObject({ banners: expect.arrayContaining([{ positionId: house.id, side: 'column', text: '4' }]), arrows: 0 });
  // 4.4: the section card says where the men are; their helmets in the troop summary are marked.
  await expect(page.getByTestId('squad-inside-1')).toHaveText(/^Inside: \S/);
  const inside = (await frame(page)).garrisons!.find((entry) => entry.positionId === house.id)!.unitIds[0]!;
  await expect(page.getByTestId(`helmet-${inside}`)).toHaveAttribute('data-inside', /\S/);

  // Sair: the ring shows around the house; a click 10 m out of its door takes the men out.
  await page.getByTestId('order-exit').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestesScene!.rangeRing())).toMatchObject({ radius: 30 });
  const door = house.entrances[0]!;
  const out = { x: door.x - house.x, y: door.y - house.y };
  const length = Math.sqrt(out.x ** 2 + out.y ** 2);
  await clickGround(page, { x: door.x + (out.x / length) * 10, y: door.y + (out.y / length) * 10 });
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestesScene!.rangeRing())).toBeNull();
  await step(page, 200);
  await expect.poll(async () => (await frame(page)).garrisons?.find((entry) => entry.positionId === house.id)?.unitIds.length ?? 0).toBe(0);
  await expect(page.getByTestId('squad-inside-1')).toHaveCount(0);
});

test('Ocupar, Sair and Assaltar speak Portuguese', async ({ page }) => {
  await startTestMap(page);
  await page.getByTestId('hud-language-select').selectOption('pt-BR');
  await page.getByTestId('squad-1').click();
  await expect(page.getByTestId('order-enter')).toHaveAttribute('aria-label', 'Ocupar');
  await expect(page.getByTestId('order-exit')).toHaveAttribute('aria-label', 'Sair');
  await expect(page.getByTestId('order-assault')).toHaveAttribute('aria-label', 'Assaltar');
});

// 4.3: an assault through the bridge shows its two bars over the position, then they go.
// The column holds a house; a legalist section is walked to its door and assaults it.
test('assault bars over the position for the fight, then gone', async ({ page }) => {
  test.setTimeout(300_000);
  await startTestMap(page);
  const start = await frame(page);
  await command(page, { type: 'hold_fire', unitIds: start.units.map((unit) => unit.id), hold: true });
  const squad = start.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1);
  const centre = { x: squad.reduce((s, u) => s + u.x, 0) / squad.length, y: squad.reduce((s, u) => s + u.y, 0) / squad.length };
  const map = testMap();
  const positions = positionsFor({ buildings: map.buildings, covers: start.covers, garrisonYards: map.garrisonYards });
  const house: PositionDef = positions
    .filter((position) => position.kind === 'building' && position.capacity === 4)
    .reduce((best, position) => ((position.x - centre.x) ** 2 + (position.y - centre.y) ** 2 < (best.x - centre.x) ** 2 + (best.y - centre.y) ** 2 ? position : best));
  await command(page, { type: 'order', order: 'enter', unitIds: squad.map((unit) => unit.id), positionId: house.id });
  await expect
    .poll(async () => {
      await step(page, 100);
      return (await frame(page)).garrisons?.find((entry) => entry.positionId === house.id)?.unitIds.length ?? 0;
    }, { timeout: 30_000 })
    .toBe(4);
  // The legalist section nearest the house (the bridge reads the unfogged frame).
  const now = await frame(page);
  const legalists = now.units.filter((unit) => unit.faction === 'legalist' && unit.alive && unit.garrison === undefined);
  const nearest = legalists.reduce((best, unit) => ((unit.x - house.x) ** 2 + (unit.y - house.y) ** 2 < (best.x - house.x) ** 2 + (best.y - house.y) ** 2 ? unit : best));
  const attackers = legalists.filter((unit) => unit.squadId === nearest.squadId).map((unit) => unit.id);
  const door = house.entrances[0]!;
  await expect
    .poll(async () => {
      await command(page, { type: 'move', unitIds: attackers, to: door });
      await step(page, 200);
      const men = (await frame(page)).units.filter((unit) => attackers.includes(unit.id) && unit.alive);
      return men.filter((unit) => (unit.x - door.x) ** 2 + (unit.y - door.y) ** 2 < 12 * 12).length;
    }, { timeout: 180_000 })
    .toBeGreaterThan(1);
  await command(page, { type: 'assault', unitIds: attackers, positionId: house.id });
  const bars = () => page.evaluate(() => (window as unknown as Bridge).__prestesScene!.garrisonMarks().assaults);
  await expect
    .poll(async () => {
      await step(page, 10);
      return (await bars()).some((entry) => entry.positionId === house.id);
    }, { timeout: 30_000 })
    .toBe(true);
  await expect
    .poll(async () => {
      await step(page, 100);
      return (await bars()).length;
    }, { timeout: 60_000 })
    .toBe(0);
});
