import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';

// battle-feel-3v3: aimed fire spreads over time, and two or three hits put a
// soldier out of action.

function battle(seed = 1922) {
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true });
  const events: Array<SimEvent & { at: number }> = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) {
      const frame = engine.tick();
      for (const event of frame.events) events.push({ ...event, at: frame.tick });
    }
  };
  const squad = (id: number) => engine.units.filter((unit) => unit.squadId === id).map((unit) => unit.id);
  return { engine, events, run, squad };
}

describe('battle feel: aimed fire', () => {
  it('a section that sights the enemy together does not fire as one volley', () => {
    const t = battle();
    const section = t.squad(1);
    const enemy = [...t.squad(11), ...t.squad(12), ...t.squad(13)];
    t.engine.enqueue({ type: 'hold_fire', unitIds: enemy, hold: true });
    t.engine.enqueue({ type: 'hold_fire', unitIds: [...t.squad(2), ...t.squad(3)], hold: true });
    t.engine.enqueue({ type: 'attack', unitIds: section, targetId: t.squad(12)[0]! });
    t.run(1200);
    const shots = t.events.filter((event) => event.type === 'shot' && section.includes(event.source));
    expect(shots.length).toBeGreaterThan(20);
    const start = shots[0]!.at;
    const window = shots.filter((event) => event.at < start + 300);
    const perTick = new Map<number, number>();
    for (const shot of window) perTick.set(shot.at, (perTick.get(shot.at) ?? 0) + 1);
    expect(Math.max(...perTick.values())).toBeLessThanOrEqual(3);

    // Between one soldier's aimed shots at the same target: 3 to 5 s (a reload
    // runs alongside the aim). A longer gap is a pause, not the aimed rate: the
    // section bounds forward and a soldier loses sight of his man for a while.
    const last = new Map<number, { at: number; target: number }>();
    const gaps: number[] = [];
    for (const shot of window) {
      if (shot.type !== 'shot') continue;
      const previous = last.get(shot.source);
      if (previous && previous.target === shot.target) gaps.push(shot.at - previous.at);
      last.set(shot.source, { at: shot.at, target: shot.target });
    }
    expect(gaps.length).toBeGreaterThan(5);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(30);
    const aimed = gaps.filter((gap) => gap <= 50);
    expect(aimed.length / gaps.length).toBeGreaterThanOrEqual(0.8);
    expect(aimed.filter((gap) => gap >= 30 && gap <= 50).length).toBe(aimed.length);
  }, 120_000);

  it('the same seed fires the same shots on the same ticks', () => {
    const shotsOf = () => {
      const t = battle(7);
      t.engine.enqueue({ type: 'attack', unitIds: t.squad(1), targetId: t.squad(11)[0]! });
      t.run(600);
      return t.events
        .filter((event) => event.type === 'shot')
        .map((event) => (event.type === 'shot' ? `${event.at}:${event.source}:${event.target}:${event.hit}` : ''));
    };
    expect(shotsOf()).toEqual(shotsOf());
  }, 120_000);
});

describe('battle feel: lethality', () => {
  it('an unwounded soldier goes down after two or three aimed hits', () => {
    const t = battle();
    for (const id of [1, 2, 3]) t.engine.enqueue({ type: 'attack', unitIds: t.squad(id), targetId: t.squad(10 + id)[0]! });
    t.run(1500);
    const hits = new Map<number, number>();
    const needed: number[] = [];
    const down = new Set<number>();
    for (const event of t.events) {
      if (event.type === 'unit_hit') hits.set(event.unitId, (hits.get(event.unitId) ?? 0) + 1);
      if ((event.type === 'unit_incapacitated' || event.type === 'unit_died') && !down.has(event.unitId)) {
        down.add(event.unitId);
        needed.push(hits.get(event.unitId) ?? 0);
      }
    }
    expect(needed.length).toBeGreaterThan(5);
    for (const count of needed) {
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(3);
    }
  }, 120_000);
});

