import { describe, expect, it } from 'vitest';
import { coverAgainst, type BattleMap } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { fences } from '../../shared/test/fixtures/fences';

// revise-buildings-and-stone 5.3: an adobe or coped wall covers as a wall of
// its height; a rail fence or an iron railing gives none; an open gate gives
// none and is walked through.
function engineOn(map: BattleMap): SimulationEngine {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: map });
  engine.selectTerrain();
  return engine;
}

describe('fences and walls cover', () => {
  it('soldiers take cover behind an adobe wall and a coped wall', () => {
    const engine = engineOn(fences(['adobe-wall', 'coped-wall']));
    for (const x of [-60, -45]) {
      for (let y = -30; y <= 30; y += 10) {
        const behind = coverAgainst(x - 1, y, x + 50, y, 'crouched', engine.covers);
        expect(behind).toBeGreaterThanOrEqual(0.4);
      }
    }
  });

  it('a rail fence and an iron railing give no cover', () => {
    const engine = engineOn(fences(['rail-fence', 'iron-railing']));
    // No better than crouching in the open, 7 m off the fence.
    for (const x of [-60, -45]) {
      for (let y = -30; y <= 30; y += 10) expect(coverAgainst(x - 1, y, x + 50, y, 'crouched', engine.covers)).toBe(coverAgainst(x - 7, y, x + 50, y, 'crouched', engine.covers));
    }
  });

  it('a bamboo or wattle fence hides a man but gives no cover', () => {
    const map = fences(['bamboo-fence', 'wattle-fence']);
    const lineCovers = map.covers.filter((cover) => cover.kind === 'fence');
    expect(lineCovers.length).toBeGreaterThan(0);
    expect(lineCovers.every((cover) => cover.blocksSight && cover.quality === 0)).toBe(true);
  });

  it('an open gate gives no cover and blocks no one', () => {
    const map = fences([]);
    expect(map.covers).toHaveLength(0);
    expect(map.props.map((prop) => prop.model).sort()).toEqual(['farm-gate', 'iron-gate', 'rail-gate', 'yard-gate']);
    expect(map.sightObstacles).toHaveLength(0);
    expect(map.buildings).toHaveLength(0);
    // Crouched at a gate, as in the open.
    const engine = engineOn(map);
    expect(coverAgainst(-45, -61, -45, -20, 'crouched', engine.covers)).toBe(coverAgainst(-45, -61, -45, -20, 'crouched', []));
  });
});
