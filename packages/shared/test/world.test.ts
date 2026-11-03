import { describe, expect, it } from 'vitest';
import {
  COVER_POINTS,
  coverAgainst,
  coverForStance,
  isLineBlocked,
  isPointBlockedByCovers,
  isPointInCover,
  firstSightBlocker,
  SIGHT_BLOCK_HEIGHT,
} from '../src/world';

describe('world cover and line of sight', () => {
  it('rotates cover footprints for point and line checks', () => {
    const cover = {
      id: 99,
      kind: 'sandbag' as const,
      x: 0,
      y: 0,
      halfWidth: 2,
      halfDepth: 0.5,
      height: 1,
      radius: 2,
      quality: 0.25,
      blocksMovement: true,
      blocksSight: false,
      rotation: Math.PI / 2,
    };
    expect(isPointInCover(0, 1.6, cover)).toBe(true);
    expect(isPointInCover(1.6, 0, cover)).toBe(false);
    expect(isPointBlockedByCovers(0, 1.6, [cover])).toBe(true);
  });
  it('raises cover with stance and protects only from the covered side', () => {
    expect(coverForStance('standing')).toBe(0);
    expect(coverForStance('crouched')).toBeGreaterThan(0);
    expect(coverForStance('prone')).toBeGreaterThan(coverForStance('crouched'));

    const point = COVER_POINTS[0]!;
    const behind = point.y - 1.4;
    expect(coverAgainst(point.x, behind, point.x, 20, 'standing')).toBe(0);
    expect(coverAgainst(point.x, behind, point.x, 20, 'crouched')).toBeGreaterThan(0);
    expect(coverAgainst(point.x, behind, point.x, 20, 'prone')).toBeGreaterThan(
      coverAgainst(point.x, behind, point.x, 20, 'crouched'),
    );
    expect(coverAgainst(point.x, behind, point.x, 20, 'prone')).toBeLessThanOrEqual(0.75);

    // Same wall, threat on the open side: no cover from the sandbag.
    expect(coverAgainst(point.x, behind, 20, behind, 'prone')).toBe(coverForStance('prone'));
  });

  it('blocks line of sight through a high wall, not through a sandbag', () => {
    expect(isLineBlocked(-7, 4, 7, 4)).toBe(true);
    expect(isLineBlocked(-8, 5.4, -8, 2.6)).toBe(false);
  });

  it('uses the person-height rule for sight and finds the first blocker', () => {
    expect(SIGHT_BLOCK_HEIGHT).toBe(1.75);
    const blocker = firstSightBlocker(-7, 4, 7, 4, COVER_POINTS);
    expect(blocker).not.toBeNull();
    expect(blocker?.x).toBeGreaterThan(-5);
    expect(blocker?.x).toBeLessThan(0);
    expect(
      firstSightBlocker(
        -7,
        4,
        7,
        4,
        [{ id: 99, x: 0, y: 4, halfWidth: 1, halfDepth: 1, height: 1.2 } as never],
      ),
    ).toBeNull();
    expect(
      firstSightBlocker(
        -7,
        4,
        7,
        4,
        [],
        [{ x: 0, y: 4, halfWidth: 1, halfDepth: 1, height: 1.9 }],
      ),
    ).not.toBeNull();
  });

  it('counts terrain and soldier stance in line of sight', () => {
    expect(firstSightBlocker(0, -5, 0, -14, [], [])).not.toBeNull();
    const lowCover = [{ id: 99, x: 0, y: 0, halfWidth: 2, halfDepth: 1, height: 0.9 }];
    expect(firstSightBlocker(-5, 0, 5, 0, [], lowCover, 1.6)).toBeNull();
    expect(firstSightBlocker(-5, 0, 5, 0, [], lowCover, 0.4)).not.toBeNull();
  });

  it('detects blocking cover and ignores low/empty ground', () => {
    expect(isPointBlockedByCovers(0, 4)).toBe(true);
    expect(isPointBlockedByCovers(10, 10)).toBe(false);
    expect(isPointBlockedByCovers(-15, -13)).toBe(false);
  });
});






