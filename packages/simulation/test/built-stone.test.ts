import { describe, expect, it } from 'vitest';
import { coverAgainst, terrainHeightAt, type BattleMap } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { hillside } from '../../shared/test/fixtures/hillside';

// revise-buildings-and-stone 4.2 (D5): soldiers take cover along a dry stone
// wall down a hillside, as along a granite one, and inside a stone corral.
function engineOn(map: BattleMap): SimulationEngine {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: map });
  engine.selectTerrain();
  return engine;
}

describe('built stone', () => {
  it('soldiers take cover along a dry stone wall down a hillside, in any rock kind', () => {
    const map = hillside('basalt');
    const engine = engineOn(map);
    expect(terrainHeightAt(0, 40) - terrainHeightAt(0, -40)).toBeGreaterThan(5);
    const granite = engineOn(hillside());
    for (let y = -36; y <= 36; y += 6) {
      // Crouched a metre behind the wall, a rifleman 50 m off on the far side.
      const behind = coverAgainst(-1, y, 50, y, 'crouched', engine.covers);
      expect(behind).toBeGreaterThanOrEqual(0.4);
      expect(behind).toBeGreaterThan(coverAgainst(-15, y, 50, y, 'crouched', engine.covers));
      expect(behind).toBe(coverAgainst(-1, y, 50, y, 'crouched', granite.covers));
    }
  });

  it('a man inside a stone corral has its wall between him and the enemy', () => {
    const map = hillside('sandstone');
    const engine = engineOn(map);
    const corral = (map.lines ?? []).filter((line) => line.kind === 'stone-wall' && line.points.some((point) => point.x > 50));
    expect(corral).toHaveLength(1);
    expect(corral[0]!.rock).toBe('sandstone');
    // Behind the back (-y) wall, the enemy beyond it.
    expect(coverAgainst(60, -4, 60, -60, 'crouched', engine.covers)).toBeGreaterThanOrEqual(0.4);
    // The gate in the front wall is open.
    expect(coverAgainst(60, 4, 60, 60, 'crouched', engine.covers)).toBeLessThan(0.4);
  });
});
