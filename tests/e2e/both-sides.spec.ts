import { expect, test, type Page } from '@playwright/test';
import type { Command, Frame } from '@prestes/shared';

declare global {
  interface Window {
    __prestes?: {
      command: (command: Command) => void;
      step: (ticks: number) => void;
      frame: () => Frame | null;
      bothSides: (on: boolean) => void;
    };
  }
}

// Recorded only when a test fails: passing runs leave no video on disk.
test.use({ video: { mode: 'retain-on-failure', size: { width: 1440, height: 900 } } });
test.setTimeout(180_000);

async function currentFrame(page: Page): Promise<Frame> {
  const frame = await page.evaluate(() => window.__prestes?.frame() ?? null);
  if (!frame) {
    throw new Error('simulation frame is unavailable');
  }
  return frame;
}

async function command(page: Page, value: Command, ticks = 1): Promise<Frame> {
  // One browser round trip per command: send it, step the paused simulation and
  // wait in the page for the frame. The run is bounded by simulated ticks, not by
  // per-tick round trips, which starved the timeout on a busy machine.
  const frame = await page.evaluate(
    async ({ next, count }) => {
      const bridge = window.__prestes!;
      const target = (bridge.frame()?.tick ?? 0) + count;
      bridge.command(next);
      bridge.step(count);
      while ((bridge.frame()?.tick ?? 0) < target) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return bridge.frame()!;
    },
    { next: value, count: ticks },
  );
  const rejected = frame.events.find((event) => event.type === 'command_rejected');
  if (rejected) {
    throw new Error(`command rejected: ${JSON.stringify(rejected)}`);
  }
  return frame;
}

