import { afterEach, describe, expect, it } from 'vitest';
import { findPath, isWalkable, nearestWalkable } from '../src/pathfinding';
import { bakeMap, isDeepWater, MAP_BOUNDS, PATH_GRID, setActiveMapRuntime, waterAt } from '../src/maps/runtime';
import { setActiveMap, validateBattleMap, VILA_MILITAR, type BattleMap } from '../src/maps';
import { coverAgainst, EYE_HEIGHTS, isLineBlocked } from '../src/world';
import { RIDGE_COVER, terrainHeightAt, terrainSlopeAt, terrainSpeedFactor, terrainSurfaceAt } from '../src/terrain';
import { TEST_MAP } from './fixtures/test-map';

afterEach(() => setActiveMap(VILA_MILITAR));

describe('map bounds and pathfinding', () => {
  it('feature maps keep the old extents', () => {
    setActiveMap(VILA_MILITAR);
    expect(MAP_BOUNDS).toEqual({ minX: -120, minY: -120, maxX: 120, maxY: 120 });
    expect(PATH_GRID).toEqual({ min: -100, max: 100 });
  });

  it('a battle map sets its own bounds and grid', () => {
    setActiveMap(TEST_MAP);
    expect(MAP_BOUNDS).toEqual(TEST_MAP.bounds);
    expect(PATH_GRID).toEqual({ min: -200, max: 200 });
  });

  it('reaches a far corner of a 400 m map', () => {
    setActiveMap(TEST_MAP);
    const path = findPath({ x: -150, y: 150 }, { x: -190, y: 190 }, []);
    expect(path.at(-1)).toEqual({ x: -190, y: 190 });
    const across = findPath({ x: 150, y: -150 }, { x: -185, y: 185 }, []);
    expect(across.at(-1)).toEqual({ x: -185, y: 185 });
  });

  it('deep water is not walkable and snaps to the bank', () => {
    setActiveMap(TEST_MAP);
    expect(isDeepWater(60, 0)).toBe(true);
    expect(isWalkable(60, 0, [])).toBe(false);
    expect(findPath({ x: 60, y: 30 }, { x: 60, y: 0 }, [])).toEqual([]);
    const bank = nearestWalkable({ x: 60, y: 2 }, []);
    expect(bank).not.toBeNull();
    expect(isDeepWater(bank!.x, bank!.y)).toBe(false);
    expect(Math.abs(bank!.y)).toBeGreaterThan(8);
  });

  it('only three crossings: every path over the river uses the ford, the bridge or the ferry', () => {
    setActiveMap(TEST_MAP);
    for (const [from, to] of [
      [{ x: -60, y: 60 }, { x: -60, y: -60 }],
      [{ x: 60, y: 60 }, { x: 60, y: -60 }],
      [{ x: 160, y: 30 }, { x: 160, y: -30 }],
    ] as const) {
      const path = findPath(from, to, []);
      expect(path.length).toBeGreaterThan(0);
      let previous: { x: number; y: number } = from;
      let crossedAt: number | null = null;
      for (const point of path) {
        if (Math.sign(previous.y) !== Math.sign(point.y)) crossedAt = (previous.x + point.x) / 2;
        previous = point;
      }
      expect(crossedAt).not.toBeNull();
      // The ford is at x = -120, the bridge at x = 0, the ferry at x = 120.
      expect(Math.min(Math.abs(crossedAt! + 120), Math.abs(crossedAt!), Math.abs(crossedAt! - 120))).toBeLessThan(8);
    }
  });

  it('bounds stop paths outside the map', () => {
    setActiveMap(TEST_MAP);
    expect(findPath({ x: 0, y: 150 }, { x: 0, y: 260 }, [])).toEqual([]);
  });
});