describe('battle feel: the enemy commander', () => {
  const sectionOf = (t: ReturnType<typeof battle>, squad: number) => t.engine.units.filter((unit) => unit.squadId === squad);

  it('deploys the enemy into its defensive line before contact', () => {
    const t = battle();
    // Before his 30 s of patience run out (he then goes looking).
    t.run(250);
    for (const squad of [11, 12, 13]) {
      const section = sectionOf(t, squad);
      expect(section.every((unit) => unit.currentOrder === 'defend')).toBe(true);
      // Behind a parapet and in a trench: well above a crouch in the open.
      expect(section.filter((unit) => unit.cover > 0.45).length).toBeGreaterThanOrEqual(8);
    }
    expect(t.events.some((event) => event.type === 'shot')).toBe(false);
  });

  it('goes looking with all but one section when the player waits', () => {
    const t = battle();
    t.run(400);
    const attacking = [11, 12, 13].filter((squad) => sectionOf(t, squad).some((unit) => unit.currentOrder === 'attack'));
    expect(attacking).toHaveLength(2);
  });

  it('counterattacks by bounds when it clearly outnumbers the player', () => {
    const t = battle();
    t.run(50);
    for (const unit of t.engine.units.filter((entry) => entry.faction === 'column').slice(0, 20)) {
      unit.alive = false;
    }
    t.run(30);
    const attacking = [11, 12, 13].filter((squad) => sectionOf(t, squad).some((unit) => unit.currentOrder === 'attack'));
    expect(attacking.length).toBeGreaterThanOrEqual(1);
  });

  it('a section that lost contact goes after the enemy instead of standing', () => {
    const t = battle();
    const section = t.squad(2);
    // Contact made, then lost: the section saw the enemy 12 s ago and has no
    // order holding it.
    t.engine.battle.contacts.set(2, { x: 0, y: -60, tick: 0 });
    t.engine.enqueue({ type: 'hold_fire', unitIds: [...t.squad(11), ...t.squad(12), ...t.squad(13)], hold: true });
    t.run(120);
    const moving = t.engine.units.filter((unit) => section.includes(unit.id) && (unit.path.length > 0 || unit.boundTeam !== null));
    expect(moving.length).toBeGreaterThan(0);
    expect(t.engine.units.filter((unit) => section.includes(unit.id)).every((unit) => unit.currentOrder === 'advance')).toBe(true);
  });
});

describe('battle feel: suppression and nerve', () => {
  it('a suppressing section spreads its rifles over the enemy section', () => {
    const t = battle();
    t.engine.enqueue({ type: 'suppress', unitIds: t.squad(2), targetId: t.squad(12)[0]! });
    t.run(1);
    const laid = new Set(t.engine.units.filter((unit) => t.squad(2).includes(unit.id)).map((unit) => unit.targetId));
    expect(laid.size).toBeGreaterThanOrEqual(5);
    for (const id of laid) expect(t.squad(12)).toContain(id);
  });

  it('a shot at a man suppresses his mate 2 m away too', () => {
    const t = battle();
    const [shooter] = t.engine.units.filter((unit) => unit.squadId === 2);
    const [target, mate] = t.engine.units.filter((unit) => unit.squadId === 12);
    shooter!.x = target!.x;
    shooter!.y = target!.y + 40;
    mate!.x = target!.x + 2;
    mate!.y = target!.y;
    t.engine.enqueue({ type: 'hold_fire', unitIds: t.engine.units.filter((unit) => unit !== shooter).map((unit) => unit.id), hold: true });
    t.engine.enqueue({ type: 'attack', unitIds: [shooter!.id], targetId: target!.id });
    let raised = false;
    for (let tick = 0; tick < 200 && !raised; tick += 1) {
      t.run(1);
      raised = t.events.some((event) => event.type === 'shot' && event.target === target!.id) && mate!.suppression > 0;
    }
    expect(raised).toBe(true);
  });

  it('a soldier pinned by low morale steadies once no one fires at him', () => {
    const t = battle();
    const unit = t.engine.units.find((entry) => entry.id === 1)!;
    unit.morale = 20;
    t.run(5);
    expect(unit.state).toBe('pinned');
    t.run(600);
    expect(unit.morale).toBeGreaterThan(30);
    expect(unit.state).not.toBe('pinned');
  }, 60_000);
});
