import { describe, expect, it } from 'vitest';
import { EYE_HEIGHTS, battleMap, coverAgainst, coverSlots, findPath, isLineBlocked, isPointInCover, type BattleMap, type BattleMapId } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { updateVision } from '../src/systems/vision';
import { revealShooter } from '../src/systems/concealment';
import { OPEN_STRETCH, openStretches } from '../../../tools/map-review';
import { caneField, ditchedRoad, grassField } from './open-field';

// author-game-maps 3.1: the ground scenarios once tied to the Fazenda, Serra e
// Rio and Bairro run on the test map or on small maps built in code.

const TEST_MAP = 'campo-de-provas';

function battle(map: BattleMapId | BattleMap, seed = 1922) {
  return new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, battleMap: map });
}

/** Parks everyone far away, then sets one column soldier and the legalist west section. */
function sightTest(map: BattleMapId | BattleMap) {
  const engine = battle(map);
  for (const unit of engine.units) {
    unit.x = -190 + (unit.id % 11) * 2;
    unit.y = unit.faction === 'column' ? 190 : -190;
  }
  const observerSection = engine.units.filter((unit) => unit.squadId === 11);
  const scout = engine.units.find((unit) => unit.faction === 'column')!;
  const look = () => {
    engine.selectTerrain();
    updateVision(engine, 2);
    return engine.vision.seen.legalist.has(scout.id);
  };
  return { engine, observerSection, scout, look };
}

describe('tall crops', () => {
  const facingSouth = (t: ReturnType<typeof sightTest>, stance: 'crouched' | 'standing') =>
    t.observerSection.forEach((unit, index) => {
      unit.x = -53 + (index % 4) * 6;
      unit.y = -80;
      unit.facingX = 0;
      unit.facingY = 1;
      unit.stance = stance;
    });

  it('hidden flank through the cane: a crouched man in the cane is not seen from the line', () => {
    const t = sightTest(caneField());
    facingSouth(t, 'crouched');
    t.scout.stance = 'crouched';
    for (const [x, y] of [
      [-70, 20],
      [-75, -20],
      [-62, -52],
    ] as const) {
      t.scout.x = x;
      t.scout.y = y;
      expect(t.look()).toBe(false);
    }
    // Out of the cane's edge rows, in the open, he is seen.
    t.scout.x = -50;
    t.scout.y = -66;
    expect(t.look()).toBe(true);
  });

  it('open ground is dangerous: standing in the open within 120 m of the line', () => {
    const t = sightTest(caneField());
    facingSouth(t, 'standing');
    t.scout.x = -20;
    t.scout.y = 10;
    t.scout.stance = 'standing';
    expect(t.look()).toBe(true);
  });
});

describe('road ditches', () => {
  const ditches = (map: BattleMap) => map.covers.filter((cover) => cover.ditch);

  it('cover in the ditch: a man prone in the road ditch is covered from the open field', () => {
    const map = ditchedRoad();
    const engine = battle(map);
    engine.selectTerrain();
    // The east ditch, between the lines.
    const ditch = ditches(map).find((cover) => cover.y > 40 && cover.y < 60 && cover.x > 22)!;
    expect(ditch).toBeDefined();
    // A rifleman in the open to the north-east, 60 m off.
    const threat = { x: ditch.x + 40, y: ditch.y - 45 };
    const inDitch = coverAgainst(ditch.x, ditch.y, threat.x, threat.y, 'prone', engine.covers);
    // The same man prone in the open farther east.
    const inField = coverAgainst(ditch.x + 12, ditch.y, threat.x, threat.y, 'prone', engine.covers);
    expect(inField).toBe(0.5);
    expect(inDitch).toBe(0.75);
    // Crouched, he has a trench's shelter too.
    expect(coverAgainst(ditch.x, ditch.y, threat.x, threat.y, 'crouched', engine.covers)).toBeCloseTo(0.25 + ditch.quality);
    // Both sides of the road for its whole length, every piece sheltering its whole floor.
    for (const side of [1, -1]) {
      const run = ditches(map).filter((cover) => Math.sign(cover.x - 21) === side).sort((a, b) => a.y - b.y);
      expect(run[0]!.y).toBeLessThan(-185);
      expect(run.at(-1)!.y).toBeGreaterThan(185);
    }
    expect(ditches(map).every((cover) => cover.radius >= cover.halfWidth)).toBe(true);
  });

  it('slots along the ditch: a section defending at the roadside takes slots in the ditch', () => {
    const map = ditchedRoad();
    const engine = battle(map);
    engine.runTicks(1);
    const section = engine.units.filter((unit) => unit.faction === 'column' && unit.squadId === 3 && unit.alive);
    section.forEach((unit, index) => {
      unit.x = 12 + (index % 4) * 1.5;
      unit.y = 64 + Math.floor(index / 4) * 1.5;
      unit.targetX = unit.x;
      unit.targetY = unit.y;
      unit.path = [];
    });
    engine.enqueue({ type: 'order', order: 'defend', unitIds: section.map((unit) => unit.id), to: { x: 20.7, y: 55 } });
    engine.runTicks(300);
    const ditchSlots = new Set(ditches(map).flatMap((cover) => coverSlots(cover).map((slot) => slot.id)));
    const riflemen = section.filter((unit) => unit.alive && unit.kind !== 'officer');
    expect(riflemen.length).toBeGreaterThanOrEqual(8);
    expect(riflemen.filter((unit) => unit.slotId !== null && ditchSlots.has(unit.slotId)).length).toBe(riflemen.length);
    for (const unit of riflemen) expect(ditches(map).some((cover) => isPointInCover(unit.x, unit.y, cover))).toBe(true);
  });
});

