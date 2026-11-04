import { describe, expect, it } from 'vitest';
import type { Command, Frame, SimEvent, Vec2 } from '@prestes/shared';
import { SimulationEngine, type SimulationOptions } from '../src/engine';

// One scenario per troop and officer mechanic, on the default scenario: riflemen
// 1, 2, 7, 8, 9 and officer 3 at y ≈ 7; legalists 4, 5, 6 at y ≈ -19.
const COLUMN = [1, 2, 7, 8, 9];
const OFFICER = 3;
const ENEMY = [4, 5, 6];

function harness(options: Partial<SimulationOptions> = {}) {
  // The mechanics are laid out on the earlier training kit around the origin.
  const engine = new SimulationEngine({ seed: 1922, sandbox: true, training: true, map: 'training-kit', ...options });
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

  it('suppress: fast fire until the target is pinned, then the normal rate', () => {
    const minGap = (pinned: boolean) => {
      const t = harness();
      t.send({ type: 'hold_fire', unitIds: [...ENEMY, OFFICER, 2, 7, 8, 9], hold: true });
      const hold = () => {
        const target = t.engine.units.find((unit) => unit.id === 6)!;
        target.hp = 100;
        target.morale = 100;
        target.suppression = pinned ? 100 : 0;
      };
      t.send({ type: 'suppress', unitIds: [1], targetId: 6 });
      t.run(400, hold);
      const ticks = t.events
        .filter((event) => event.type === 'shot' && event.source === 1)
        .map((event) => event.tick);
      expect(ticks.length).toBeGreaterThan(4);
      return Math.min(...ticks.slice(1).map((tick, index) => tick - ticks[index]!));
    };
    expect(minGap(false)).toBe(8);
    expect(minGap(true)).toBe(12);
  });

  it('hold fire: nobody fires while targets are in range', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
    t.send({ type: 'move', unitIds: COLUMN, to: { x: 0, y: -8 } }, 300);
    expect(t.count('shot')).toBe(0);
  });
});

