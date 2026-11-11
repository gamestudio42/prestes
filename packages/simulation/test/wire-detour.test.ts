import { describe, expect, it } from 'vitest';
import { isLineBlockedForMovement, isLineOnWire, planOrderPreview, type CoverPoint, type SimEvent, type Vec2 } from '@prestes/shared';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';
import { SimulationEngine } from '../src';

// route-around-wire: a section takes a near gap in barbed wire and crosses
// only when the way round is far.
const WIRE = { halfDepth: 0.2, height: 1.2, radius: 0.5, quality: 0, blocksSight: false };

/** A wire fence 5 m in front of the section, along x, with a 10 m gap centred `gapAt` m to the side. */
function battle(gapAt: number) {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
  const ids = engine.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1).map((unit) => unit.id);
  const men = engine.units.filter((unit) => unit.squadId === 1);
  const start = {
    x: men.reduce((sum, unit) => sum + unit.x, 0) / men.length,
    y: men.reduce((sum, unit) => sum + unit.y, 0) / men.length,
  };
  const fenceY = start.y - 5;
  // Two pieces from 100 m either side, leaving x from start.x + gapAt - 5 to + 5 open.
  const left = start.x + gapAt - 5;
  const right = start.x + gapAt + 5;
  const west = start.x - 100;
  const east = start.x + 100;
  engine.covers.push(
    { id: 99998, kind: 'fence', x: (west + left) / 2, y: fenceY, halfWidth: (left - west) / 2, blocksMovement: true, wire: true, ...WIRE },
    { id: 99999, kind: 'fence', x: (right + east) / 2, y: fenceY, halfWidth: (east - right) / 2, blocksMovement: true, wire: true, ...WIRE },
  );
  const events: SimEvent[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) events.push(...engine.tick().events);
  };
  const wireHits = () =>
    events.filter(
      (event): event is Extract<SimEvent, { type: 'unit_hit' }> =>
        event.type === 'unit_hit' && ids.includes(event.unitId) && event.damage === 3,
    );
  return { engine, ids, start, fenceY, run, wireHits };
}

describe('routes round barbed wire', () => {
  it('a near gap is taken: the section goes through it and nobody is hurt', () => {
    const { engine, ids, start, fenceY, run, wireHits } = battle(0);
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x, y: start.y - 20 } });
    run(400);
    expect(wireHits()).toEqual([]);
    const men = engine.units.filter((unit) => ids.includes(unit.id));
    expect(men.every((unit) => unit.y < fenceY - 1)).toBe(true);
  });

  it('a far gap is not taken: the section crosses, each man hurt once', () => {
    const { engine, ids, start, fenceY, run, wireHits } = battle(50);
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x, y: start.y - 20 } });
    run(400);
    const hits = wireHits();
    expect(hits.length).toBeGreaterThanOrEqual(ids.length - 1);
    for (const id of new Set(hits.map((hit) => hit.unitId))) {
      expect(hits.filter((hit) => hit.unitId === id)).toHaveLength(1);
    }
    const men = engine.units.filter((unit) => ids.includes(unit.id));
    expect(men.every((unit) => unit.y < fenceY - 1)).toBe(true);
    // Nobody walked to the gap.
    expect(men.every((unit) => Math.abs(unit.x - start.x) < 30)).toBe(true);
  });
});

describe('the drawn order follows a re-route', () => {
  it('a soldier who meets a wall on the way keeps his order on the new route', () => {
    const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
    const soldier = engine.units.find((unit) => unit.faction === 'column' && unit.squadId === 1)!;
    const goal = { x: soldier.x, y: soldier.y - 30 };
    engine.enqueue({ type: 'move', unitIds: [soldier.id], to: goal });
    for (let index = 0; index < 20; index += 1) engine.tick();
    const before = engine.orders.find((order) => order.unitIds.includes(soldier.id))!;
    expect(before.points.at(-1)).toEqual(goal);
    expect(before.points).toHaveLength(2);
    // A wall across his way, 4 m ahead.
    engine.covers.push({
      id: 99997, kind: 'low-wall', x: soldier.x, y: soldier.y - 4, halfWidth: 6, halfDepth: 0.3, height: 1.2,
      radius: 7, quality: 0.4, blocksMovement: true, blocksSight: false,
    });
    for (let index = 0; index < 60; index += 1) engine.tick();
    const after = engine.orders.find((order) => order.unitIds.includes(soldier.id))!;
    expect(after.points.length).toBeGreaterThan(2);
    expect(after.points.at(-1)).toEqual(goal);
    // The new route goes round the wall's end.
    expect(after.points.some((point) => Math.abs(point.x - goal.x) > 5)).toBe(true);
  });
});

