import { DEFAULT_BATTLE_MAP, isDifficulty, loadAuthoredMap } from '@prestes/shared';
import { SimulationEngine } from '@prestes/simulation';

// pnpm sim [seed] [--difficulty <historia|soldado|oficial>]
// add-difficulty-levels 4.1: with a level, the run is a 3v3 fought at it.
const args = process.argv.slice(2);
const levelAt = args.indexOf('--difficulty');
const difficulty = levelAt >= 0 ? args[levelAt + 1] : undefined;
if (difficulty !== undefined && !isDifficulty(difficulty)) {
  console.error(`unknown difficulty ${difficulty}`);
  process.exit(1);
}
const seed = Number(args.find((arg, index) => index !== levelAt && index !== levelAt + 1 && arg !== '--') ?? 1922);
if (difficulty) await loadAuthoredMap(DEFAULT_BATTLE_MAP);
const engine = new SimulationEngine(difficulty ? { seed, scenario: 'battle3v3', difficulty } : { seed });

engine.enqueue({ type: 'move', unitIds: [1], to: { x: 0, y: 0 } });
engine.enqueue({ type: 'move', unitIds: [2], to: { x: 0, y: 0 } });
const frame = engine.runTicks(60);

console.log(
  JSON.stringify(
    {
      seed,
      ...(difficulty ? { difficulty } : {}),
      tick: frame.tick,
      hash: frame.hash,
      units: frame.units,
    },
    null,
    2,
  ),
);
