/**
 * add-difficulty-levels 4.2: keeps the three levels apart by measurement.
 *
 *   pnpm check:difficulty            the 20 seeds at each level, bands enforced
 *   pnpm check:difficulty --seeds 6  fewer seeds, for a quick look while tuning
 *
 * Runs the battle report's scripted player on the default skirmish map at each
 * level and fails unless the casualty exchange (the player's casualties over
 * the enemy's, summed over the battles) is at most 0.85 at História, 0.85-1.2
 * at Soldado and at least 1.2 at Oficial, rising level by level. Win rates
 * are printed for information. The battles run in parallel child processes,
 * one battle-report run per chunk of seeds.
 */
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { DIFFICULTIES, type Difficulty } from '../packages/shared/src';

export const DIFFICULTY_SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);

/**
 * Casualty-exchange bands by level (spec "Levels kept apart by measurement"):
 * the player's casualties over the enemy's, each summed over the battles.
 */
export const EXCHANGE_BANDS: Readonly<Record<Difficulty, readonly [number, number]>> = {
  historia: [0, 0.85],
  soldado: [0.85, 1.2],
  oficial: [1.2, Number.POSITIVE_INFINITY],
};

export interface BattleOutcome {
  outcome: string;
  casualties: { column: number; legalist: number };
}

export interface LevelResult {
  difficulty: Difficulty;
  battles: readonly BattleOutcome[];
}

export interface LevelVerdict {
  difficulty: Difficulty;
  battles: number;
  wins: number;
  exchange: number;
  ok: boolean;
}

/** Each level's casualty exchange, whether it is within its band, and its wins (information only). */
export function judgeLevels(results: readonly LevelResult[]): LevelVerdict[] {
  return results.map(({ difficulty, battles }) => {
    const column = battles.reduce((sum, battle) => sum + battle.casualties.column, 0);
    const legalist = battles.reduce((sum, battle) => sum + battle.casualties.legalist, 0);
    const exchange = legalist === 0 ? Number.POSITIVE_INFINITY : column / legalist;
    const [low, high] = EXCHANGE_BANDS[difficulty];
    return {
      difficulty,
      battles: battles.length,
      wins: battles.filter((battle) => battle.outcome === 'victory').length,
      exchange,
      ok: exchange >= low && exchange <= high,
    };
  });
}

const show = (value: number): string => (Number.isFinite(value) ? value.toFixed(2) : 'inf');

/** The failure message naming each level out of its band and any break in the rise, or null. */
export function difficultyFailure(verdicts: readonly LevelVerdict[]): string | null {
  const misses = verdicts
    .filter((verdict) => !verdict.ok)
    .map((verdict) => {
      const [low, high] = EXCHANGE_BANDS[verdict.difficulty];
      return `${verdict.difficulty} exchange ${show(verdict.exchange)}, band ${show(low)}-${show(high)}`;
    });
  for (let index = 1; index < verdicts.length; index += 1) {
    const easier = verdicts[index - 1]!;
    const harder = verdicts[index]!;
    if (harder.exchange <= easier.exchange) {
      misses.push(`${harder.difficulty} exchange ${show(harder.exchange)} not above ${easier.difficulty} ${show(easier.exchange)}`);
    }
  }
  return misses.length > 0 ? misses.join('; ') : null;
}

const root = fileURLToPath(new URL('..', import.meta.url));

/** One battle-report child for a level and its seeds; resolves with each battle's outcome and casualties. */
function runChunk(difficulty: Difficulty, seeds: readonly number[]): Promise<BattleOutcome[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tools/battle-report.ts', '--difficulty', difficulty, ...seeds.map(String)], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let out = '';
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`battle-report for ${difficulty} ${seeds.join(',')} exited ${code}`));
        return;
      }
      const battles = out
        .split('\n')
        .filter((line) => line.startsWith('{'))
        .map((line) => JSON.parse(line) as BattleOutcome)
        .map(({ outcome, casualties }) => ({ outcome, casualties }));
      resolve(battles);
    });
  });
}

export async function measureLevels(seeds: readonly number[] = DIFFICULTY_SEEDS): Promise<LevelResult[]> {
  const workers = Math.max(1, availableParallelism() - 1);
  const perLevel = Math.max(1, Math.floor(workers / DIFFICULTIES.length));
  const size = Math.ceil(seeds.length / perLevel);
  const jobs: { difficulty: Difficulty; promise: Promise<BattleOutcome[]> }[] = [];
  for (const difficulty of DIFFICULTIES) {
    for (let start = 0; start < seeds.length; start += size) {
      jobs.push({ difficulty, promise: runChunk(difficulty, seeds.slice(start, start + size)) });
    }
  }
  const outcomes = await Promise.all(jobs.map((job) => job.promise));
  return DIFFICULTIES.map((difficulty) => ({
    difficulty,
    battles: jobs.flatMap((job, index) => (job.difficulty === difficulty ? outcomes[index]! : [])),
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const seedsAt = args.indexOf('--seeds');
  const count = seedsAt >= 0 ? Number(args[seedsAt + 1]) : DIFFICULTY_SEEDS.length;
  const seeds = DIFFICULTY_SEEDS.slice(0, count);
  const verdicts = judgeLevels(await measureLevels(seeds));
  for (const verdict of verdicts) {
    const [low, high] = EXCHANGE_BANDS[verdict.difficulty];
    console.log(
      `${verdict.difficulty.padEnd(8)} exchange ${show(verdict.exchange)} (band ${show(low)}-${show(high)}) ${verdict.ok ? 'ok ' : 'OUT'}   won ${verdict.wins}/${verdict.battles} (information)`,
    );
  }
  const failure = difficultyFailure(verdicts);
  if (failure && count === DIFFICULTY_SEEDS.length) {
    console.error(`Difficulty check failed: ${failure}`);
    process.exit(1);
  }
  console.log(failure ? `(quick look on ${count} seeds: ${failure})` : 'Difficulty check passed.');
}
