import { describe, expect, it } from 'vitest';
import { hasSuspectedContact, pickSuspectedContact } from '../../apps/game/src/hooks/suspectedContact';

// scrub-concealment-and-area-fire: Area fire picks a "?" marker or a ghost.
const view = {
  markers: [{ x: 10, y: 10, radius: 6, tick: 1 }],
  ghosts: [{ id: 40, x: -20, y: 5, facingX: 0, facingY: 1, faction: 'legalist' as const, untilTick: 50 }],
};

describe('picking a suspected contact', () => {
  it('a click inside a marker\'s ring picks the marker', () => {
    expect(pickSuspectedContact(view, { x: 14, y: 12 })).toEqual({ x: 10, y: 10 });
  });

  it('a click on a ghost picks the ghost', () => {
    expect(pickSuspectedContact(view, { x: -19, y: 5.5 })).toEqual({ x: -20, y: 5 });
  });

  it('a click on bare ground picks nothing', () => {
    expect(pickSuspectedContact(view, { x: 40, y: 40 })).toBeNull();
    expect(pickSuspectedContact(view, { x: -17, y: 5 })).toBeNull();
  });

  it('a tiny ring is still picked within 3 m', () => {
    expect(pickSuspectedContact({ markers: [{ x: 0, y: 0, radius: 1, tick: 1 }] }, { x: 2.5, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('the order is available only while a contact is shown', () => {
    expect(hasSuspectedContact(view)).toBe(true);
    expect(hasSuspectedContact({ markers: [], ghosts: [] })).toBe(false);
    expect(hasSuspectedContact(null)).toBe(false);
  });
});