describe('mechanics: training target discipline', () => {
  it('defenders only engage a training troop that enters the defended area', () => {
    const t = harness({ opposition: false });
    t.send({
      type: 'training_phase',
      setup: { phase: 'defense', playerPoint: { x: 28, y: 4 }, officerPoint: { x: 28, y: 10 }, enemyPoint: { x: 82, y: 10 }, enemyCount: 6 },
    }, 2);
    const ids = t.frame().units.filter((unit) => unit.squadId === 1).map((unit) => unit.id);
    t.send({ type: 'order', order: 'defend', unitIds: ids, to: { x: 52, y: -18 } }, 600);
    expect(t.shotsBy(ids)).toBe(0);
    const enemies = t.frame().units.filter((unit) => unit.role === 'training-enemy').map((unit) => unit.id);
    t.send({ type: 'move', unitIds: enemies, to: { x: 54, y: -8 } }, 400);
    expect(t.shotsBy(ids)).toBeGreaterThan(0);
  });

  it('never fires at a training troop without an explicit order', () => {
    const t = harness({ opposition: false });
    t.send({
      type: 'training_phase',
      setup: { phase: 'maneuver', playerPoint: { x: 28, y: 4 }, officerPoint: { x: 28, y: 10 }, enemyPoint: { x: 52, y: -18 }, enemyCount: 6 },
    }, 2);
    const ids = t.frame().units.filter((unit) => unit.squadId === 1).map((unit) => unit.id);
    t.run(300);
    expect(t.shotsBy(ids)).toBe(0);
    const target = t.frame().units.find((unit) => unit.role === 'training-enemy')!.id;
    t.send({ type: 'attack', unitIds: ids, targetId: target }, 300);
    expect(t.shotsBy(ids)).toBeGreaterThan(0);
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

  it('withdraw with no enemy left still falls back', () => {
    // Training without opposition: the training troop is gone, nobody is hostile.
    const t = harness({ opposition: false });
    const ids = t.frame().units.filter((unit) => unit.squadId === 1).map((unit) => unit.id);
    const start = { ...t.unit(ids[0]!) };
    t.send({ type: 'withdraw', unitIds: ids }, 200);
    expect(distance(t.unit(ids[0]!), start)).toBeGreaterThan(5);
  });

  it('hold: soldiers stay put', () => {
    const t = harness();
    const start = { ...t.unit(1) };
    t.send({ type: 'hold', unitIds: COLUMN }, 200);
    expect(distance(t.unit(1), start)).toBeLessThan(2);
  });

  it('bounding keeps a tactical order instead of turning it into a move', () => {
    const t = harness({ bounding: true });
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
    t.send({ type: 'order', order: 'defend', unitIds: COLUMN, to: { x: 0, y: 20 } }, 400);
    expect(COLUMN.every((id) => t.unit(id).order === 'defend')).toBe(true);
  });

  it('face: the soldier turns to the ordered direction', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, ...ENEMY], hold: true });
    t.send({ type: 'face', unitIds: [1], to: { x: 30, y: 7 } }, 40);
    expect(t.unit(1).facingX).toBeGreaterThan(0.8);
  });

  it('face after suppressing a training troop keeps the new direction', () => {
    // Training targets are never acquired automatically, so only the old fire
    // order could turn the soldiers back.
    const t = harness({ opposition: false });
    t.send({
      type: 'training_phase',
      setup: { phase: 'fire', playerPoint: { x: 28, y: 4 }, officerPoint: { x: 28, y: 10 }, enemyPoint: { x: 52, y: -18 }, enemyCount: 6 },
    }, 2);
    const ids = t.frame().units.filter((unit) => unit.squadId === 1).map((unit) => unit.id);
    const target = t.frame().units.find((unit) => unit.role === 'training-enemy')!.id;
    t.send({ type: 'suppress', unitIds: ids, targetId: target }, 60);
    t.send({ type: 'hold_fire', unitIds: ids, hold: true });
    t.send({ type: 'face', unitIds: ids, to: { x: 28, y: 60 } }, 80);
    expect(ids.every((id) => t.unit(id).facingY > 0.5)).toBe(true);
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
    // No enemy fire: a suppressed soldier would not answer the order.
    t.send({ type: 'hold_fire', unitIds: ENEMY, hold: true });
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
    expect(section(frame).every((unit) => unit.magazine === 5 && unit.reserve === 45)).toBe(true);
    expect(instructor(frame)).toMatchObject({ magazine: 5, reserve: 45 });
  });

  it('a section suppressing for 40 s still has rounds to clear the line', () => {
    const t = harness({ opposition: false });
    t.send(setup({ enemyPoint: { x: 28, y: -40 }, enemyCount: 6 }), 2);
    const enemies = t.frame().units.filter((unit) => unit.role === 'training-enemy');
    t.send({ type: 'hold_fire', unitIds: enemies.map((unit) => unit.id), hold: true });
    const ids = section(t.frame()).map((unit) => unit.id);
    t.send({ type: 'suppress', unitIds: ids, targetId: enemies[0]!.id });
    const keepAlive = () => {
      for (const unit of t.engine.units) {
        if (unit.role === 'training-enemy') unit.hp = 100;
      }
    };
    t.run(400, keepAlive);
    expect(t.shotsBy(ids)).toBeGreaterThan(ids.length * 10);
    const frame = t.frame();
    const left = section(frame).filter((unit) => unit.alive);
    expect(left.every((unit) => unit.magazine + unit.reserve >= 10)).toBe(true);
  });

  it('a section of 11 marches 40 m as one body and its routes do not cross', () => {
    const t = harness({ opposition: false });
    t.send(setup(), 2);
    const ids = section(t.frame()).map((unit) => unit.id);
    expect(ids).toHaveLength(11);
    const start = centroid(t.frame());
    const to = { x: start.x - 40, y: start.y + 4 };
    const starts = new Map(section(t.frame()).map((unit) => [unit.id, { x: unit.x, y: unit.y }]));
    const frame = t.send({ type: 'move', unitIds: ids, to }, 1);
    const ends = new Map(frame.orders.map((order) => [order.unitIds[0]!, order.points.at(-1)!]));
    const side = (p: Vec2, q: Vec2, r: Vec2) =>
      Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    for (const a of ids) {
      for (const b of ids) {
        if (a >= b) continue;
        const [a0, a1, b0, b1] = [starts.get(a)!, ends.get(a)!, starts.get(b)!, ends.get(b)!];
        const crossing = side(a0, a1, b0) * side(a0, a1, b1) < 0 && side(b0, b1, a0) * side(b0, b1, a1) < 0;
        expect(crossing, `routes of ${a} and ${b} cross`).toBe(false);
      }
    }
    // On the march the body stays compact (it spreads only near the end); a
    // soldier may trail while it walks around a prop.
    let widest = 0;
    let total = 0;
    let samples = 0;
    t.run(400, (next) => {
      const here = centroid(next);
      const travelled = Math.hypot(here.x - start.x, here.y - start.y);
      if (travelled > 8 && travelled < 28) {
        for (const unit of section(next)) {
          const away = Math.hypot(unit.x - here.x, unit.y - here.y);
          widest = Math.max(widest, away);
          total += away;
          samples += 1;
        }
      }
    });
    expect(samples).toBeGreaterThan(0);
    expect(total / samples).toBeLessThan(4);
    expect(widest).toBeLessThan(12);
  });

  it('carries the training load; the training enemy keeps the Mauser profile', () => {
    const t = harness({ opposition: false });
    expect(section(t.frame()).every((unit) => unit.magazine === 5 && unit.reserve === 45)).toBe(true);
    const frame = t.send(setup({ enemyPoint: { x: 28, y: -40 }, enemyCount: 3 }), 2);
    const enemies = frame.units.filter((unit) => unit.faction !== 'column' && unit.alive);
    expect(enemies.length).toBeGreaterThan(0);
    expect(enemies.every((unit) => unit.magazine === 5 && unit.reserve === 15)).toBe(true);
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

describe('mechanics: ordered facing', () => {
  it('move with facing: the wedge is turned to it and kept on arrival', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
    t.send({ type: 'formation', unitIds: COLUMN, formation: 'wedge' });
    const to = { x: -30, y: 34 };
    t.send({ type: 'move', unitIds: COLUMN, to, facing: { x: 3, y: 0 } }, 900);
    const units = COLUMN.map((id) => t.unit(id));
    for (const unit of units) {
      expect(unit.facingX).toBeGreaterThan(0.9);
      expect(unit.aimX).toBeCloseTo(1);
    }
    // The wedge's point is the destination; its arms trail to the west.
    const east = Math.max(...units.map((unit) => unit.x));
    expect(Math.abs(east - to.x)).toBeLessThan(1.5);
    expect(units.filter((unit) => unit.x < to.x - 1.5).length).toBe(COLUMN.length - 1);
  });

  it('defend with facing: the player side wins over the enemy direction', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
    t.send({ type: 'order', order: 'defend', unitIds: COLUMN, to: { x: -30, y: 34 }, facing: { x: -1, y: 0 } }, 900);
    for (const id of COLUMN) {
      if (t.unit(id).targetId === null) expect(t.unit(id).facingX).toBeLessThan(-0.9);
    }
  });

  it('rejects a facing with no direction', () => {
    const t = harness();
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -30, y: 34 }, facing: { x: 0, y: 0 } }, 2);
    expect(t.count('command_rejected')).toBe(1);
  });
});


