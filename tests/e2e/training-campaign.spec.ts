import { expect, test, type Page } from '@playwright/test';
import type { Command, Frame } from '@prestes/shared';

declare global {
  interface Window {
    __prestes?: {
      command: (command: Command) => void;
      step: (ticks: number) => void;
      frame: () => Frame | null;
    };
  }
}

test.use({ video: { mode: 'on', size: { width: 1440, height: 900 } } });
test.setTimeout(240_000);

const STATIONS = ['formation', 'fire', 'maneuver', 'defense', 'recon', 'wounded', 'final'];
const PROGRESS_KEY = 'prestes.bootcamp.stations.v2';

async function currentFrame(page: Page): Promise<Frame> {
  const frame = await page.evaluate(() => window.__prestes?.frame() ?? null);
  if (!frame) {
    throw new Error('simulation frame is unavailable');
  }
  return frame;
}

// Steps the paused simulation and waits until React rendered the new tick, so
// the exercise director has evaluated the frame before the next step.
async function stepRendered(page: Page, ticks: number): Promise<void> {
  const target = (await currentFrame(page)).tick + ticks;
  await page.evaluate((count) => window.__prestes!.step(count), ticks);
  await page.waitForFunction(
    (tick) => Number(document.querySelector('[data-testid="app"]')?.getAttribute('data-tick')) >= tick,
    target,
  );
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))),
  );
}

const objectiveDone = (page: Page, id: string) =>
  page.evaluate(
    (objective) =>
      document.querySelector(`[data-testid="training-objective-${objective}"]`)?.getAttribute('data-done') === 'true',
    id,
  );

const phaseIs = (page: Page, station: string) =>
  page.evaluate(
    (id) => document.querySelector('[data-testid="training-panel"]')?.getAttribute('data-phase') === id,
    station,
  );

/** Steps in chunks until the objective row is done (or the station moved on). */
async function until(
  page: Page,
  done: () => Promise<boolean>,
  { maxTicks, chunk = 20, label }: { maxTicks: number; chunk?: number; label: string },
): Promise<void> {
  for (let stepped = 0; stepped <= maxTicks; stepped += chunk) {
    if (await done()) {
      return;
    }
    await stepRendered(page, chunk);
  }
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="training-objective-"]')]
      .map((row) => `${row.getAttribute('data-testid')?.replace('training-objective-', '')}=${row.textContent?.replace(/\s+/g, ' ').trim()}${row.getAttribute('data-done') === 'true' ? ' (done)' : ''}`)
      .join(' | '),
  );
  throw new Error(`not done within ${maxTicks} ticks: ${label}. Objectives: ${rows}`);
}

const untilObjective = (page: Page, id: string, maxTicks: number, chunk = 20) =>
  until(page, () => objectiveDone(page, id), { maxTicks, chunk, label: id });

async function untilStation(page: Page, station: string, maxTicks = 200): Promise<void> {
  await until(page, () => phaseIs(page, station), { maxTicks, chunk: 10, label: `station ${station}` });
  // The station setup (troop, training enemies) lands on the following tick.
  await stepRendered(page, 2);
}

async function command(page: Page, value: Command): Promise<void> {
  await page.evaluate((next) => window.__prestes!.command(next), value);
}

async function section(page: Page): Promise<number[]> {
  return (await currentFrame(page)).units
    .filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive && !unit.incapacitated)
    .map((unit) => unit.id);
}

async function trainingEnemies(page: Page): Promise<number[]> {
  return (await currentFrame(page)).units
    .filter((unit) => unit.role === 'training-enemy' && unit.alive && !unit.incapacitated)
    .map((unit) => unit.id);
}

/** Like the HUD: a fire order on a troop is spread over its members. */
async function suppressTroop(page: Page): Promise<void> {
  const ids = await section(page);
  const enemies = await trainingEnemies(page);
  ids.forEach((id, index) => {
    void command(page, { type: 'suppress', unitIds: [id], targetId: enemies[index % enemies.length]! });
  });
  await stepRendered(page, 1);
}

