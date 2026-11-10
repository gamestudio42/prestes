import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_MAP } from '../../packages/shared/src';
import { battleReport } from '../../tools/battle-report';

// refine-battle-maps 1.3 (battle-lab "A decided battle ends"), author-game-maps
// 3.3: with the default rosters, the test map's 3v3 ends with an outcome on
// three seeds, with no more than 8 shots in a tick.
describe('battle report on the test map', () => {
  for (const seed of [1922, 7, 42]) {
    it(`${DEFAULT_BATTLE_MAP}, seed ${seed}: ends with an outcome`, async () => {
      const report = await battleReport(seed, 900, DEFAULT_BATTLE_MAP);
      expect(report.outcome, JSON.stringify(report)).not.toBe('none');
      expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
    }, 300_000);
  }
});