/** Soldiers stop within their arrival tolerance: the mean gap is exact. */
function expectSpacing(gaps: number[], spacing: number): void {
  const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  expect(Math.abs(mean - spacing)).toBeLessThan(0.1);
  for (const gap of gaps) expect(Math.abs(gap - spacing)).toBeLessThan(1);
}

describe('mechanics: ordered spacing', () => {
  const gaps = (units: Array<{ x: number; y: number }>) => {
    // Neighbour distances along a line facing east (soldiers spread on y).
    const ys = units.map((unit) => unit.y).sort((a, b) => a - b);
    return ys.slice(1).map((y, index) => y - ys[index]!);
  };

  it('opens the line to the ordered spacing and resets without one', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
    // The opening tick's shots made some crouch (reaction to fire): stand the
    // section so this measures spacing only.
    t.send({ type: 'stance', unitIds: COLUMN, stance: 'standing' });
    const to = { x: -30, y: 34 };
    t.send({ type: 'move', unitIds: COLUMN, to, facing: { x: 1, y: 0 }, spacing: 5 }, 900);
    expectSpacing(gaps(COLUMN.map((id) => t.unit(id))), 5);
    const internal = t.engine as unknown as { units: Array<{ id: number; formationSpacing?: number }> };
    expect(internal.units.find((unit) => unit.id === COLUMN[0])!.formationSpacing).toBe(5);
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -30, y: 20 }, facing: { x: 1, y: 0 } }, 900);
    expect(internal.units.find((unit) => unit.id === COLUMN[0])!.formationSpacing).toBeUndefined();
    expectSpacing(gaps(COLUMN.map((id) => t.unit(id))), 2.8);
    // Close order: the line steps forward (east) and closes up.
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -18, y: 20 }, facing: { x: 1, y: 0 }, spacing: 1.5 }, 900);
    expectSpacing(gaps(COLUMN.map((id) => t.unit(id))), 1.5);
  });

  it('clamps the spacing and rejects one that is not a number', () => {
    const t = harness();
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -30, y: 34 }, spacing: 40 }, 2);
    const internal = t.engine as unknown as { units: Array<{ id: number; formationSpacing?: number }> };
    expect(internal.units.find((unit) => unit.id === COLUMN[0])!.formationSpacing).toBe(6);
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -30, y: 34 }, spacing: 0.2 }, 2);
    expect(internal.units.find((unit) => unit.id === COLUMN[0])!.formationSpacing).toBe(1.5);
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -30, y: 34 }, spacing: Number.NaN }, 2);
    expect(t.count('command_rejected')).toBe(1);
  });
});

