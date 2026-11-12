import { expect, test, type Page } from '@playwright/test';

// scrub-concealment-and-area-fire 3.2 / 3.4: Area fire is armed on the board and
// laid on a "?" marker by clicking it on the field.
interface Bridge {
  __prestes?: {
    command: (command: unknown) => void;
    step: (ticks: number) => void;
    frame: () => {
      tick: number;
      events: Array<{ type: string; side?: string; x?: number; y?: number; radius?: number; area?: boolean; source?: number }>;
      units: Array<{ id: number; faction: string; squadId: number; alive: boolean; x: number; y: number; areaFire?: { x: number; y: number; radius: number } }>;
      seen?: { column: number[] };
      phase?: string;
    } | null;
  };
  __prestesScene?: {
    groundToScreen: (x: number, y: number) => { x: number; y: number };
    focusOn: (x: number, y: number) => void;
  };
}

async function startBattle(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 })));
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.getByTestId('start-battle')).toBeVisible();
  // No tick passes in deployment: pause there, so the battle always starts
  // from its first tick however long the page took to get here.
  await page.evaluate(() => (window as unknown as Bridge).__prestes!.step(0));
  await page.getByTestId('start-battle').click();
  await page.evaluate(() => (window as unknown as Bridge).__prestes!.step(1));
  await expect
    .poll(() =>
      page.evaluate(() => {
        const frame = (window as unknown as Bridge).__prestes!.frame();
        return frame?.phase !== 'deployment' && frame?.units.length === 66 ? frame.tick : -1;
      }),
    )
    .toBeGreaterThan(-1);
}

test('Area fire: armed on the board, laid on a "?" and fired into', async ({ page }) => {
  test.setTimeout(360_000);
  await startBattle(page);
  // The three sections walk up until an unseen enemy fires within a section's
  // rifle reach and leaves a "?" (out of reach the men hold their fire).
  await page.evaluate(() => {
    const bridge = (window as unknown as Bridge).__prestes!;
    for (const [squad, x] of [[1, -40], [2, 0], [3, 40]] as const) {
      const ids = bridge.frame()!.units.filter((unit) => unit.faction === 'column' && unit.squadId === squad && unit.alive).map((unit) => unit.id);
      bridge.command({ type: 'move', unitIds: ids, to: { x, y: -20 } });
    }
  });
  const found = await page.evaluate(async () => {
    const bridge = (window as unknown as Bridge).__prestes!;
    for (let index = 0; index < 4000; index += 1) {
      bridge.step(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const frame = bridge.frame();
      if (!frame) return null;
      for (const event of frame.events) {
        if (event.type !== 'unseen_fire' || event.side !== 'legalist') continue;
        for (const squad of [1, 2, 3]) {
          const inReach = frame.units.filter(
            (unit) =>
              unit.faction === 'column' && unit.squadId === squad && unit.alive && Math.hypot(event.x! - unit.x, event.y! - unit.y) < 105,
          );
          if (inReach.length >= 2) return { squad, marker: { x: event.x!, y: event.y!, radius: event.radius! } };
        }
      }
    }
    return null;
  });
  expect(found).not.toBeNull();
  const { squad, marker } = found!;
  await page.getByTestId(`squad-${squad}`).click();

  const button = page.getByTestId('order-area-fire');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText('Escolha um contato suspeito (?)').or(page.getByText('Pick a suspected contact (?)')).first()).toBeVisible();

  // Click the "?" on the field.
  await page.evaluate(({ x, y }) => (window as unknown as Bridge).__prestesScene!.focusOn(x, y), marker!);
  await page.waitForTimeout(800);
  const point = await page.evaluate(({ x, y }) => (window as unknown as Bridge).__prestesScene!.groundToScreen(x, y), marker!);
  await page.mouse.click(point.x, point.y);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const bridge = (window as unknown as Bridge).__prestes!;
        bridge.step(1);
        return bridge.frame()!.units.filter((unit) => unit.faction === 'column' && unit.areaFire).length;
      }),
    )
    .toBeGreaterThan(0);
  const disc = await page.evaluate(
    () => (window as unknown as Bridge).__prestes!.frame()!.units.find((unit) => unit.areaFire)!.areaFire!,
  );
  expect(Math.hypot(disc.x - marker!.x, disc.y - marker!.y)).toBeLessThan(0.01);

  // The section fires area rounds (each frame read before the next tick, so no event is missed).
  const rounds = await page.evaluate(async () => {
    const bridge = (window as unknown as Bridge).__prestes!;
    let count = 0;
    for (let index = 0; index < 300 && count === 0; index += 1) {
      const before = bridge.frame()!.tick;
      bridge.step(1);
      for (let wait = 0; wait < 100 && bridge.frame()!.tick <= before; wait += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      count += bridge.frame()!.events.filter((event) => event.type === 'shot' && event.area).length;
    }
    return count;
  });
  expect(rounds).toBeGreaterThan(0);
  await page.screenshot({ path: test.info().outputPath('area-fire.png') });
});
