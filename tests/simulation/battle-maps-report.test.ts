import { describe, expect, it } from 'vitest';
import type { BattleMapId } from '@prestes/shared';
import { battleReport } from '../../tools/battle-report';

// refine-battle-maps 1.3 (battle-lab "A decided battle ends"): with the default
// rosters, every battle map's 3v3 ends with an outcome, on three seeds. Its
// length is not fixed: map objectives will shape it.
const MAPS: readonly BattleMapId[] = ['fazenda', 'serra-rio', 'bairro'];

describe('battle report on every battle map', () => {
  for (const map of MAPS) {
    for (const seed of [1922, 7, 42]) {
      it(`${map}, seed ${seed}: ends with an outcome`, async () => {
        const report = await battleReport(seed, 900, map);
        expect(report.outcome, JSON.stringify(report)).not.toBe('none');
        expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
      }, 300_000);
    }
  }
});
