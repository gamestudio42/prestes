import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { authoredMapIds, compileMapDocument, createEditableMap, DEFAULT_BATTLE_MAP, loadAuthoredMap, toMapDocument, type BattleMapId, type SectionTypeId } from '@prestes/shared';
import { SimulationEngine } from '@prestes/simulation';
import { mergeMapGolden } from './golden-merge';

interface Golden {
  seed: number;
  ticks: number;
  hash: string;
  /** add-battle-maps: a 1,000-tick 3v3 on each battle map. */
  battleMaps?: Partial<Record<BattleMapId, string>>;
  /** pre-battle-roster 4.5: the same 3v3 with a fixed mixed roster against a drawn enemy. */
  mixedRosters?: Partial<Record<BattleMapId, string>>;
  /** add-withdrawal-exits 8.2: a 1,000-tick 3v3 on a test field with two exits, a section sent out. */
  withdrawal?: string;
  /** Why the goldens were last re-recorded. */
  reason?: string;
}

const BATTLE_TICKS = 1000;

function runBattle(map: BattleMapId, throughDeployment = false): string {
  const engine = new SimulationEngine({ seed: SEED, scenario: 'battle3v3', sandbox: true, battleMap: map, deployment: throughDeployment });
  if (throughDeployment) {
    // add-deployment-phase 2.4: an empty deployment phase, ended at once.
    engine.enqueue({ type: 'start_battle' });
    engine.runTicks(1);
  }
  return engine.runTicks(BATTLE_TICKS).hash;
}

const SEED = 1922;

/** pre-battle-roster 4.5: every section type with a weapon of its own; the enemy is drawn from the map's presets. */
const MIXED_ROSTER: SectionTypeId[] = ['comando', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'esquadra-4', 'irregulares'];

function runMixedBattle(map: BattleMapId): string {
  const engine = new SimulationEngine({ seed: SEED, scenario: 'battle3v3', sandbox: true, battleMap: map, rosters: { column: { sections: MIXED_ROSTER } } });
  return engine.runTicks(BATTLE_TICKS).hash;
}
/**
 * add-withdrawal-exits 8.2: a test field built here (not an authored map):
 * two exits west and east, level with the column (the west one near it), a requirement
 * of two sections, and an "exited" event; the column's first section is sent
 * out west at once, so leaving, the trigger and the commander's block run.
 */
function runWithdrawal(): string {
  const map = createEditableMap({ id: 'withdrawal-fixture', size: 'medium', name: { en: 'Withdrawal', 'pt-BR': 'Retirada' } });
  const square = (x: number) => [{ x, y: 60 }, { x: x + 18, y: 60 }, { x: x + 18, y: 140 }, { x, y: 140 }];
  const battleMap = compileMapDocument(
    toMapDocument({
      ...map,
      withdrawal: {
        exits: [
          // Nearer than the edge, so the section gets out within the run.
          { id: 1, name: { en: 'West ford', 'pt-BR': 'Vau oeste' }, polygon: square(-130) },
          { id: 2, name: { en: 'East road', 'pt-BR': 'Estrada leste' }, polygon: square(182) },
        ],
        requirement: { sections: 2, command: false },
      },
      events: [{ id: 1, label: 'out', trigger: { kind: 'exited', sections: 1 }, delay: 0, actions: [{ kind: 'posture', posture: 'offensive', until: { seconds: 120 } }] }],
      eventPlaces: [],
    }),
  );
  const engine = new SimulationEngine({ seed: SEED, scenario: 'battle3v3', sandbox: true, battleMap });
  const start = engine.runTicks(1);
  const squad = start.units.find((unit) => unit.faction === 'column')!.squadId;
  engine.enqueue({ type: 'move', unitIds: start.units.filter((unit) => unit.faction === 'column' && unit.squadId === squad).map((unit) => unit.id), to: { x: -121, y: 100 } });
  return engine.runTicks(BATTLE_TICKS - 1).hash;
}

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
/** `--reason "<why>"` records why the goldens were re-recorded. */
function reasonArg(): string | undefined {
  const index = process.argv.indexOf('--reason');
  return index >= 0 ? process.argv[index + 1] : undefined;
}
// make-campaign-playable D7: `--map <id>` checks (or with --update re-records) one authored map's
// goldens; the other maps' entries and the base hash are kept.
const mapIndex = process.argv.indexOf('--map');
if (mapIndex >= 0) {
  const map = process.argv[mapIndex + 1];
  if (!map || !authoredMapIds().includes(map)) {
    console.error(`FAIL unknown authored map: ${map ?? '(none)'}`);
    process.exit(1);
  }
  const reason = reasonArg();
  const golden = readGolden();
  if (update && (!reason || !golden)) {
    console.error(!golden ? `FAIL no golden at ${GOLDEN_PATH} to merge into` : 'FAIL --update --map needs --reason "<why>"');
    process.exit(1);
  }
  await loadAuthoredMap(map);
  if (map !== DEFAULT_BATTLE_MAP) await loadAuthoredMap(DEFAULT_BATTLE_MAP);
  const battle = runBattle(map);
  if (battle !== runBattle(map)) {
    console.error(`FAIL nondeterminism: two 3v3 runs on ${map} produced different hashes; nothing written`);
    process.exit(1);
  }
  if (battle !== runBattle(map, true)) {
    console.error(`FAIL deployment: the 3v3 on ${map} through an empty deployment phase differs from the battle without one; nothing written`);
    process.exit(1);
  }
  let mixedHash: string | undefined;
  if (map === DEFAULT_BATTLE_MAP) {
    mixedHash = runMixedBattle(map);
    if (mixedHash !== runMixedBattle(map)) {
      console.error(`FAIL nondeterminism: two mixed-roster 3v3 runs on ${map} produced different hashes; nothing written`);
      process.exit(1);
    }
  }
  console.log(`3v3 on ${map}, ${BATTLE_TICKS} ticks: ${battle}${mixedHash ? ` (mixed roster ${mixedHash})` : ''}`);
  if (update) {
    const merged = mergeMapGolden(golden!, map, { battle, ...(mixedHash ? { mixed: mixedHash } : {}) }, reason!);
    writeFileSync(GOLDEN_PATH, `${JSON.stringify(merged, null, 2)}\n`);
    console.log(`golden updated for ${map}: ${golden!.battleMaps?.[map] ?? '(none)'} -> ${battle}`);
    process.exit(0);
  }
  const expected = golden?.battleMaps?.[map];
  const expectedMixed = mixedHash === undefined ? undefined : golden?.mixedRosters?.[map];
  if (expected !== battle || expectedMixed !== mixedHash) {
    console.error(`FAIL 3v3 golden ${expected === undefined ? 'missing' : 'mismatch'} on ${map}: expected ${expected}, actual ${battle}`);
    console.error(`If the map edit is intended, run pnpm maps:accept ${map} --reason "<why>"`);
    process.exit(1);
  }
  console.log(`determinism ok: ${map} matches its golden`);
  process.exit(0);
}