describe('the test map ground', () => {
  it('crossings: every path between the zones crosses the stream at the ford or the bridge', () => {
    const map = battleMap(TEST_MAP);
    const engine = battle(TEST_MAP);
    engine.selectTerrain();
    for (const from of map.deployment.column.sections) {
      for (const to of map.deployment.legalist.sections) {
        const path = findPath(from, to, engine.covers);
        expect(path.length).toBeGreaterThan(0);
        // Where the path passes the stream's line (y about 5), it is at a crossing.
        let previous = from;
        let crossedAt: number | null = null;
        for (const point of path) {
          if (previous.y > 5 && point.y <= 5) crossedAt = previous.x + ((point.x - previous.x) * (previous.y - 5)) / (previous.y - point.y);
          previous = point;
        }
        expect(crossedAt).not.toBeNull();
        const atFord = crossedAt! >= -72 && crossedAt! <= -40;
        const atBridge = Math.abs(crossedAt! - 60) < 3;
        expect(atFord || atBridge, `crossed at ${crossedAt}`).toBe(true);
      }
    }
  });

  it('a hill blocks sight: the 6 m rise on the east flank hides one side of it from the other', () => {
    battle(TEST_MAP).selectTerrain();
    expect(isLineBlocked(165, -60, 165, 40, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(true);
    expect(isLineBlocked(-110, -60, -110, 40, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(false);
  });

  it('search toward the right side: with nothing known the enemy crosses toward the column', () => {
    const engine = battle(TEST_MAP);
    // The deployment is fixed on the first tick; then the column slips away
    // to the far south-east corner, so the enemy knows nothing of it.
    engine.runTicks(1);
    for (const unit of engine.units) {
      if (unit.faction !== 'column') continue;
      unit.x = 170 + (unit.id % 6) * 2;
      unit.y = 180 + Math.floor((unit.id % 33) / 6) * 2;
      unit.targetX = unit.x;
      unit.targetY = unit.y;
    }
    let crossed = false;
    for (let step = 0; step < 60 && !crossed; step += 1) {
      engine.runTicks(100);
      crossed = engine.units.some((unit) => unit.faction === 'legalist' && unit.alive && unit.y > 20);
    }
    expect(crossed).toBe(true);
  });
});

// refine-battle-maps 5.13: the bug of 2026-11-05, men in the capim shown to a
// line 117 m off by their own fire.
describe('tall grass', () => {
  it('a man firing from the capim stays hidden at 117 m', () => {
    const t = sightTest(grassField());
    const observer = t.observerSection[0]!;
    observer.x = 32;
    observer.y = 34 - 117;
    observer.facingX = 0;
    observer.facingY = 1;
    t.scout.x = 32;
    t.scout.y = 34;
    t.scout.stance = 'standing';
    expect(t.look()).toBe(true);
    t.scout.stance = 'prone';
    expect(t.look()).toBe(false);
    revealShooter(t.engine, t.scout, t.engine.tickCount);
    expect(t.look()).toBe(false);
    // From 40 m his shot gives him away.
    observer.y = 34 - 40;
    expect(t.look()).toBe(true);
  });
});

describe('the test map battle', () => {
  it('starts 66 soldiers, no civilians, and fires no shot in the first 10 s', () => {
    const engine = battle(TEST_MAP);
    expect(engine.units).toHaveLength(66);
    expect(engine.units.every((unit) => unit.faction === 'column' || unit.faction === 'legalist')).toBe(true);
    const frame = engine.runTicks(100);
    expect(frame.events.some((event) => event.type === 'shot')).toBe(false);
  });

  it('is deterministic', () => {
    expect(battle(TEST_MAP).runTicks(300).hash).toBe(battle(TEST_MAP).runTicks(300).hash);
  });

  // refine-battle-maps 5.7: along five lanes of the attack axis there is cover a man can reach at least every 60 m.
  it('no lane runs over 60 m without cover', () => {
    const over = openStretches(battleMap(TEST_MAP)).filter((stretch) => stretch.longest > OPEN_STRETCH);
    expect(over).toEqual([]);
  });
});
