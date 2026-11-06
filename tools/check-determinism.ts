import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { BATTLE_MAP_IDS, type BattleMapId } from '@prestes/shared';
import { SimulationEngine } from '@prestes/simulation';

interface Golden {
  seed: number;
  ticks: number;
  hash: string;
  /** add-battle-maps: a 1,000-tick 3v3 on each battle map. */
  battleMaps?: Partial<Record<BattleMapId, string>>;
}

const BATTLE_TICKS = 1000;

function runBattle(map: BattleMapId): string {
  const engine = new SimulationEngine({ seed: SEED, scenario: 'battle3v3', sandbox: true, battleMap: map });
  return engine.runTicks(BATTLE_TICKS).hash;
}

const SEED = 1922;
const TICKS = 600;
const GOLDEN_PATH = fileURLToPath(new URL('./determinism-golden.json', import.meta.url));

// Fixed scenario: a group move, an attack, suppression and an area defend, so
// movement, pathing, combat, morale and orders all feed the hash.
function runScenario(): string {
  const engine = new SimulationEngine({ seed: SEED });
  const start = engine.runTicks(1);
  const column = start.units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
  const legalist = start.units.filter((unit) => unit.faction === 'legalist').map((unit) => unit.id);
  if (column.length < 4 || legalist.length === 0) {
    throw new Error(`Unexpected default scenario: ${column.length} column, ${legalist.length} legalist units`);
  }
  const [first, second, ...rest] = column;
  const target = legalist[0]!;

  engine.enqueue({ type: 'move', unitIds: column, to: { x: 0, y: 0 } });
  engine.runTicks(100);
  engine.enqueue({ type: 'attack', unitIds: [first!, second!], targetId: target });
  engine.enqueue({ type: 'suppress', unitIds: rest, targetId: target });
  engine.runTicks(200);
  engine.enqueue({ type: 'order', order: 'defend', unitIds: column, to: { x: 4, y: 4 } });
  return engine.runTicks(TICKS - 301).hash;
}

function readGolden(): Golden | undefined {
  try {
    return JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as Golden;
  } catch {
    return undefined;
  }
}

const update = process.argv.includes('--update');
const first = runScenario();
const second = runScenario();
console.log(`seed ${SEED}, ${TICKS} ticks: run 1 ${first}, run 2 ${second}`);

if (first !== second) {
  console.error('FAIL nondeterminism: two runs of the same scenario produced different hashes');
  process.exit(1);
}

const battles: Partial<Record<BattleMapId, string>> = {};
for (const map of BATTLE_MAP_IDS) {
  let hash: string;
  try {
    hash = runBattle(map);
  } catch (error) {
    // A map listed but not in the catalog yet.
    if (String(error).includes('unknown battle map')) continue;
    throw error;
  }
  if (hash !== runBattle(map)) {
    console.error(`FAIL nondeterminism: two 3v3 runs on ${map} produced different hashes`);
    process.exit(1);
  }
  battles[map] = hash;
  console.log(`3v3 on ${map}, ${BATTLE_TICKS} ticks: ${hash}`);
}

const golden = readGolden();
if (update) {
  writeFileSync(
    GOLDEN_PATH,
    `${JSON.stringify({ seed: SEED, ticks: TICKS, hash: first, battleMaps: battles }, null, 2)}\n`,
  );
  console.log(`golden updated: ${golden?.hash ?? '(none)'} -> ${first}`);
  process.exit(0);
}
for (const [map, hash] of Object.entries(battles)) {
  const expected = golden?.battleMaps?.[map as BattleMapId];
  if (expected === undefined) {
    console.error(`FAIL no 3v3 golden for ${map}; run with --update to record it`);
    process.exit(1);
  }
  if (expected !== hash) {
    console.error(`FAIL 3v3 golden mismatch on ${map}: expected ${expected}, actual ${hash}`);
    console.error('If the simulation change is intended, run pnpm check:determinism --update');
    process.exit(1);
  }
}

if (!golden) {
  console.error(`FAIL no golden at ${GOLDEN_PATH}; run with --update to record it`);
  process.exit(1);
}
if (golden.seed !== SEED || golden.ticks !== TICKS || golden.hash !== first) {
  console.error(`FAIL golden mismatch: expected ${golden.hash} (seed ${golden.seed}, ${golden.ticks} ticks), actual ${first}`);
  console.error('If the simulation change is intended, run pnpm check:determinism --update');
  process.exit(1);
}
console.log('determinism ok: hash matches golden');
