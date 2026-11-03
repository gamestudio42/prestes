import { describe, expect, it } from 'vitest';
import {
  SANDBOX_TERRAIN,
  terrainCoverAgainst,
  terrainHeightAt,
  terrainSlopeAt,
  terrainSpeedFactor,
  terrainSurfaceAt,
} from '../src/terrain';

const ridge = SANDBOX_TERRAIN.find((feature) => feature.id === 'ridge');
const trench = SANDBOX_TERRAIN.find((feature) => feature.id === 'trench');

describe('sandbox terrain', () => {
  it('raises the ridge and lowers the trench', () => {
    expect(ridge).toBeDefined();
    expect(trench).toBeDefined();
    if (!ridge || !trench) throw new Error('missing terrain feature');
    expect(terrainHeightAt(ridge.x, ridge.y)).toBeCloseTo(ridge.height);
    expect(terrainHeightAt(trench.x, trench.y)).toBeCloseTo(-trench.height);
    expect(terrainHeightAt(ridge.x, ridge.y)).toBe(terrainHeightAt(ridge.x, ridge.y));
  });

  it('slows rough and steep ground and speeds the road', () => {
    if (!ridge) throw new Error('missing ridge');
    expect(terrainSlopeAt(ridge.x + ridge.radiusX / 2, ridge.y)).toBeGreaterThan(0);
    expect(terrainSpeedFactor(ridge.x + ridge.radiusX / 2, ridge.y)).toBeLessThan(1);
    expect(terrainSpeedFactor(12, -5)).toBeGreaterThan(terrainSpeedFactor(30, 30));
    expect(terrainSurfaceAt(12, -5)).toBe('road');
    expect(terrainSurfaceAt(30, 30)).toBe('grass');
  });

  it('gives ridge cover only from the protected side', () => {
    if (!ridge) throw new Error('missing ridge');
    const behind = terrainCoverAgainst(ridge.x, ridge.y + 4, ridge.x, -19);
    const onThreatSide = terrainCoverAgainst(ridge.x, ridge.y - 3, ridge.x, -19);
    expect(behind).toBeGreaterThan(0);
    expect(onThreatSide).toBe(0);
  });

  it('gives trench cover inside the trench', () => {
    if (!trench) throw new Error('missing trench');
    expect(terrainCoverAgainst(trench.x, trench.y, 0, -19)).toBeCloseTo(trench.cover);
  });
});


