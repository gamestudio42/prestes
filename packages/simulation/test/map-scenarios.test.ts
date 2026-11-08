import { describe, expect, it } from 'vitest';
import {
  EYE_HEIGHTS,
  battleMap,
  coverAgainst,
  coverSlots,
  findPath,
  isLineBlocked,
  isPointInCover,
  vegetationAt,
  type BattleMapId,
} from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { updateVision } from '../src/systems/vision';
import { revealShooter } from '../src/systems/concealment';
import { OPEN_STRETCH, openStretches } from '../../../tools/map-review';

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

  // refine-battle-maps 5.5: drainage ditches along the farm road (ids 2000 on).
  const ditches = () => battleMap('fazenda').covers.filter((cover) => cover.id >= 2000 && cover.kind === 'trench');

  it('cover in the ditch: a man prone in the road ditch is covered from the open field', () => {
    const engine = battle('fazenda');
    engine.selectTerrain();
    // The east ditch of the main road, between the lines.
    const ditch = ditches().find((cover) => cover.y > 40 && cover.y < 60 && cover.x > 22)!;
    expect(ditch).toBeDefined();
    // A rifleman on the pasture to the north-east, 60 m off.
    const threat = { x: ditch.x + 40, y: ditch.y - 45 };
    const inDitch = coverAgainst(ditch.x, ditch.y, threat.x, threat.y, 'prone', engine.covers);
    // The same man prone on the open pasture farther east.
    const inField = coverAgainst(ditch.x + 12, ditch.y, threat.x, threat.y, 'prone', engine.covers);
    expect(inField).toBe(0.5);
    expect(inDitch).toBe(0.75);
    // Crouched, he has a trench's shelter too.
    expect(coverAgainst(ditch.x, ditch.y, threat.x, threat.y, 'crouched', engine.covers)).toBeCloseTo(0.25 + 0.35);
    // Both sides of the main road for its whole length, every piece sheltering its whole floor.
    const main = ditches().filter((cover) => cover.id < 2200);
    for (const side of [1, -1]) {
      const run = main.filter((cover) => Math.sign(cover.x - 21) === side).sort((a, b) => a.y - b.y);
      expect(run[0]!.y).toBeLessThan(-195);
      expect(run.at(-1)!.y).toBeGreaterThan(195);
    }
    expect(main.every((cover) => cover.radius >= cover.halfWidth)).toBe(true);
  });

  it('slots along the ditch: a section defending at the roadside takes slots in the ditch', () => {
    const engine = battle('fazenda');
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
    const ditchSlots = new Set(ditches().flatMap((cover) => coverSlots(cover).map((slot) => slot.id)));
    const riflemen = section.filter((unit) => unit.alive && unit.kind !== 'officer');
    expect(riflemen.length).toBeGreaterThanOrEqual(8);
    expect(riflemen.filter((unit) => unit.slotId !== null && ditchSlots.has(unit.slotId)).length).toBe(riflemen.length);
    for (const unit of riflemen) {
      expect(ditches().some((cover) => isPointInCover(unit.x, unit.y, cover))).toBe(true);
    }
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

  // refine-battle-maps 5.11.
  it('grass by the river: most capim lies within 30 m of the river banks, none on the bridge', () => {
    const map = battleMap('serra-rio');
    const engine = battle('serra-rio');
    engine.selectTerrain();
    const river = map.water.find((area) => area.kind === 'deep')!.strip!;
    const fromBank = (x: number, y: number): number => {
      let best = Infinity;
      for (let index = 1; index < river.points.length; index += 1) {
        const a = river.points[index - 1]!;
        const b = river.points[index]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
        best = Math.min(best, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
      }
      return best - river.width / 2;
    };
    let capim = 0;
    let byTheBanks = 0;
    for (let x = -199; x < 200; x += 2) {
      for (let y = -199; y < 200; y += 2) {
        if (vegetationAt(x, y) !== 'tall-grass') continue;
        capim += 1;
        if (fromBank(x, y) <= 30) byTheBanks += 1;
      }
    }
    expect(capim).toBeGreaterThan(4000);
    expect(byTheBanks / capim).toBeGreaterThan(0.5);
    // Both banks at the ford and the bridge; by the ferry the column's bank
    // is cerrado scrub.
    for (const x of [-150, 20]) {
      expect(vegetationAt(x + 12, 30)).toBe('tall-grass');
      expect(vegetationAt(x + 12, -26)).toBe('tall-grass');
    }
    expect(vegetationAt(142, -26)).toBe('tall-grass');
    // Nothing grows on the bridge deck.
    for (const y of [-4, 0, 22, 24]) expect(vegetationAt(20, y)).toBeNull();
  });

  // refine-battle-maps 5.13: the bug of 2026-11-05, men in the capim by the
  // bridge shown to a line 117 m off by their own fire.
  it('a man firing from the capim by the bridge stays hidden at 117 m', () => {
    const t = sightTest('serra-rio');
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
    // Before the commander's quiet-field rule (30 s without a shot) sends his
    // sections looking for the enemy: at 400 ticks they had left the line.
    engine.runTicks(290);
    const legalists = engine.units.filter((unit) => unit.faction === 'legalist' && unit.alive);
    const covered = legalists.filter((unit) => unit.cover > 0.25);
    expect(covered.length).toBeGreaterThanOrEqual(legalists.length / 2);
    expect(legalists.every((unit) => unit.y < -60)).toBe(true);
    expect(legalists.filter((unit) => unit.facingY > 0.3).length).toBeGreaterThan(legalists.length / 2);
  });

  // refine-battle-maps 4.3: every quintal is entered by its side passage.
  it('every quintal can be reached from the street', () => {
    const engine = battle('bairro');
    engine.selectTerrain();
    const start = battleMap('bairro').deployment.column.sections[1]!;
    const yards = battleMap('bairro').yards ?? [];
    expect(yards.length).toBeGreaterThan(100);
    const closed = yards.filter((yard) => {
      const centre = {
        x: yard.reduce((sum, point) => sum + point.x, 0) / yard.length,
        y: yard.reduce((sum, point) => sum + point.y, 0) / yard.length,
      };
      const end = findPath(start, centre, engine.covers).at(-1);
      return !end || Math.hypot(end.x - centre.x, end.y - centre.y) > 2;
    });
    expect(closed).toEqual([]);
  }, 60_000);

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

  // refine-battle-maps 5.7 ("Fazenda is no longer open"): along five lanes of
  // the attack axis there is cover a man can reach at least every 60 m.
  it('Fazenda is no longer open, nor any battle map: no lane runs over 60 m without cover', () => {
    for (const map of ['fazenda', 'serra-rio', 'bairro'] as const) {
      const over = openStretches(battleMap(map)).filter((stretch) => stretch.longest > OPEN_STRETCH);
      expect(over, map).toEqual([]);
    }
  });
});
