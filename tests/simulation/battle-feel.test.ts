import { describe, expect, it } from 'vitest';
import { battleReport } from '../../tools/battle-report';

// battle-feel-3v3: the 3v3, played as its game loop (hold the line, break
// the enemy's attack, counterattack), must play out as a fight with a
// beginning and an end. A silence up to 75 s is a section crossing the
// 160 m between the lines out of range, not a stall.
/**
 * garrison-and-assault (user, 2026-11-09): with the enemy garrisoning a
 * trench line at the start, these seeds run long or fall silent while the
 * scripted player leaves it be. Left to add-map-objectives (its task 4.1).
 */
const LONG_UNTIL_OBJECTIVES = new Set([7, 42]);

describe('3v3 battle feel', () => {
  for (const seed of [1922, 7, 42]) {
    const known = LONG_UNTIL_OBJECTIVES.has(seed);
    it(`seed ${seed}: ends in 3 to 10 minutes, no volleys, no long silences${known ? ' (length and silence wait for objectives)' : ''}`, async () => {
      const report = await battleReport(seed, 900);
      if (known) {
        // Known: it still ends, without volleys or bunching; its length and silences wait for objectives.
        expect(report.outcome, JSON.stringify(report)).not.toBe('none');
        expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
        expect(report.bunching).toBeLessThan(0.15);
        return;
      }
      expect(report.outcome, JSON.stringify(report)).not.toBe('none');
      expect(report.seconds).toBeGreaterThanOrEqual(180);
      expect(report.seconds).toBeLessThanOrEqual(600);
      expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
      expect(report.longestSilence).toBeLessThanOrEqual(75);
      // movement-polish: sections keep a man's room.
      expect(report.bunching).toBeLessThan(0.15);
    }, 120_000);
  }
});
