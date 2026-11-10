import { describe, expect, it } from 'vitest';
import { PINNED_SUPPRESSION } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { duel } from './garrison-duel';

/**
 * garrison-and-assault 3.4: the player's garrison of 4 in a house; a
 * legalist section of 6 out in front (short of 2 to 1), left to its commander.
 */
function facing(seed: number) {
  const t = duel(seed, { openCount: 6 });
  const log = { suppressedFirst: false, orderedAt: -1, suppressionThen: 0, ended: '' as string };
  for (let tick = 0; tick < 3000 && log.orderedAt < 0; tick += 1) {
    const frame = t.engine.runTicks(1, { hash: false });
    if (t.open.some((unit) => unit.suppress && t.inside.some((man) => man.id === unit.targetId))) log.suppressedFirst = true;
    if (t.open.some((unit) => unit.assaulting === t.house.id)) {
      log.orderedAt = tick;
      log.suppressionThen = frame.garrisons?.find((entry) => entry.positionId === t.house.id)?.suppression ?? 0;
    }
  }
  return { ...t, log };
}

describe('garrison: the commander uses positions (garrison-and-assault 3.4)', { timeout: 120_000 }, () => {
  it('suppress before assault: the legalists fire on the house until it is pinned before they assault', () => {
    let assaulted = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const { log } = facing(seed);
      if (log.orderedAt < 0) continue;
      assaulted += 1;
      expect(log.suppressedFirst).toBe(true);
      expect(log.suppressionThen).toBeGreaterThanOrEqual(PINNED_SUPPRESSION - 1);
    }
    // Half the seeds get as far as an assault in 5 min (5 of 10 when tuned); every one pinned the house first.
    expect(assaulted).toBeGreaterThanOrEqual(3);
  });

  it('garrison on deployment: on the test map one legalist section goes into a position near its line', () => {
    const engine = new SimulationEngine({ seed: 7, scenario: 'battle3v3', battleMap: 'campo-de-provas' });
    const frame = engine.runTicks(400, { hash: false });
    const held = frame.garrisons?.filter((entry) => entry.side === 'legalist') ?? [];
    expect(held).toHaveLength(1);
    const squads = new Set(held[0]!.unitIds.map((id) => engine.units.find((unit) => unit.id === id)!.squadId));
    expect(squads.size).toBe(1);
    const position = engine.positions.find((entry) => entry.id === held[0]!.positionId)!;
    expect(position.capacity).toBeGreaterThanOrEqual(4);
  });

  it('leave a lost position: a legalist garrison down to one man leaves toward its side', () => {
    const t = duel(2, { insideFaction: 'legalist' });
    for (const unit of [...t.inside, ...t.open]) unit.holdFire = true;
    t.engine.runTicks(20, { hash: false });
    for (const unit of t.inside.slice(1)) {
      unit.alive = false;
      unit.soldierState = 'dead';
    }
    const last = t.inside[0]!;
    let left = false;
    for (let tick = 0; tick < 60 && !left; tick += 1) {
      const frame = t.engine.runTicks(1, { hash: false });
      left = frame.events.some((event) => event.type === 'unit_left' && event.unitId === last.id);
    }
    expect(left).toBe(true);
    expect(last.garrison).toBeUndefined();
  });
});