async function startStation(page: Page, index: number): Promise<void> {
  await page.goto('/');
  if (index > 0) {
    await page.evaluate(
      ({ key, phaseIndex, done }) =>
        window.localStorage.setItem(
          key,
          JSON.stringify({ phaseIndex, completedPhases: done, completed: false, bestTimeTicks: 0 }),
        ),
      { key: PROGRESS_KEY, phaseIndex: index, done: STATIONS.slice(0, index) },
    );
    await page.reload();
    await page.getByTestId('start-continue').click();
  } else {
    await page.getByTestId('start-button').click();
  }
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', STATIONS[index]!);
  await stepRendered(page, 2);
}

async function playFormation(page: Page): Promise<void> {
  await page.getByTestId('squad-1').click();
  await untilObjective(page, 'formation-select', 20, 1);
  const canvas = page.getByTestId('game-canvas');
  const box = (await canvas.boundingBox())!;
  // Leftward drag over open field (clear of the top rail and the panels).
  await page.mouse.move(box.x + 1060, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 640, { steps: 8 });
  await page.mouse.up();
  await untilObjective(page, 'formation-box', 20, 1);
  await canvas.hover();
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyQ');
  await untilObjective(page, 'formation-camera', 20, 1);
  const ids = await section(page);
  await command(page, { type: 'formation', unitIds: ids, formation: 'wedge' });
  await untilObjective(page, 'formation-wedge', 40, 2);
  for (const [stance, id] of [['prone', 'formation-prone'], ['crouched', 'formation-crouch'], ['standing', 'formation-stand']] as const) {
    await command(page, { type: 'stance', unitIds: ids, stance });
    await untilObjective(page, id, 40, 2);
  }
  await command(page, { type: 'move', unitIds: ids, to: { x: 28, y: 4 } });
  await untilStation(page, 'fire', 1200);
}

async function playFire(page: Page): Promise<void> {
  const ids = await section(page);
  const [target] = await trainingEnemies(page);
  await command(page, { type: 'attack', unitIds: ids, targetId: target! });
  await untilObjective(page, 'fire-attack', 1500);
  await command(page, { type: 'posture', unitIds: ids, posture: 'aggressive' });
  await untilObjective(page, 'fire-aggressive', 40, 2);
  await suppressTroop(page);
  await untilObjective(page, 'fire-suppress', 1500);
  await command(page, { type: 'hold_fire', unitIds: ids, hold: true });
  await untilObjective(page, 'fire-holdfire', 200);
  await command(page, { type: 'face', unitIds: ids, to: { x: 28, y: 34 } });
  await untilStation(page, 'maneuver', 300);
}

async function playManeuver(page: Page): Promise<void> {
  const ids = await section(page);
  const [target] = await trainingEnemies(page);
  await command(page, { type: 'flank', unitIds: ids, targetId: target! });
  await untilObjective(page, 'maneuver-flank', 2000);
  await command(page, { type: 'set_bounding', enabled: true });
  await command(page, { type: 'move', unitIds: await section(page), to: { x: 40, y: -4 } });
  await untilObjective(page, 'maneuver-bound', 2000);
  await command(page, { type: 'withdraw', unitIds: await section(page) });
  await untilObjective(page, 'maneuver-withdraw', 1000);
  // The Hold button itself: a finished withdrawal also leaves soldiers holding.
  await page.getByTestId('order-tab-movement').locator('[data-testid="order-hold"]').click();
  await untilStation(page, 'defense', 300);
}

async function playDefense(page: Page): Promise<void> {
  const ids = await section(page);
  await command(page, { type: 'posture', unitIds: ids, posture: 'defensive' });
  await untilObjective(page, 'defense-defensive', 40, 2);
  await command(page, { type: 'order', order: 'defend', unitIds: ids, to: { x: 52, y: -18 } });
  await untilObjective(page, 'defense-defend', 1500);
  await command(page, { type: 'order', order: 'ambush', unitIds: await section(page), to: { x: 52, y: -18 } });
  await untilObjective(page, 'defense-ambush', 2000);
  await untilStation(page, 'recon', 1200);
}

