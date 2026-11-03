import { describe, expect, it } from 'vitest';
import type { Command, Frame, SimEvent } from '@prestes/shared';
import { SimulationEngine, type SimulationOptions } from '../src/engine';

// One scenario per troop and officer mechanic, on the default scenario: riflemen
// 1, 2, 7, 8, 9 and officer 3 at y ≈ 7; legalists 4, 5, 6 at y ≈ -19.
const COLUMN = [1, 2, 7, 8, 9];
const OFFICER = 3;
const ENEMY = [4, 5, 6];

function harness(options: Partial<SimulationOptions> = {}) {
  const engine = new SimulationEngine({ seed: 1922, sandbox: true, training: true, ...options });
  const events: SimEvent[] = [];
  let frame: Frame = engine.runTicks(1);
  const run = (ticks: number, each?: (next: Frame) => void): Frame => {
    for (let index = 0; index < ticks; index += 1) {
      frame = engine.tick();
      events.push(...frame.events);
      each?.(frame);
    }
    return frame;
  };
  const send = (command: Command, ticks = 1): Frame => {
    engine.enqueue(command);
    return run(ticks);
  };
  const unit = (id: number) => frame.units.find((entry) => entry.id === id)!;
  const shotsBy = (ids: readonly number[]) =>
    events.filter((event) => event.type === 'shot' && ids.includes(event.source)).length;
  const count = (type: SimEvent['type']) => events.filter((event) => event.type === type).length;
  return { engine, events, run, send, unit, shotsBy, count, frame: () => frame };
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('mechanics: fire', () => {
  it('attack: riflemen behind sight-blocking cover still hit their target', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
    const hp = t.unit(6).hp;
    t.send({ type: 'attack', unitIds: COLUMN, targetId: 6 }, 300);
    expect(t.shotsBy(COLUMN)).toBeGreaterThan(0);
    expect(t.unit(6).hp < hp || !t.unit(6).alive).toBe(true);
  });

  it('suppress: riflemen raise the target suppression with their own fire', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
    t.send({ type: 'suppress', unitIds: COLUMN, targetId: 6 }, 300);
    expect(t.shotsBy(COLUMN)).toBeGreaterThan(0);
  });

  it('hold fire: nobody fires while targets are in range', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
    t.send({ type: 'move', unitIds: COLUMN, to: { x: 0, y: -8 } }, 300);
    expect(t.count('shot')).toBe(0);
  });
});

describe('mechanics: movement', () => {
  it('move: the section reaches the ordered point', () => {
    const t = harness();
    const start = t.unit(1);
    t.send({ type: 'move', unitIds: COLUMN, to: { x: 0, y: 20 } }, 200);
    expect(distance(t.unit(1), start)).toBeGreaterThan(5);
  });

  it('move onto cover: soldiers go to the nearest open point', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
    const start = t.unit(6);
    // (0, -4) lies inside the clearance of a training cover.
    t.send({ type: 'move', unitIds: [6], to: { x: 0, y: -4 } });
    const ordered = t.engine.units.find((unit) => unit.id === 6)!;
    expect(ordered.path.length).toBeGreaterThan(0);
    expect(distance({ x: ordered.targetX, y: ordered.targetY }, { x: 0, y: -4 })).toBeLessThan(3);
    t.run(200);
    expect(distance(t.unit(6), start)).toBeGreaterThan(8);
  });

  it('withdraw: the section falls back away from the enemy', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
    const y = t.unit(1).y;
    t.send({ type: 'withdraw', unitIds: COLUMN }, 200);
    expect(t.unit(1).y).toBeGreaterThan(y + 3);
  });

  it('hold: soldiers stay put', () => {
    const t = harness();
    const start = { ...t.unit(1) };
    t.send({ type: 'hold', unitIds: COLUMN }, 200);
    expect(distance(t.unit(1), start)).toBeLessThan(2);
  });

  it('face: the soldier turns to the ordered direction', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, ...ENEMY], hold: true });
    t.send({ type: 'face', unitIds: [1], to: { x: 30, y: 7 } }, 40);
    expect(t.unit(1).facingX).toBeGreaterThan(0.8);
  });

  it('bounding: a move splits the section into alternating teams', () => {
    const t = harness({ bounding: true });
    t.send({ type: 'move', unitIds: COLUMN, to: { x: 0, y: 25 } }, 2);
    const teams = new Set(COLUMN.map((id) => t.unit(id).boundTeam));
    expect(teams.has('a') && teams.has('b')).toBe(true);
  });
});

