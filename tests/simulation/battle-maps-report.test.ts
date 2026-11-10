import { describe, expect, it } from 'vitest';
import type { BattleMapId } from '@prestes/shared';
import { battleReport } from '../../tools/battle-report';

// refine-battle-maps 1.3 (battle-lab "A decided battle ends"): with the default
// rosters, every battle map's 3v3 ends with an outcome, on three seeds. Its
// length is not fixed: map objectives will shape it.
const MAPS: readonly BattleMapId[] = ['fazenda', 'serra-rio', 'bairro'];
/**
 * garrison-and-assault 3.4 (user, 2026-11-09): the enemy garrisons a section
 * at the start, and the report's scripted player never attacks a position,
 * so these battles stall with that garrison sitting. Left to
 * add-map-objectives (its task 4.1), which brings them back to an outcome.
 */
const STALLED_UNTIL_OBJECTIVES = new Set(['fazenda:1922', 'bairro:42']);

describe('battle report on every battle map', () => {
  for (const map of MAPS) {
    for (const seed of [1922, 7, 42]) {
      const stalled = STALLED_UNTIL_OBJECTIVES.has(`${map}:${seed}`);
      it(`${map}, seed ${seed}: ends with an outcome${stalled ? ' (stalls on the enemy garrison until objectives)' : ''}`, async () => {
        const report = await battleReport(seed, 900, map);
        if (stalled) {
          // Known stall: the enemy garrison is in, and the scripted player leaves it be.
          expect(report.garrison.entered.legalist, JSON.stringify(report)).toBeGreaterThan(0);
          expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
          return;
        }
        expect(report.outcome, JSON.stringify(report)).not.toBe('none');
        expect(report.maxShotsPerTick).toBeLessThanOrEqual(8);
      }, 300_000);
    }
  }
});