test('controls both sides with reinforcements and exercises combat commands', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  // add-deployment-phase: the skirmish opens in deployment; start the battle.
  await page.getByTestId('start-battle').click();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');
  // Paused: the test steps the simulation itself, so a slow machine cannot let
  // the fight run on between commands.
  await page.evaluate(() => window.__prestes?.step(0));

  // remove-sandbox-panel D1: both-sides control comes from the development test bridge.
  await page.evaluate(() => window.__prestes?.bothSides(true));
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await page.evaluate(() => window.__prestes?.step(0));
  await page.evaluate(() => {
    const frame = window.__prestes?.frame();
    if (!frame) return;
    const unitIds = frame.units.filter((unit) => unit.alive && !unit.dummy).map((unit) => unit.id);
    window.__prestes?.command({ type: 'hold_fire', unitIds, hold: true });
  });

  for (let index = 0; index < 2; index += 1) {
    await page.evaluate(() => {
      window.__prestes?.command({ type: 'reinforce', faction: 'column' });
      window.__prestes?.step(1);
      window.__prestes?.command({ type: 'reinforce', faction: 'legalist' });
      window.__prestes?.step(1);
    });
  }
  await page.getByTestId('squad-3').click();
  await expect(page.getByTestId('squad-3')).toHaveAttribute('aria-pressed', 'true');
  // Reinforcements join the existing sections (11 + 2 in the 3rd).
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 13/13');

  const initial = await currentFrame(page);
  const column = initial.units
    .filter((unit) => unit.faction === 'column' && unit.alive && !unit.dummy)
    .map((unit) => unit.id);
  const legalist = initial.units
    .filter((unit) => unit.faction === 'legalist' && unit.alive && !unit.dummy)
    .map((unit) => unit.id);
  // retire-bootcamp: the 3v3's 33 a side, plus the reinforcements.
  expect(column.length).toBeGreaterThan(33);
  expect(legalist.length).toBeGreaterThan(33);
  await command(page, { type: 'hold_fire', unitIds: column, hold: true });
  await command(page, { type: 'hold_fire', unitIds: legalist, hold: true });

  const withDummy = await command(page, { type: 'spawn_dummy', to: { x: 0, y: 0 } });
  const dummy = withDummy.units.find((unit) => unit.kind === 'dummy');
  if (!dummy) throw new Error('missing target dummy');
  const dummyId = dummy.id;

  await command(page, { type: 'formation', unitIds: column, formation: 'wedge' });
  await command(page, { type: 'formation', unitIds: legalist, formation: 'column' });
  await command(page, { type: 'stance', unitIds: column, stance: 'crouched' });
  await command(page, { type: 'stance', unitIds: legalist, stance: 'standing' });

  const wounded = await command(page, { type: 'wound', targetId: legalist[0]!, hp: 30 });
  expect(wounded.units.find((unit) => unit.id === legalist[0])?.hp).toBeLessThanOrEqual(30);

  await command(page, { type: 'move', unitIds: column, to: { x: 0, y: 7 } }, 24);
  await command(page, { type: 'move', unitIds: legalist, to: { x: 0, y: -8 } }, 24);

  await command(page, { type: 'order', order: 'advance', unitIds: column, to: { x: 0, y: 7 } });
  await command(page, { type: 'order', order: 'defend', unitIds: column, to: { x: 0, y: 7 } });
  await command(page, { type: 'order', order: 'ambush', unitIds: column, to: { x: 0, y: 7 } });
  await command(page, { type: 'order', order: 'disperse', unitIds: column, to: { x: 0, y: 7 } });
  await command(page, { type: 'order', order: 'recon', unitIds: column, to: { x: 0, y: 7 } });
  await command(page, { type: 'order', order: 'reserve', unitIds: column, to: { x: 0, y: 7 } });
  // The 3v3 has no officer, so regroup and protect-officer (which need one)
  // are not exercised here; the command section of pre-battle-roster brings one.
  await command(page, {
    type: 'order',
    order: 'pursue',
    unitIds: column,
    targetId: dummyId,
  });
  await command(page, { type: 'order', order: 'defend', unitIds: legalist, to: { x: 0, y: -8 } });

  await command(page, { type: 'flank', unitIds: column, targetId: dummyId }, 8);
  await command(page, { type: 'suppress', unitIds: column, targetId: dummyId }, 8);
  await command(page, { type: 'attack', unitIds: column, targetId: dummyId }, 8);
  await command(page, { type: 'attack', unitIds: legalist, targetId: column[0]! }, 8);
  await command(page, { type: 'suppress', unitIds: legalist, targetId: dummyId }, 8);
  await command(page, { type: 'flank', unitIds: legalist, targetId: dummyId }, 8);

  await command(page, { type: 'withdraw', unitIds: column }, 4);
  await command(page, { type: 'hold', unitIds: column });
  await command(page, { type: 'withdraw', unitIds: legalist }, 4);
  await command(page, { type: 'hold', unitIds: legalist });

  const beforeCasualty = await currentFrame(page);
  const casualty = beforeCasualty.units.find(
    (unit) => unit.id === legalist[1] && unit.alive && !unit.incapacitated,
  );
  if (casualty) {
    await command(page, { type: 'incapacitate', targetId: casualty.id });
    await command(page, {
      type: 'order',
      order: 'rescue',
      unitIds: [column[6]!],
      targetId: casualty.id,
    });
    const rescuing = await currentFrame(page);
    expect(rescuing.units.find((unit) => unit.id === column[6])?.rescueTargetId).toBe(casualty.id);
  }

  await command(page, { type: 'attack', unitIds: column, targetId: legalist[1]! }, 6);
  await command(page, { type: 'attack', unitIds: legalist, targetId: column[1]! }, 6);

  const final = await currentFrame(page);
  expect(final.tick).toBeGreaterThan(initial.tick);
  expect(final.units.some((unit) => unit.faction === 'column')).toBe(true);
  expect(final.units.some((unit) => unit.faction === 'legalist')).toBe(true);

  const video = page.video();
  await page.close();
  await video?.saveAs('test-results/both-sides.webm');
});











