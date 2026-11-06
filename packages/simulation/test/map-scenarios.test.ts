import { describe, expect, it } from 'vitest';
import { EYE_HEIGHTS, findPath, isLineBlocked, battleMap, type BattleMapId } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { updateVision } from '../src/systems/vision';

function battle(map: BattleMapId, seed = 1922) {
  return new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, battleMap: map });
}

/** Parks everyone far away, then sets one column soldier and the legalist west section. */
function sightTest(map: BattleMapId) {
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

describe('Fazenda', () => {
  it('hidden flank through the cane: a crouched section in the cane is not seen from the trench', () => {
    const t = sightTest('fazenda');
    // The west legalist section in its bays, facing south.
    t.observerSection.forEach((unit, index) => {
      unit.x = -53 + (index % 4) * 6;
      unit.y = -80;
      unit.facingX = 0;
      unit.facingY = 1;
      unit.stance = 'crouched';
    });
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

  it('open ground is dangerous: standing on the pasture within 120 m of the trench', () => {
    const t = sightTest('fazenda');
    t.observerSection.forEach((unit, index) => {
      unit.x = -53 + (index % 4) * 6;
      unit.y = -80;
      unit.facingX = 0;
      unit.facingY = 1;
    });
    t.scout.x = -20;
    t.scout.y = 10;
    t.scout.stance = 'standing';
    expect(t.look()).toBe(true);
  });
});

describe('Serra e Rio', () => {
  it('only three crossings: every path between the zones uses the ford, the bridge or the ferry', () => {
    const map = battleMap('serra-rio');
    const engine = battle('serra-rio');
    engine.selectTerrain();
    const crossings = [-150, 20, 130];
    for (const from of map.deployment.column.sections) {
      for (const to of map.deployment.legalist.sections) {
        const path = findPath(from, to, engine.covers);
        expect(path.length).toBeGreaterThan(0);
        // Where the path passes the river line, it is at a crossing.
        let previous = from;
        let crossedAt: number | null = null;
        for (const point of path) {
          if (previous.y > 0 && point.y <= 0) crossedAt = (previous.x + point.x) / 2;
          previous = point;
        }
        expect(crossedAt).not.toBeNull();
        expect(Math.min(...crossings.map((x) => Math.abs(crossedAt! - x)))).toBeLessThan(10);
      }
    }
  });

  it('hill blocks sight: the north-west hill hides one side from the other', () => {
    const engine = battle('serra-rio');
    engine.selectTerrain();
    expect(isLineBlocked(-90, -190, -90, -62, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(true);
    expect(isLineBlocked(160, -190, 160, -100, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(false);
  });

  it('search toward the right side: with nothing known the enemy crosses toward the column', () => {
    const engine = battle('serra-rio');
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

describe('Bairro', () => {
  it('streets are fire lanes', () => {
    const engine = battle('bairro');
    engine.selectTerrain();
    expect(isLineBlocked(-50, 36, 50, 36, engine.covers, [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(false);
    expect(isLineBlocked(0, 40, 0, 150, engine.covers, [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(false);
  });

  it('blocks break sight', () => {
    const engine = battle('bairro');
    engine.selectTerrain();
    expect(isLineBlocked(-90, 30, -90, -30, engine.covers, [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(true);
  });

  it('enemy takes its line: the legalist sections are in cover facing the column before contact', () => {
    const engine = battle('bairro');
    engine.runTicks(400);
    const legalists = engine.units.filter((unit) => unit.faction === 'legalist' && unit.alive);
    const covered = legalists.filter((unit) => unit.cover > 0.25);
    expect(covered.length).toBeGreaterThanOrEqual(legalists.length / 2);
    expect(legalists.every((unit) => unit.y < -60)).toBe(true);
    expect(legalists.filter((unit) => unit.facingY > 0.3).length).toBeGreaterThan(legalists.length / 2);
  });

  it('has no civilians', () => {
    const engine = battle('bairro');
    expect(engine.units.every((unit) => unit.faction === 'column' || unit.faction === 'legalist')).toBe(true);
  });
});

describe('every battle map', () => {
  it('starts 66 soldiers and fires no shot in the first 10 s', () => {
    for (const map of ['fazenda', 'serra-rio', 'bairro'] as const) {
      const engine = battle(map);
      expect(engine.units).toHaveLength(66);
      const frame = engine.runTicks(100);
      expect(frame.events.some((event) => event.type === 'shot')).toBe(false);
    }
  });

  it('is deterministic', () => {
    for (const map of ['fazenda', 'serra-rio', 'bairro'] as const) {
      expect(battle(map).runTicks(300).hash).toBe(battle(map).runTicks(300).hash);
    }
  });
});