describe('mechanics: stepping several ticks', () => {
  it('a multi-tick step keeps the shots of every tick it ran', () => {
    const one = harness({ training: false });
    const many = harness({ training: false });
    for (const t of [one, many]) {
      t.send({ type: 'attack', unitIds: COLUMN, targetId: ENEMY[0]! });
    }
    let single = 0;
    for (let index = 0; index < 40; index += 1) {
      single += one.engine.runTicks(1).events.filter((event) => event.type === 'shot').length;
    }
    let stepped = 0;
    for (let index = 0; index < 20; index += 1) {
      stepped += many.engine.runTicks(2).events.filter((event) => event.type === 'shot').length;
    }
    expect(single).toBeGreaterThan(0);
    expect(stepped).toBe(single);
  });
});

describe('mechanics: formation change while standing', () => {
  it('a standing section re-forms in place, keeping its front', () => {
    const t = harness();
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER, ...ENEMY], hold: true });
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -30, y: 34 }, facing: { x: 1, y: 0 } }, 900);
    const before = COLUMN.map((id) => t.unit(id));
    const centre = { x: before.reduce((s, u) => s + u.x, 0) / 5, y: before.reduce((s, u) => s + u.y, 0) / 5 };
    // A line facing east runs north-south; a column facing east runs east-west.
    expect(Math.max(...before.map((u) => u.y)) - Math.min(...before.map((u) => u.y))).toBeGreaterThan(8);
    t.send({ type: 'formation', unitIds: COLUMN, formation: 'column' }, 900);
    const after = COLUMN.map((id) => t.unit(id));
    expect(Math.max(...after.map((u) => u.y)) - Math.min(...after.map((u) => u.y))).toBeLessThan(1.5);
    expect(Math.max(...after.map((u) => u.x)) - Math.min(...after.map((u) => u.x))).toBeGreaterThan(8);
    const moved = { x: after.reduce((s, u) => s + u.x, 0) / 5, y: after.reduce((s, u) => s + u.y, 0) / 5 };
    expect(Math.hypot(moved.x - centre.x, moved.y - centre.y)).toBeLessThan(6);
    for (const unit of after) expect(unit.facingX).toBeGreaterThan(0.9);
  });
});