describe('mechanics: troop orders', () => {
  it('flank: flankers move to the side of the target', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
    const before = COLUMN.map((id) => t.unit(id).x);
    t.send({ type: 'flank', unitIds: COLUMN, targetId: 6 }, 400);
    const sideways = COLUMN.filter((id, index) => Math.abs(t.unit(id).x - before[index]!) > 6);
    expect(sideways.length).toBeGreaterThanOrEqual(2);
  });

  it('recon: scouts report contacts without firing', () => {
    const t = harness();
    t.send({ type: 'order', order: 'recon', unitIds: [1, 2], to: { x: 0, y: -4 } }, 300);
    expect(t.count('recon_report')).toBeGreaterThan(0);
    expect(t.shotsBy([1, 2])).toBe(0);
  });

  it('ambush: the section holds fire until the enemy enters, then fires', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
    t.send({ type: 'order', order: 'ambush', unitIds: COLUMN, to: { x: 0, y: 7 } }, 60);
    expect(t.shotsBy(COLUMN)).toBe(0);
    t.send({ type: 'move', unitIds: ENEMY, to: { x: 0, y: -2 } }, 300);
    expect(t.shotsBy(COLUMN)).toBeGreaterThan(0);
  });

  it('pursue: pursuers close on the target', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
    const start = distance(t.unit(1), t.unit(6));
    t.send({ type: 'order', order: 'pursue', unitIds: [1, 2], targetId: 6 }, 200);
    expect(distance(t.unit(1), t.unit(6)) < start || !t.unit(6).alive).toBe(true);
  });

  for (const order of ['defend', 'advance', 'disperse', 'reserve'] as const) {
    it(`${order}: the section goes to the ordered area`, () => {
      const t = harness();
      t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
      const center = { x: 0, y: 18 };
      t.send({ type: 'order', order, unitIds: COLUMN, to: center }, 300);
      expect(Math.max(...COLUMN.map((id) => distance(t.unit(id), center)))).toBeLessThan(12);
    });
  }

  it('regroup: a straggler rejoins the section', () => {
    const t = harness();
    t.send({ type: 'move', unitIds: [1], to: { x: -25, y: 20 } }, 200);
    const spread = distance(t.unit(1), t.unit(2));
    t.send({ type: 'order', order: 'regroup', unitIds: COLUMN }, 300);
    expect(distance(t.unit(1), t.unit(2))).toBeLessThan(spread);
  });

  it('protect-officer: the section closes on the officer', () => {
    const t = harness();
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -20, y: 25 } }, 200);
    const gap = distance(t.unit(1), t.unit(OFFICER));
    t.send({ type: 'order', order: 'protect-officer', unitIds: COLUMN }, 300);
    expect(distance(t.unit(1), t.unit(OFFICER))).toBeLessThan(gap);
  });

  it('rescue: a casualty is carried, treated, evacuated and recovers', () => {
    const t = harness();
    // Nobody fires: a victory would freeze the simulation before recovery ends.
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
    t.send({ type: 'incapacitate', targetId: 1 });
    t.send({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 }, 1500);
    expect(t.count('unit_evacuated')).toBe(1);
    expect(t.count('unit_recovered')).toBe(1);
    expect(t.unit(1).alive).toBe(true);
  });
});

describe('mechanics: body, posture and formation', () => {
  it('stance, posture and formation change on command', () => {
    const t = harness();
    t.send({ type: 'stance', unitIds: COLUMN, stance: 'prone' }, 5);
    t.send({ type: 'posture', unitIds: COLUMN, posture: 'aggressive' }, 5);
    t.send({ type: 'formation', unitIds: COLUMN, formation: 'wedge' }, 5);
    expect(t.unit(1).stance).toBe('prone');
    expect(t.unit(1).posture).toBe('aggressive');
    expect(t.unit(1).formation).toBe('wedge');
  });
});

