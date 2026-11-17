import { fileURLToPath } from 'node:url';
import { battleReport, type BattleReport } from './battle-report';
import type { BattleMapId } from '../packages/shared/src';

/**
 * scale-forces-by-map-size 5.1, 5.8 (battle-lab "Campaign battle length
 * report"): each medium campaign map with its own forces, commander and
 * events, the enemy placed as in the game, on three seeds.
 */
export const MEDIUM_CAMPAIGN_MAPS = ['catanduvas', 'porto-mendes', 'sao-luiz-ramada', 'serra-nova', 'pantanal'] as const satisfies readonly BattleMapId[];
export const LENGTH_SEEDS = [1922, 7, 42] as const;
/** The bands: the first shot within this, a decided battle within that (s). */
export const FIRST_SHOT_BAND_SECONDS = 120;
export const DECIDED_BAND_SECONDS = 720;

export async function campaignLength(map: BattleMapId, seed: number): Promise<BattleReport> {
  return battleReport(seed, 900, map, undefined, true);
}

export function lengthMisses(report: BattleReport): string[] {
  const misses: string[] = [];
  if (report.firstShot < 0 || report.firstShot > FIRST_SHOT_BAND_SECONDS) misses.push(`first shot ${report.firstShot} s`);
  if (report.outcome === 'none' || report.outcome === 'draw' || report.seconds > DECIDED_BAND_SECONDS) misses.push(`${report.outcome} at ${report.seconds} s`);
  return misses;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // pnpm tsx tools/campaign-length.ts [map ...]
  const wanted = process.argv.slice(2);
  const maps = wanted.length > 0 ? (wanted as BattleMapId[]) : MEDIUM_CAMPAIGN_MAPS;
  console.log('| map | seed | first shot (s) | time (s) | outcome | decided by | casualties c/l | shots/tick | bunching | bands |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const map of maps) {
    for (const seed of LENGTH_SEEDS) {
      const r = await campaignLength(map, seed);
      const misses = lengthMisses(r);
      console.log(`| ${map} | ${seed} | ${r.firstShot} | ${r.seconds} | ${r.outcome} | ${r.decidedBy ?? '-'} | ${r.casualties.column}/${r.casualties.legalist} | ${r.maxShotsPerTick} | ${r.bunching} | ${misses.length ? misses.join(', ') : 'ok'} |`);
    }
  }
}
