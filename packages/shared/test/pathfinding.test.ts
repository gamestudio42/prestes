import { describe, expect, it } from 'vitest';
import { findPath } from '../src/pathfinding';
import { BOOTCAMP_COVERS, isLineBlocked, isPointBlockedByCovers } from '../src/world';

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

  it('reaches an open destination whose grid cell lies in cover clearance', () => {
    // (6, 2.6) is open, but its 1 m cell (6, 3) is inside the clearance of the
    // training sandbag at (8, 4), and the straight line from the trench is blocked.
    const target = { x: 6, y: 2.6 };
    expect(isPointBlockedByCovers(target.x, target.y, BOOTCAMP_COVERS, 0.8)).toBe(false);
    const path = findPath({ x: 45.85, y: -17.87 }, target, BOOTCAMP_COVERS);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual(target);
  });
});