const first = runScenario();
const second = runScenario();
console.log(`seed ${SEED}, ${TICKS} ticks: run 1 ${first}, run 2 ${second}`);

if (first !== second) {
  console.error('FAIL nondeterminism: two runs of the same scenario produced different hashes');
  process.exit(1);
}

const battles: Partial<Record<BattleMapId, string>> = {};
// author-game-maps 3.2: the 3v3 cases run on the authored maps, the test map first.
for (const id of authoredMapIds()) await loadAuthoredMap(id);
for (const map of [DEFAULT_BATTLE_MAP, ...authoredMapIds().filter((id) => id !== DEFAULT_BATTLE_MAP)]) {
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
  if (hash !== runBattle(map, true)) {
    console.error(`FAIL deployment: the 3v3 on ${map} through an empty deployment phase differs from the battle without one`);
    process.exit(1);
  }
  battles[map] = hash;
  console.log(`3v3 on ${map}, ${BATTLE_TICKS} ticks: ${hash}`);
}

const mixed: Partial<Record<BattleMapId, string>> = {};
for (const map of [DEFAULT_BATTLE_MAP]) {
  const hash = runMixedBattle(map);
  if (hash !== runMixedBattle(map)) {
    console.error(`FAIL nondeterminism: two mixed-roster 3v3 runs on ${map} produced different hashes`);
    process.exit(1);
  }
  mixed[map] = hash;
  console.log(`mixed-roster 3v3 on ${map}, ${BATTLE_TICKS} ticks: ${hash}`);
}

const withdrawal = runWithdrawal();
if (withdrawal !== runWithdrawal()) {
  console.error('FAIL nondeterminism: two withdrawal runs produced different hashes');
  process.exit(1);
}
console.log(`withdrawal 3v3 on the test field, ${BATTLE_TICKS} ticks: ${withdrawal}`);

const golden = readGolden();
if (update) {
  writeFileSync(
    GOLDEN_PATH,
    `${JSON.stringify({ seed: SEED, ticks: TICKS, hash: first, battleMaps: battles, mixedRosters: mixed, withdrawal, reason: reasonArg() ?? golden?.reason }, null, 2)}\n`,
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
for (const [map, hash] of Object.entries(mixed)) {
  const expected = golden?.mixedRosters?.[map as BattleMapId];
  if (expected !== hash) {
    console.error(`FAIL mixed-roster 3v3 golden ${expected === undefined ? 'missing' : 'mismatch'} on ${map}: expected ${expected}, actual ${hash}`);
    console.error('If the simulation change is intended, run pnpm check:determinism --update');
    process.exit(1);
  }
}

if (golden?.withdrawal !== withdrawal) {
  console.error(`FAIL withdrawal golden ${golden?.withdrawal === undefined ? 'missing' : 'mismatch'}: expected ${golden?.withdrawal}, actual ${withdrawal}`);
  console.error('If the simulation change is intended, run pnpm check:determinism --update');
  process.exit(1);
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
