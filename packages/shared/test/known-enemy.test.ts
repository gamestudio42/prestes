import { describe, expect, it } from 'vitest';
import { nearestKnownEnemyAt, type Frame, type UnitSnapshot } from '../src';

// author-game-maps 3.6 follow-up: the HUD preview plans cover slots against
// the nearest enemy the side sees, as the simulation's orders do.
function unit(id: number, faction: UnitSnapshot['faction'], x: number, y: number): UnitSnapshot {
  return { id, faction, x, y, alive: true, incapacitated: false, routed: false, dummy: false } as UnitSnapshot;
}

function frame(seen: number[] | null): Frame {
  const units = [unit(1, 'column', 0, 0), unit(2, 'legalist', 0, -10), unit(3, 'legalist', 0, -40)];
  return {
    units,
    ...(seen ? { fog: true, seen: { column: seen, legalist: [] } } : {}),
  } as unknown as Frame;
}

describe('nearestKnownEnemyAt', () => {
  it('without fog, takes the nearest enemy', () => {
    expect(nearestKnownEnemyAt(frame(null), { x: 0, y: 0 }, 'column')?.id).toBe(2);
  });

  it('under fog, skips enemies the side does not see', () => {
    expect(nearestKnownEnemyAt(frame([3]), { x: 0, y: 0 }, 'column')?.id).toBe(3);
  });

  it('under fog with no enemy seen, has no threat', () => {
    expect(nearestKnownEnemyAt(frame([]), { x: 0, y: 0 }, 'column')).toBeNull();
  });
});
