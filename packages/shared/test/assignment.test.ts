import { describe, expect, it } from 'vitest';
import { matchDestinations, minCostAssignment } from '../src/assignment';

const crosses = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }) => {
  const side = (p: typeof a, q: typeof a, r: typeof a) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
};

describe('destination matching', () => {
  it('solves a small assignment optimally', () => {
    expect(minCostAssignment([[4, 1, 3], [2, 0, 5], [3, 2, 2]])).toEqual([1, 0, 2]);
  });

  it('gives the left soldier the left slot and no routes cross', () => {
    // A line of 11 at y = 0 moves to a line of slots at y = -20 handed out in
    // reverse order; matching must undo the reversal.
    const soldiers = Array.from({ length: 11 }, (_, index) => ({ x: index * 2, y: 0 }));
    const slots = soldiers.map((_, index) => ({ x: 20 - index * 2.5, y: -20 }));
    const matched = matchDestinations(soldiers, slots);
    expect(matched[0]).toEqual({ x: -5, y: -20 });
    expect(matched[10]).toEqual({ x: 20, y: -20 });
    for (let a = 0; a < soldiers.length; a += 1) {
      for (let b = a + 1; b < soldiers.length; b += 1) {
        expect(crosses(soldiers[a]!, matched[a]!, soldiers[b]!, matched[b]!)).toBe(false);
      }
    }
  });

  it('is deterministic and keeps every destination once', () => {
    const soldiers = [{ x: 3, y: 1 }, { x: -2, y: 4 }, { x: 0, y: 0 }, { x: 5, y: -3 }];
    const slots = [{ x: 1, y: 9 }, { x: 4, y: 8 }, { x: -3, y: 7 }, { x: 0, y: 10 }];
    const first = matchDestinations(soldiers, slots);
    expect(matchDestinations(soldiers, slots)).toEqual(first);
    expect(new Set(first)).toEqual(new Set(slots));
  });
});
