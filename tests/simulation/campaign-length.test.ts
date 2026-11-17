import { describe, expect, it } from 'vitest';
import { battleReport } from '../../tools/battle-report';
import { FIRST_SHOT_BAND_SECONDS, LENGTH_SEEDS, MEDIUM_CAMPAIGN_MAPS } from '../../tools/campaign-length';

// scale-forces-by-map-size 5.8 (battle-lab "Campaign battle length report"):
// on every medium campaign map the two sides meet early. Each run stops just
// past the band; the whole battle's length is `tools/campaign-length.ts`'s
// report, reviewed by the owner in play.
describe('campaign battles start early', () => {
  for (const map of MEDIUM_CAMPAIGN_MAPS) {
    for (const seed of LENGTH_SEEDS) {
      it(`${map}, seed ${seed}: the first shot within ${FIRST_SHOT_BAND_SECONDS} s`, async () => {
        const report = await battleReport(seed, FIRST_SHOT_BAND_SECONDS + 5, map, undefined, true);
        expect(report.firstShot, JSON.stringify({ map, seed, firstShot: report.firstShot })).toBeGreaterThan(0);
        expect(report.firstShot).toBeLessThanOrEqual(FIRST_SHOT_BAND_SECONDS);
      }, 300_000);
    }
  }
});
