import { describe, expect, it } from 'vitest';
import { battleReport } from '../../tools/battle-report';

// battle-feel-3v3: the 3v3, played as its game loop (hold the line, break
// the enemy's attack, counterattack), must play out as a fight with a
// beginning and an end. A silence up to 75 s is a section crossing the
// 160 m between the lines out of range, not a stall.
describe('3v3 battle feel', () => {
  for (const seed of [1922, 7, 42]) {
    it(`seed ${seed}: ends in 3 to 10 minutes, no volleys, no long silences`, async () => {
      const report = await battleReport(seed, 900);
      expect(report.outcome, JSON.stringify(report)).not.toBe('none');
      expect(report.seconds).toBeGreaterThanOrEqual(180);
      expect(report.seconds).toBeLessThanOrEqual(600);
      expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
      expect(report.longestSilence).toBeLessThanOrEqual(75);
    }, 120_000);
  }
});
