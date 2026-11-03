import { describe, expect, it } from 'vitest';
import { findPath } from '../src/pathfinding';
import { isLineBlocked, isPointBlockedByCovers } from '../src/world';

describe('findPath', () => {
  it('returns the destination directly when the line is clear', () => {
    const path = findPath({ x: -12, y: 7 }, { x: -12, y: 3 });
    expect(path).toEqual([{ x: -12, y: 3 }]);
  });

  it('detours around blocking cover', () => {
    const path = findPath({ x: -7, y: 7 }, { x: 7, y: -7 });
    expect(path.length).toBeGreaterThan(1);
    expect(
      path.every((point) => !isPointBlockedByCovers(point.x, point.y, undefined, 0.8)),
    ).toBe(true);
    expect(isLineBlocked(-7, 4, 7, 4)).toBe(true);
  });

  it('returns no path when the destination is inside blocking cover', () => {
    expect(findPath({ x: -7, y: 7 }, { x: 0, y: 4 })).toEqual([]);
  });
});
