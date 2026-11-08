import { performance } from 'node:perf_hooks';
import { SimulationEngine } from '../packages/simulation/src/engine';

const TICKS = 1000;

function runBattle3v3(): { ms: number; hash: string } {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true });
  const start = performance.now();
  const frame = engine.runTicks(TICKS);
  return { ms: performance.now() - start, hash: frame.hash };
}

function run(units: 6 | 12): { ms: number; hash: string } {
  const engine = new SimulationEngine({ seed: 1922, sandbox: true });
  if (units === 12) {
    for (let index = 0; index < 6; index += 1) {
      engine.enqueue({
        type: 'spawn_dummy',
        to: { x: 20, y: -20 + index * 3 },
      });
    }
    engine.runTicks(1);
  }
  const start = performance.now();
  const frame = engine.runTicks(TICKS);
  return { ms: performance.now() - start, hash: frame.hash };
}

/** refine-battle-maps: `--budget` runs only the per-map lines and fails over the budget. */
const budgetOnly = process.argv.includes('--budget');

const results = budgetOnly ? [] : [6, 12].map((units) => {
  const first = run(units as 6 | 12);
  const second = run(units as 6 | 12);
  return {
    units,
    ticks: TICKS,
    firstMs: Number(first.ms.toFixed(2)),
    secondMs: Number(second.ms.toFixed(2)),
    msPerTick: Number(((first.ms + second.ms) / 2 / TICKS).toFixed(4)),
    hashStable: first.hash === second.hash,
    hash: first.hash,
  };
});

if (!budgetOnly) {
  console.log(JSON.stringify(results, null, 2));
  const battle = runBattle3v3();
  console.log(JSON.stringify({ scenario: 'battle3v3', units: 66, ticks: TICKS, ms: Number(battle.ms.toFixed(2)), msPerTick: Number((battle.ms / TICKS).toFixed(4)), hash: battle.hash }, null, 2));
}

// refine-battle-maps: a 3,000-tick 3v3 on each battle map, mean of two runs.
// BATTLE_TICKS covers the approach and the first firefights.
// `--budget` fails when a map is over BUDGET_MS a tick. The time is this
// process's CPU time, not the wall clock: a busy machine (other programs,
// the verify gate's low priority) must not fail the budget.
const BUDGET_MS = 3;
const BATTLE_TICKS = 3000;
{
  const { BATTLE_MAP_IDS } = await import('../packages/shared/src');
  const over: string[] = [];
  for (const map of BATTLE_MAP_IDS) {
    const runs = [0, 1].map(() => {
      const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: map });
      // Stepped as the client does at 1x: two ticks, then a frame (without
      // the state hash, as the worker sends it); the hash once at the end.
      const start = process.cpuUsage();
      let frame = engine.frame();
      for (let tick = 0; tick < BATTLE_TICKS; tick += 2) frame = engine.runTicks(2, { hash: false });
      const used = process.cpuUsage(start);
      return { ms: (used.user + used.system) / 1000, hash: frame.hash || engine.frame().hash };
    });
    const msPerTick = (runs[0]!.ms + runs[1]!.ms) / 2 / BATTLE_TICKS;
    if (msPerTick > BUDGET_MS) over.push(`${map} ${msPerTick.toFixed(2)} ms`);
    console.log(JSON.stringify({ scenario: 'battle3v3', map, ticks: BATTLE_TICKS, msPerTick: Number(msPerTick.toFixed(4)), hashStable: runs[0]!.hash === runs[1]!.hash }));
  }
  if (budgetOnly && over.length > 0) {
    console.error(`FAIL over the ${BUDGET_MS} ms a tick budget: ${over.join(', ')}`);
    process.exitCode = 1;
  }
}

// add-battle-maps: A* across a 400 m map with a river (the test field).
if (!budgetOnly) {
  const { findPath, setActiveMap, VILA_MILITAR } = await import('../packages/shared/src');
  const { TEST_MAP } = await import('../packages/shared/test/fixtures/test-map');
  setActiveMap(TEST_MAP);
  findPath({ x: -150, y: 150 }, { x: 150, y: -150 }, []);
  const routes = [
    [{ x: -190, y: 190 }, { x: 190, y: -190 }],
    [{ x: 160, y: 30 }, { x: 160, y: -30 }],
    [{ x: -60, y: 180 }, { x: 60, y: -180 }],
  ] as const;
  const start = performance.now();
  for (let round = 0; round < 5; round += 1) {
    for (const [from, to] of routes) findPath(from, to, []);
  }
  const ms = (performance.now() - start) / (5 * routes.length);
  setActiveMap(VILA_MILITAR);
  console.log(JSON.stringify({ scenario: 'path-400m', msPerPath: Number(ms.toFixed(3)) }, null, 2));
}
