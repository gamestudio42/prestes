import { expect, test, type Page } from '@playwright/test';

// fog-of-war: the player sees only what his side sees.

interface Unit {
  id: number;
  x: number;
  y: number;
  faction: string;
}
interface Bridge {
  __prestes?: { frame: () => { units: Unit[]; fog?: boolean } | null };
  __prestesScene?: {
    shown: () => number[];
    pick: (x: number, y: number) => number | null;
    focusOn: (x: number, y: number) => void;
    setBand: (band: 'tactical' | 'strategic') => void;
  };
}

async function start3v3(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0))
    .toBe(66);
}

const legalists = (page: Page) =>
  page.evaluate(() => {
    const bridge = window as unknown as Bridge;
    const shown = new Set(bridge.__prestesScene!.shown());
    const enemies = bridge.__prestes!.frame()!.units.filter((unit) => unit.faction === 'legalist');
    return { total: enemies.length, shown: enemies.filter((unit) => shown.has(unit.id)).length, first: enemies[0]! };
  });

test('the 3 vs 3 starts under fog: no enemy drawn or pickable', async ({ page }) => {
  await start3v3(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestesScene!.shown().length)).toBeGreaterThan(0);
  const start = await legalists(page);
  expect(start.total).toBe(33);
  expect(start.shown).toBe(0);
  // A click on an unseen enemy picks no one, so he cannot be targeted.
  const picked = await page.evaluate(({ x, y }) => {
    const scene = (window as unknown as Bridge).__prestesScene!;
    scene.focusOn(x, y);
    return new Promise<number | null>((resolve) => setTimeout(() => resolve(scene.pick(x, y)), 400));
  }, start.first);
  expect(picked).toBeNull();
});

test('the sandbox toggle lifts the fog', async ({ page }) => {
  await start3v3(page);
  await page.getByTestId('sandbox-toggle').click();
  await expect(page.getByTestId('sandbox-fog')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('sandbox-fog').click();
  await expect(page.getByTestId('sandbox-fog')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await legalists(page)).shown).toBe(33);
});
