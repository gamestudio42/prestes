import { describe, expect, it } from 'vitest';
import { flankCandidates, formationSlots, targetScore } from '../src/tactical';

describe('tactical helpers', () => {
  it('scores a closer exposed target above a farther covered one', () => {
    const unit = { x: 0, y: 0 };
    const exposed = { x: 5, y: 0, cover: 0, suppressed: false, kind: 'infantry' as const };
    const covered = { x: 10, y: 0, cover: 0.5, suppressed: false, kind: 'infantry' as const };
    expect(targetScore(unit, exposed)).toBeGreaterThan(targetScore(unit, covered));
  });

  it('discounts a target already engaged by allies', () => {
    const unit = { x: 0, y: 0 };
    const target = { x: 5, y: 0, cover: 0, suppressed: false, kind: 'infantry' as const };
    expect(targetScore(unit, target, 2)).toBeLessThan(targetScore(unit, target));
  });

  it('ranks officers and suppressed targets higher', () => {
    const unit = { x: 0, y: 0 };
    const infantry = { x: 5, y: 0, cover: 0, suppressed: false, kind: 'infantry' as const };
    const officer = { ...infantry, kind: 'officer' as const };
    const suppressed = { ...infantry, suppressed: true };
    expect(targetScore(unit, officer)).toBeGreaterThan(targetScore(unit, infantry));
    expect(targetScore(unit, suppressed)).toBeGreaterThan(targetScore(unit, infantry));
  });

  it('returns four flank candidates around the target', () => {
    const candidates = flankCandidates({ x: 0, y: 0 }, { x: 0, y: 10 });
    expect(candidates).toHaveLength(4);
    for (const candidate of candidates) {
      expect(Math.hypot(candidate.x, candidate.y)).toBeCloseTo(9);
    }
  });

  it('spreads a group around the destination and keeps a single unit direct', () => {
    const slots = formationSlots(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 4, y: 0 },
      ],
      { x: 10, y: 0 },
    );
    expect(slots).toHaveLength(3);
    // A line across the march direction; which soldier takes which slot is
    // decided by distance matching.
    expect(slots.map((slot) => Math.round(slot.y * 10) / 10).sort((a, b) => a - b)).toEqual([-2.8, 0, 2.8]);
    expect(slots.every((slot) => Math.abs(slot.x - 10) < 0.001)).toBe(true);
    expect(formationSlots([{ x: 0, y: 0 }], { x: 3, y: 4 })).toEqual([{ x: 3, y: 4 }]);
  });
});