/** The legs of a drawn or walked route that enter wire. */
function wireLegs(points: readonly Vec2[], covers: readonly CoverPoint[]): number {
  let count = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    if (isLineOnWire(from.x, from.y, to.x, to.y, covers, 0)) count += 1;
  }
  return count;
}

describe('the move preview draws the searched route', () => {
  const preview = (engine: SimulationEngine, ids: number[], to: Vec2) => {
    const frame = engine.runTicks(1);
    return { frame, plan: planOrderPreview({ frame, unitIds: ids, order: 'move', to, fast: true })! };
  };

  it('bends through a near gap and crosses no wire', () => {
    const { engine, ids, start } = battle(0);
    const { frame, plan } = preview(engine, ids, { x: start.x, y: start.y - 20 });
    expect(plan.paths).toHaveLength(ids.length);
    for (const path of plan.paths) expect(wireLegs(path.points, frame.covers)).toBe(0);
    // Not straight lines: a soldier off the gap is drawn bending to it.
    expect(plan.paths.some((path) => path.points.length > 2)).toBe(true);
  });

  it('crosses a far-gapped fence where the move crosses it', () => {
    const { engine, ids, start } = battle(50);
    const to = { x: start.x, y: start.y - 20 };
    const { frame, plan } = preview(engine, ids, to);
    for (const path of plan.paths) expect(wireLegs(path.points, frame.covers)).toBeGreaterThan(0);
    engine.enqueue({ type: 'move', unitIds: ids, to });
    engine.tick();
    for (const path of plan.paths) {
      const order = engine.orders.find((candidate) => candidate.unitIds.includes(path.unitId))!;
      expect(order.points).toHaveLength(path.points.length);
      order.points.forEach((point, index) => {
        expect(point.x).toBeCloseTo(path.points[index]!.x, 1);
        expect(point.y).toBeCloseTo(path.points[index]!.y, 1);
      });
    }
  });

  it('bends round a building in the way', () => {
    const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
    const ids = engine.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1).map((unit) => unit.id);
    const men = engine.units.filter((unit) => ids.includes(unit.id));
    const start = { x: men.reduce((sum, unit) => sum + unit.x, 0) / men.length, y: men.reduce((sum, unit) => sum + unit.y, 0) / men.length };
    engine.covers.push({
      id: 99996, kind: 'building', x: start.x, y: start.y - 12, halfWidth: 8, halfDepth: 4, height: 4,
      radius: 9, quality: 0.6, blocksMovement: true, blocksSight: true,
    });
    const { frame, plan } = preview(engine, ids, { x: start.x, y: start.y - 30 });
    for (const path of plan.paths) {
      expect(path.points.length).toBeGreaterThan(2);
      for (let index = 1; index < path.points.length; index += 1) {
        const from = path.points[index - 1]!;
        const to = path.points[index]!;
        expect(isLineBlockedForMovement(from.x, from.y, to.x, to.y, frame.covers, 0)).toBe(false);
      }
    }
  });
});

describe('several sections ordered together', () => {
  it('each section marches as a body on the route the preview drew', () => {
    const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
    const ids = engine.units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
    const men = engine.units.filter((unit) => ids.includes(unit.id));
    const to = { x: men.reduce((sum, unit) => sum + unit.x, 0) / men.length, y: men.reduce((sum, unit) => sum + unit.y, 0) / men.length - 40 };
    const frame = engine.runTicks(1);
    const plan = planOrderPreview({ frame, unitIds: ids, order: 'move', to, fast: true })!;
    engine.enqueue({ type: 'move', unitIds: ids, to });
    engine.tick();
    expect(new Set(men.map((unit) => unit.squadId)).size).toBeGreaterThan(1);
    for (const path of plan.paths) {
      const order = engine.orders.find((candidate) => candidate.unitIds.includes(path.unitId))!;
      expect(order.points.map((point) => [point.x.toFixed(1), point.y.toFixed(1)])).toEqual(
        path.points.map((point) => [point.x.toFixed(1), point.y.toFixed(1)]),
      );
    }
  });
});