describe('heightfield', () => {
  it('hill is high ground and the river bed is low', () => {
    setActiveMap(TEST_MAP);
    expect(terrainHeightAt(60, -110)).toBeGreaterThan(12);
    expect(terrainHeightAt(60, 0)).toBeLessThan(-2);
    expect(terrainHeightAt(-150, 150)).toBe(0);
  });

  it('samples smoothly', () => {
    setActiveMap(TEST_MAP);
    const runtime = bakeMap(TEST_MAP);
    for (const [x, y] of [
      [50, -95],
      [70, -130],
      [33.3, -101.7],
      [5, 8],
    ] as const) {
      const delta = Math.abs(terrainHeightAt(x, y) - terrainHeightAt(x + 0.1, y));
      expect(delta).toBeLessThanOrEqual(runtime.steepest * 0.1 + 1e-6);
    }
  });

  it('bakes the same numbers every time', () => {
    const first = bakeMap(TEST_MAP);
    const second = bakeMap(TEST_MAP);
    expect(Array.from(first.heights)).toEqual(Array.from(second.heights));
    expect(Array.from(first.vegetation)).toEqual(Array.from(second.vegetation));
  });

  it('the bridge deck and the ford bed are above the water', () => {
    setActiveMap(TEST_MAP);
    expect(terrainHeightAt(0, 0)).toBeCloseTo(TEST_MAP.waterLevel + 1.6, 5);
    expect(terrainHeightAt(-120, 0)).toBeGreaterThanOrEqual(TEST_MAP.waterLevel - 0.46);
    expect(waterAt(-120, 0)).toBe(1);
    expect(waterAt(0, 0)).toBe(0);
  });
});

describe('surfaces and speeds', () => {
  it('reads the surface grid', () => {
    setActiveMap(TEST_MAP);
    expect(terrainSurfaceAt(-150, 150)).toBe('pasture');
    expect(terrainSurfaceAt(0, 150)).toBe('dirt-road');
    expect(terrainSurfaceAt(-120, 0)).toBe('ford');
    expect(terrainSurfaceAt(0, 0)).toBe('bridge');
  });

  it('applies the surface speed table', () => {
    setActiveMap(TEST_MAP);
    expect(terrainSpeedFactor(-150, 150)).toBeCloseTo(1, 5);
    expect(terrainSpeedFactor(0, 150)).toBeCloseTo(1.15, 5);
    expect(terrainSpeedFactor(-120, 0)).toBeLessThanOrEqual(0.5);
  });

  it('slope still slows', () => {
    setActiveMap(TEST_MAP);
    expect(terrainSlopeAt(60, -90)).toBeGreaterThan(0.1);
    expect(terrainSpeedFactor(60, -90)).toBeLessThan(1);
  });

  it('clears the runtime', () => {
    setActiveMapRuntime(TEST_MAP);
    setActiveMapRuntime(null);
    expect(isDeepWater(60, 0)).toBe(false);
  });
});

describe('map validation', () => {
  it('passes the catalog and the test map', () => {
    expect(validateBattleMap(VILA_MILITAR)).toEqual([]);
    expect(validateBattleMap(TEST_MAP)).toEqual([]);
  });

  it('fails a broken map', () => {
    const broken: BattleMap = {
      ...TEST_MAP,
      deployment: {
        column: { sections: [{ x: 0, y: 0 }, { x: 0, y: 260 }], facing: { x: 0, y: -1 } },
        legalist: { sections: [{ x: -44, y: 60 }, { x: 0, y: 60 }, { x: 44, y: 60 }], facing: { x: 0, y: 1 } },
      },
    };
    const errors = validateBattleMap(broken);
    expect(errors.some((error) => error.includes('2 sections'))).toBe(true);
    expect(errors.some((error) => error.includes('leaves the bounds'))).toBe(true);
    expect(errors.some((error) => error.includes('not on walkable ground'))).toBe(true);
    expect(errors.some((error) => error.includes('apart'))).toBe(true);
  });
});

describe('terrain blocks sight and fire', () => {
  it('behind the crest: a prone man behind a fold is hidden', () => {
    setActiveMap(TEST_MAP);
    expect(isLineBlocked(0, 100, 0, 174.5, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.prone)).toBe(true);
    expect(coverAgainst(0, 174.5, 0, 100, 'prone', [])).toBeGreaterThanOrEqual(RIDGE_COVER);
  });

  it('over the crest: standing up, he is seen', () => {
    setActiveMap(TEST_MAP);
    expect(isLineBlocked(0, 100, 0, 174.5, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(false);
  });

  it('a hill hides what is behind it', () => {
    setActiveMap(TEST_MAP);
    expect(isLineBlocked(60, -160, 60, -60, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(true);
    expect(isLineBlocked(160, -160, 160, -60, [], [], EYE_HEIGHTS.standing, EYE_HEIGHTS.standing)).toBe(false);
  });
});