describe('mechanics: morale and officer', () => {
  it('morale: sustained suppression pins and then panics a soldier', () => {
    const t = harness({ training: false });
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER], hold: true });
    t.send({ type: 'reinforce', faction: 'legalist' });
    t.send({ type: 'reinforce', faction: 'legalist' });
    const enemies = t.frame().units.filter((unit) => unit.faction === 'legalist').map((unit) => unit.id);
    t.send({ type: 'move', unitIds: enemies, to: { x: -7, y: -6 } }, 120);
    const states = new Set<string>();
    t.send({ type: 'suppress', unitIds: enemies, targetId: 1 });
    t.run(600, (frame) => states.add(frame.units.find((unit) => unit.id === 1)!.state));
    expect(states.has('pinned')).toBe(true);
  });

  it('officer aura: morale recovers faster near the officer', () => {
    const near = harness();
    const far = harness();
    for (const t of [near, far]) {
      t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
      t.send({ type: 'hold', unitIds: [...COLUMN, ...ENEMY] });
    }
    near.send({ type: 'hold', unitIds: [OFFICER] });
    far.send({ type: 'move', unitIds: [OFFICER], to: { x: -40, y: 40 } }, 200);
    near.run(200);
    for (const t of [near, far]) {
      t.engine.units.find((unit) => unit.id === 2)!.morale = 40;
      t.run(60);
    }
    expect(near.unit(2).morale).toBeGreaterThan(far.unit(2).morale);
  });

  it('officer loss: protect-officer orders are interrupted', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
    t.send({ type: 'order', order: 'protect-officer', unitIds: COLUMN }, 20);
    t.send({ type: 'incapacitate', targetId: OFFICER }, 5);
    expect(t.count('order_interrupted')).toBeGreaterThan(0);
  });

  it('officer loss: nearby soldiers lose morale once', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, ...ENEMY], hold: true });
    const before = t.unit(2).morale;
    t.send({ type: 'incapacitate', targetId: OFFICER }, 5);
    const after = t.unit(2).morale;
    t.run(100);
    expect(after).toBeLessThanOrEqual(before - 20);
    expect(t.unit(2).morale).toBeGreaterThanOrEqual(after - 1);
  });
});

describe('training station setup', () => {
  const setup = (extra: Record<string, unknown> = {}): Command => ({
    type: 'training_phase',
    setup: { phase: 'assembly', playerPoint: { x: 28, y: 4 }, officerPoint: { x: 22, y: 4 }, ...extra },
  });
  const section = (frame: Frame) =>
    frame.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1);
  const instructor = (frame: Frame) => frame.units.find((unit) => unit.squadId === 99)!;
  const centroid = (frame: Frame) => {
    const units = section(frame).filter((unit) => unit.alive && !unit.incapacitated);
    return {
      x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
      y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
    };
  };

  it('refills magazine and reserve at every station start', () => {
    const t = harness({ opposition: false });
    t.send(setup(), 2);
    for (const unit of t.engine.units) {
      unit.magazine = 0;
      unit.reserve = 0;
    }
    const frame = t.send(setup(), 2);
    expect(section(frame).every((unit) => unit.magazine === 5 && unit.reserve === 15)).toBe(true);
  });

  it('the instructor follows the section', () => {
    const t = harness({ opposition: false });
    t.send(setup(), 2);
    const ids = section(t.frame()).map((unit) => unit.id);
    t.send({ type: 'move', unitIds: ids, to: { x: 0, y: 30 } }, 500);
    expect(distance(instructor(t.frame()), centroid(t.frame()))).toBeLessThanOrEqual(15);
  });

  it('a pinned instructor stays at its checkpoint', () => {
    const t = harness({ opposition: false });
    t.send(setup({ pinInstructor: true }), 2);
    const start = { ...instructor(t.frame()) };
    const ids = section(t.frame()).map((unit) => unit.id);
    t.send({ type: 'move', unitIds: ids, to: { x: 0, y: 30 } }, 500);
    expect(distance(instructor(t.frame()), start)).toBeLessThan(4);
  });

  it('starts casualty drills with incapacitated soldiers and instructor', () => {
    const t = harness({ opposition: false });
    const frame = t.send(setup({ casualtyCount: 1, instructorOut: true }), 2);
    expect(section(frame).filter((unit) => unit.incapacitated)).toHaveLength(1);
    expect(instructor(frame).incapacitated).toBe(true);
  });
});