async function playRecon(page: Page): Promise<void> {
  const ids = await section(page);
  await command(page, { type: 'order', order: 'recon', unitIds: ids.slice(0, 2), to: { x: 42, y: -10 } });
  await untilObjective(page, 'recon-recon', 1500);
  const [target] = await trainingEnemies(page);
  await command(page, { type: 'order', order: 'pursue', unitIds: ids.slice(0, 4), targetId: target! });
  await untilObjective(page, 'recon-pursue', 1500);
  const all = await section(page);
  const here = (await currentFrame(page)).units.find((unit) => unit.id === all[0])!;
  await command(page, { type: 'order', order: 'disperse', unitIds: all, to: { x: here.x, y: here.y } });
  await untilObjective(page, 'recon-disperse', 200);
  await command(page, { type: 'order', order: 'reserve', unitIds: all.slice(0, 3), to: { x: 28, y: 4 } });
  await untilObjective(page, 'recon-reserve', 200);
  await command(page, { type: 'order', order: 'advance', unitIds: all.slice(3), to: { x: 40, y: -4 } });
  await untilObjective(page, 'recon-advance', 200);
  await command(page, { type: 'order', order: 'regroup', unitIds: await section(page) });
  await untilStation(page, 'wounded', 1500);
}

async function playWounded(page: Page): Promise<void> {
  const frame = await currentFrame(page);
  const casualty = frame.units.find((unit) => unit.squadId === 1 && unit.incapacitated)!;
  const rescuer = (await section(page))[0]!;
  await command(page, { type: 'order', order: 'rescue', unitIds: [rescuer], targetId: casualty.id });
  await untilObjective(page, 'wounded-rescue', 2500);
  await command(page, { type: 'order', order: 'protect-officer', unitIds: await section(page) });
  await untilObjective(page, 'wounded-protect', 1000);
  await command(page, { type: 'hold', unitIds: await section(page) });
  await untilStation(page, 'final', 600);
}

async function playFinal(page: Page): Promise<void> {
  await suppressTroop(page);
  await untilObjective(page, 'final-suppress', 1500);
  await command(page, { type: 'move', unitIds: await section(page), to: { x: 52, y: -18 } });
  await stepRendered(page, 600);
  // Training targets are only engaged on order: clear whoever is left in the trench.
  for (let attempt = 0; attempt < 6 && !(await objectiveDone(page, 'final-secure')); attempt += 1) {
    const [remaining] = await trainingEnemies(page);
    if (remaining !== undefined) {
      await command(page, { type: 'attack', unitIds: await section(page), targetId: remaining });
    }
    await stepRendered(page, 300);
  }
  await untilObjective(page, 'final-secure', 600);
  await command(page, { type: 'order', order: 'defend', unitIds: await section(page), to: { x: 52, y: -18 } });
  await until(page, async () => page.getByTestId('training-complete').isVisible(), {
    maxTicks: 900,
    chunk: 30,
    label: 'debrief',
  });
}

const PLAY = [playFormation, playFire, playManeuver, playDefense, playRecon, playWounded, playFinal];

STATIONS.forEach((station, index) => {
  test(`station ${index + 1} (${station}) is completed by its mechanics`, async ({ page }) => {
    await startStation(page, index);
    await expect(page.getByTestId('training-dialogue')).toContainText(/Instructor|Instrutor/);
    await PLAY[index]!(page);
    if (index === STATIONS.length - 1) {
      await expect(page.getByTestId('debrief-stations')).toContainText('7/7');
    }
  });
});

