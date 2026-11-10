import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { duel } from './garrison-duel';

/** garrison-and-assault 3.2: an assault from 10 m out of the front door. */
function assault(seed: number, options: { attackers: number; pinned: boolean }) {
  const t = duel(seed, { openCount: options.attackers, atDoor: 10, garrisonPinned: options.pinned });
  const events: SimEvent[] = [];
  t.engine.enqueue({ type: 'assault', unitIds: t.open.map((unit) => unit.id), positionId: t.house.id });
  let ended: Extract<SimEvent, { type: 'assault_ended' }> | undefined;
  let bars = 0;
  for (let tick = 0; tick < 1200 && !ended; tick += 1) {
    // Supporting fire keeps a pinned garrison down.
    if (options.pinned) for (const unit of t.inside) if (unit.alive && !unit.incapacitated) unit.suppression = 100;
    const frame = t.engine.runTicks(1, { hash: false });
    events.push(...frame.events);
    if (frame.assaults?.some((entry) => entry.positionId === t.house.id)) bars += 1;
    ended = frame.events.find((event): event is Extract<SimEvent, { type: 'assault_ended' }> => event.type === 'assault_ended');
  }
  return { ...t, events, ended, bars };
}

describe('garrison: close assault (garrison-and-assault 3.2)', { timeout: 120_000 }, () => {
  it('suppress, then assault: a pinned garrison of 4 assaulted by 8 falls in most seeds, and the attackers hold it', () => {
    let wins = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const { engine, ended, open, house, events } = assault(seed, { attackers: 8, pinned: true });
      expect(events.some((event) => event.type === 'assault_started')).toBe(true);
      expect(ended).toBeDefined();
      if (ended!.winner === 'legalist') {
        wins += 1;
        const garrison = engine.frame().garrisons?.find((entry) => entry.positionId === house.id);
        expect(garrison?.side).toBe('legalist');
        expect(garrison!.unitIds.every((id) => open.some((unit) => unit.id === id))).toBe(true);
      }
    }
    expect(wins).toBeGreaterThanOrEqual(14);
  });

  it('assault without suppression: a steady garrison of 4 holds against 4 in most seeds', () => {
    let held = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const { ended } = assault(seed, { attackers: 4, pinned: false });
      if (ended?.winner === 'column') held += 1;
    }
    expect(held).toBeGreaterThanOrEqual(14);
  });

  it('bars during the fight: the frame carries the assault until it ends, then not', () => {
    const { engine, bars, ended, house } = assault(4, { attackers: 8, pinned: true });
    expect(ended).toBeDefined();
    expect(bars).toBeGreaterThan(0);
    expect(engine.frame().assaults?.some((entry) => entry.positionId === house.id) ?? false).toBe(false);
  });

  it('determinism: the same assault twice ends the same way at the same hash', () => {
    const run = () => {
      const { engine, ended } = assault(9, { attackers: 6, pinned: false });
      return `${ended?.tick}:${ended?.winner}:${engine.frame().hash}`;
    };
    expect(run()).toBe(run());
  });

  it('refusals: an assault on an empty or own position, or from too far, says why', () => {
    const t = duel(2, { openCount: 4, atDoor: 40 });
    const refuse = (command: Parameters<typeof t.engine.enqueue>[0]) => {
      t.engine.enqueue(command);
      return t.engine.runTicks(1, { hash: false }).events.find((event) => event.type === 'command_rejected');
    };
    expect(refuse({ type: 'assault', unitIds: t.open.map((unit) => unit.id), positionId: t.house.id })).toMatchObject({ reason: 'too_far' });
    expect(refuse({ type: 'assault', unitIds: t.inside.map((unit) => unit.id), positionId: t.house.id })).toMatchObject({ reason: 'not_garrisoned' });
    expect(refuse({ type: 'assault', unitIds: t.open.map((unit) => unit.id), positionId: 424242 })).toMatchObject({ reason: 'invalid_target' });
  });
});
