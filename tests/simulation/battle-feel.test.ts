import { describe, expect, it } from 'vitest';
import { battleReport } from '../../tools/battle-report';

// battle-feel-3v3: the 3v3, played as its game loop (hold the line, break
// the enemy's attack, counterattack for the objectives), must play out as a
// fight with a beginning and an end. add-map-objectives 4.1: with objectives
// a section may march the map to a far objective out of range, so a silence
// up to 120 s is that walk, not a stall.
/**
 * garrison-and-assault (user, 2026-11-09) listed seeds 7 and 42 here, long or
 * silent while the scripted player left a garrisoned trench be. Since the
 * bounds keep a man's room (author-game-maps 3.6 follow-up, 2026-11-10) all
 * three seeds hold the full bands on the test map, so the list is empty.
 */
const LONG_UNTIL_OBJECTIVES = new Set<number>();

describe('3v3 battle feel', () => {
  for (const seed of [1922, 7, 42]) {
    const known = LONG_UNTIL_OBJECTIVES.has(seed);
    it(`seed ${seed}: ends within the 15-minute limit, no volleys, no long silences${known ? ' (length and silence wait for objectives)' : ''}`, async () => {
      const report = await battleReport(seed, 900);
      if (known) {
        // Known: it still ends, without volleys or bunching; its length and silences wait for objectives.
        expect(report.outcome, JSON.stringify(report)).not.toBe('none');
        expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
        expect(report.bunching).toBeLessThan(0.15);
        return;
      }
      expect(report.outcome, JSON.stringify(report)).not.toBe('none');
      expect(report.decidedBy, JSON.stringify(report)).toBeDefined();
      expect(report.seconds).toBeGreaterThanOrEqual(180);
      // add-map-objectives 4.1: the battle ends within its own 15-minute clock.
      expect(report.seconds).toBeLessThanOrEqual(900);
      expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
      expect(report.longestSilence).toBeLessThanOrEqual(120);
      // movement-polish: sections keep a man's room.
      expect(report.bunching).toBeLessThan(0.15);
    }, 120_000);
  }
});