describe('mechanics: reaction to fire', () => {
  const columnHit = (t: ReturnType<typeof harness>) =>
    t.events.some((event) => event.type === 'shot' && COLUMN.includes(event.target));
  /** The legalists open fire on the column (it holds its own). */
  const underAttack = (t: ReturnType<typeof harness>) =>
    t.send({ type: 'attack', unitIds: ENEMY, targetId: COLUMN[0]! });

  it('an idle soldier reacts to the first shots, before he is suppressed', () => {
    const t = harness({ training: false });
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER], hold: true });
    underAttack(t);
    for (let index = 0; index < 200 && !columnHit(t); index += 1) t.run(1);
    expect(columnHit(t)).toBe(true);
    t.run(2);
    const shotAt = t.events.find((event) => event.type === 'shot' && COLUMN.includes(event.target)) as { target: number };
    // He reacts at once: crouches, or heads for a cover slot in reach (whose
    // stance he takes), while not yet suppressed.
    const shot = t.unit(shotAt.target);
    expect(shot.stance !== 'standing' || (shot.slotId ?? null) !== null).toBe(true);
    expect(shot.suppressed).toBe(false);
  });

  it('an aggressive soldier keeps his stance', () => {
    const t = harness({ training: false });
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER], hold: true });
    t.send({ type: 'posture', unitIds: COLUMN, posture: 'aggressive' });
    underAttack(t);
    for (let index = 0; index < 200 && !columnHit(t); index += 1) t.run(1);
    t.run(2);
    for (const id of COLUMN) expect(t.unit(id).stance).toBe('standing');
  });

  it('a soldier shot at from behind turns toward the shooter', () => {
    const t = harness({ training: false });
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER], hold: true });
    // Face the column south, away from the legalists to the north.
    t.send({ type: 'face', unitIds: COLUMN, to: { x: 0, y: 80 } }, 2);
    expect(t.unit(COLUMN[0]!).facingY).toBeGreaterThan(0.5);
    underAttack(t);
    for (let index = 0; index < 200 && !columnHit(t); index += 1) t.run(1);
    t.run(2);
    const shotAt = t.events.find((event) => event.type === 'shot' && COLUMN.includes(event.target)) as { target: number };
    expect(t.unit(shotAt.target).facingY).toBeLessThan(0);
  });

  it('a soldier on a move order keeps his path and stance under fire', () => {
    const t = harness({ training: false });
    t.send({ type: 'hold_fire', unitIds: [...COLUMN, OFFICER], hold: true });
    t.send({ type: 'move', unitIds: COLUMN, to: { x: -40, y: 40 } });
    underAttack(t);
    for (let index = 0; index < 200 && !columnHit(t); index += 1) t.run(1);
    t.run(2);
    for (const id of COLUMN) {
      if (!t.unit(id).alive) continue;
      expect(t.unit(id).stance).toBe('standing');
      expect(t.unit(id).order).toBe('move');
    }
  });
});

describe('mechanics: suppress keeps on the troop', () => {
  it('moves on to the next man of the squad, and ends when none is left', () => {
    const t = harness({ training: false });
    t.send({ type: 'suppress', unitIds: COLUMN, targetId: ENEMY[0]! }, 2);
    const enemies = t.engine.units.filter((unit) => ENEMY.includes(unit.id));
    enemies.find((unit) => unit.id === ENEMY[0])!.alive = false;
    t.run(1);
    const next = t.unit(COLUMN[0]!).targetId;
    expect(next).not.toBeNull();
    expect(ENEMY.slice(1)).toContain(next);
    for (const id of COLUMN) {
      expect(t.unit(id).targetId).toBe(next);
      expect(t.unit(id).order).toBe('suppress');
    }
    for (const unit of enemies) unit.alive = false;
    t.run(1);
    for (const id of COLUMN) expect(t.unit(id).order).not.toBe('suppress');
  });
});