test('an order button alone does not complete a mechanic objective', async ({ page }) => {
  await startStation(page, 2);
  const [target] = await trainingEnemies(page);
  // A flank order given and cancelled at once never puts flankers on the side.
  await command(page, { type: 'flank', unitIds: await section(page), targetId: target! });
  await stepRendered(page, 2);
  await command(page, { type: 'hold', unitIds: await section(page) });
  await stepRendered(page, 200);
  expect(await objectiveDone(page, 'maneuver-flank')).toBe(false);
});

test('fails the wounded station when cohesion collapses and retries it', async ({ page }) => {
  await startStation(page, 5);
  // Skip to the cohesion objective by scattering the section after the
  // instructor falls: rescue and guard first, then spread out.
  await playWoundedUntilCohesion(page);
  const ids = await section(page);
  ids.forEach((id, index) => void command(page, { type: 'move', unitIds: [id], to: { x: -60 + index * 12, y: index % 2 === 0 ? 40 : -40 } }));
  await until(page, async () => page.getByTestId('training-failure').isVisible(), {
    maxTicks: 1500,
    chunk: 20,
    label: 'cohesion failure',
  });
  await expect(page.getByTestId('training-failure')).toContainText(/cohesion|coesão/i);
  await page.getByTestId('training-retry').click();
  await expect(page.getByTestId('training-failure')).toHaveCount(0);
  await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', 'wounded');
  await stepRendered(page, 2);
  expect((await currentFrame(page)).units.filter((unit) => unit.squadId === 1 && unit.incapacitated)).toHaveLength(1);
});

async function playWoundedUntilCohesion(page: Page): Promise<void> {
  const frame = await currentFrame(page);
  const casualty = frame.units.find((unit) => unit.squadId === 1 && unit.incapacitated)!;
  await command(page, { type: 'order', order: 'rescue', unitIds: [(await section(page))[0]!], targetId: casualty.id });
  await untilObjective(page, 'wounded-rescue', 2500);
  await command(page, { type: 'order', order: 'protect-officer', unitIds: await section(page) });
  await untilObjective(page, 'wounded-protect', 1000);
}

test('plays every station in order, resumes after a reload and reaches the debrief', async ({ page }) => {
  test.setTimeout(900_000);
  await startStation(page, 0);
  for (const [index, play] of PLAY.entries()) {
    if (index === 3) {
      await page.reload();
      await expect(page.getByTestId('start-continue')).toContainText('4/7');
      await page.getByTestId('start-continue').click();
      await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
      await stepRendered(page, 2);
    }
    await expect(page.getByTestId('training-panel')).toHaveAttribute('data-phase', STATIONS[index]!);
    await play(page);
  }
  await expect(page.getByTestId('debrief-stations')).toContainText('7/7');
});

test('shows a sandbox preview for every placement and inserts an enemy troop with rotation', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await page.keyboard.press('F1');
  await expect(page.getByTestId('sandbox-panel')).toBeVisible();

  for (const tool of ['sandbag', 'stone', 'trench', 'dummy', 'enemy-troop', 'command-troop']) {
    await page.getByTestId(`sandbox-tool-${tool}`).click();
    const canvas = page.getByTestId('game-canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.36, box!.y + box!.height * 0.28);
    await expect(page.getByTestId('placement-status')).toBeVisible();
  }

  await page.getByTestId('sandbox-tool-enemy-troop').click();
  const before = await currentFrame(page);
  const canvas = page.getByTestId('game-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.36, box!.y + box!.height * 0.28);
  await page.keyboard.press('x');
  await expect(page.getByTestId('placement-status')).toBeVisible();
  if ((await page.getByTestId('placement-status').textContent())?.match(/blocked|bloqueada/i)) {
    await page.mouse.move(box!.x + box!.width * 0.42, box!.y + box!.height * 0.22);
  }
  await page.mouse.click(box!.x + box!.width * 0.42, box!.y + box!.height * 0.22);
  await expect
    .poll(async () => (await currentFrame(page)).units.length, { timeout: 5000 })
    .toBeGreaterThan(before.units.length);
});
