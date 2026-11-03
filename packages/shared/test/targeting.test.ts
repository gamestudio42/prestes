import { describe, expect, it } from 'vitest';
import { nearestTargetGroups } from '../src/targeting';

describe('nearest target groups', () => {
  it('assigns each attacker to its nearest living target', () => {
    const groups = nearestTargetGroups(
      [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 10, y: 0 },
        { id: 3, x: 0, y: 10 },
      ],
      [
        { id: 11, x: 1, y: 1 },
        { id: 12, x: 9, y: 1 },
      ],
    );
    expect(groups.get(11)).toEqual([1, 3]);
    expect(groups.get(12)).toEqual([2]);
  });

  it('returns no groups without targets', () => {
    expect(nearestTargetGroups([{ id: 1, x: 0, y: 0 }], [])).toEqual(new Map());
  });
});
