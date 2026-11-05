import { describe, expect, it } from 'vitest';
import { closeQuartersFactor, coverAgainst, type CoverPoint } from '../src';

// battle-feel-3v3: cover loses its value at close quarters.
const TRENCH: CoverPoint = {
  id: 1,
  kind: 'trench',
  x: 100,
  y: 100,
  halfWidth: 7,
  halfDepth: 2.8,
  height: 0.2,
  radius: 3,
  quality: 0.4,
  blocksMovement: false,
  blocksSight: false,
};

/**
 * The trench's own share of the cover of a crouched defender at its centre,
 * against a shooter offset from him (clear of the sandbox terrain features).
 */
const trenchCover = (offset: { x: number; y: number }) =>
  coverAgainst(100, 100, 100 + offset.x, 100 + offset.y, 'crouched', [TRENCH]) -
  coverAgainst(100, 100, 100 + offset.x, 100 + offset.y, 'crouched', []);

describe('close-quarters cover', () => {
  it('falls from full value at 20 m to a third inside 10 m', () => {
    expect(closeQuartersFactor(60)).toBe(1);
    expect(closeQuartersFactor(20)).toBe(1);
    expect(closeQuartersFactor(15)).toBeCloseTo(2 / 3);
    expect(closeQuartersFactor(10)).toBeCloseTo(1 / 3);
    expect(closeQuartersFactor(2)).toBeCloseTo(1 / 3);
  });

  it('a trench gives at most a third of its cover against a shooter 6 m from the parapet', () => {
    const far = trenchCover({ x: 0, y: -62.8 });
    const near = trenchCover({ x: 0, y: -8.8 });
    expect(far).toBeGreaterThan(0.3);
    expect(near).toBeLessThanOrEqual(far / 3 + 1e-9);
  });

  it('gives no cover against a shooter inside the same trench', () => {
    expect(trenchCover({ x: 5, y: 0.5 })).toBeCloseTo(0);
  });
});

describe('cover against long-range fire', () => {
  it('counts a parapet 2 m in front even when the shooter is 160 m away', () => {
    const parapet: CoverPoint = { ...TRENCH, id: 2, kind: 'sandbag', y: 101.9, halfDepth: 0.4, height: 0.9, radius: 3.5, quality: 0.3 };
    const open = coverAgainst(100.7, 100, 99.8, 268, 'crouched', []);
    expect(coverAgainst(100.7, 100, 99.8, 268, 'crouched', [parapet])).toBeGreaterThan(open + 0.25);
  });
});
