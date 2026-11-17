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
// `--budget` fails when a map is over its budget a tick. The time is this
// process's CPU time, not the wall clock: a busy machine (other programs,
// the verify gate's low priority) must not fail the budget.
const BATTLE_TICKS = 3000;
{
  // author-game-maps 3.4: the budget runs on the test map.
  const { DEFAULT_BATTLE_MAP, loadAuthoredMap } = await import('../packages/shared/src');
  await loadAuthoredMap(DEFAULT_BATTLE_MAP);
  const map = DEFAULT_BATTLE_MAP;
  // author-game-maps 3.4 (user decision, 2026-11-10): the test map packs
  // every garrison kind, walls, a stream and dense cover within 150 m of the
  // column, so vision and cover lookups cost more than on an open map. It
  // measured 3.4-3.9 ms a tick; its budget is 4.5 ms, as the Bairro's heavy
  // rostered run had. Skirmish maps, when benched, keep 3 ms.
  const TEST_MAP_BUDGET_MS = 4.5;
  const over: string[] = [];
  type Engine = InstanceType<typeof SimulationEngine>;
  const timed = (make: () => Engine, prepare?: (engine: Engine) => void) =>
    [0, 1].map(() => {
      const engine = make();
      prepare?.(engine);
      // Stepped as the client does at 1x: two ticks, then a frame (without
      // the state hash, as the worker sends it); the hash once at the end.
      const start = process.cpuUsage();
      let frame = engine.frame();
      for (let tick = 0; tick < BATTLE_TICKS; tick += 2) frame = engine.runTicks(2, { hash: false });
      const used = process.cpuUsage(start);
      return { ms: (used.user + used.system) / 1000, hash: frame.hash || engine.frame().hash, units: engine.units.length };
    });
  const line = (scenario: string, runs: ReturnType<typeof timed>, budget: number) => {
    const msPerTick = (runs[0]!.ms + runs[1]!.ms) / 2 / BATTLE_TICKS;
    if (msPerTick > budget) over.push(`${map} ${scenario} ${msPerTick.toFixed(2)} ms over ${budget}`);
    console.log(JSON.stringify({ scenario, map, units: runs[0]!.units, ticks: BATTLE_TICKS, msPerTick: Number(msPerTick.toFixed(4)), budget, hashStable: runs[0]!.hash === runs[1]!.hash }));
  };
  line('battle3v3', timed(() => new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: map })), TEST_MAP_BUDGET_MS);
  // pre-battle-roster 6.2: the heaviest mixed rosters on both sides (six
  // sections, the machine gun and both automatic rifles, 32 men a side).
  const HEAVY = ['comando', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'fuzileiros', 'irregulares'] as const;
  const HEAVY_LEGALIST = ['comando-companhia', 'metralhadora-legalista', 'fuzil-metralhador-legalista', 'fuzil-metralhador-legalista', 'infantaria-exercito', 'provisorios'] as const;
  const heavy = () =>
    new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: map, rosters: { column: { sections: [...HEAVY] }, legalist: { sections: [...HEAVY_LEGALIST] } } });
  line('battle3v3-heavy-rosters', timed(heavy), TEST_MAP_BUDGET_MS);
  // author-game-maps 3.4: the stress run, each column section ordered into
  // the nearest building (garrison lookups, ports and indoor fire).
  const garrisoned = (engine: Engine) => {
    const buildings = engine.positions.filter((position) => position.kind === 'building');
    const squads = new Map<number, Engine['units']>();
    for (const unit of engine.units) if (unit.faction === 'column') squads.set(unit.squadId, [...(squads.get(unit.squadId) ?? []), unit]);
    for (const units of squads.values()) {
      const lead = units[0]!;
      const nearest = [...buildings].sort((a, b) => Math.hypot(a.x - lead.x, a.y - lead.y) - Math.hypot(b.x - lead.x, b.y - lead.y))[0];
      if (nearest) engine.enqueue({ type: 'order', order: 'enter', unitIds: units.map((unit) => unit.id), positionId: nearest.id });
    }
  };
  line('battle3v3-garrisoned-heavy', timed(heavy, garrisoned), TEST_MAP_BUDGET_MS);
  // scale-forces-by-map-size 4.1: two companies, twelve sections a side within
  // the medium limits (65 and 64 men), on the test map (medium). Vision and
  // target scans grow with the square of the men, so they keep their own budget.
  const LARGE_FORCE_BUDGET_MS = 8;
  const COMPANY = ['comando', 'metralhadora', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'fuzileiros', 'fuzileiros', 'irregulares', 'esquadra-4', 'esquadra-5', 'esquadra-4', 'irregulares'] as const;
  const COMPANY_LEGALIST = [
    'comando-companhia', 'metralhadora-legalista', 'metralhadora-legalista',
    'fuzil-metralhador-legalista', 'fuzil-metralhador-legalista', 'fuzil-metralhador-legalista', 'fuzil-metralhador-legalista',
    'provisorios', 'provisorios', 'provisorios', 'provisorios', 'provisorios',
  ] as const;
  line(
    'battle-two-companies',
    timed(() => new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: map, rosters: { column: { sections: [...COMPANY] }, legalist: { sections: [...COMPANY_LEGALIST] } } })),
    LARGE_FORCE_BUDGET_MS,
  );
  if (budgetOnly && over.length > 0) {
    console.error(`FAIL over the tick budget: ${over.join(', ')}`);
    process.exitCode = 1;
  }
}

// add-battle-maps: A* across a 400 m map with a river (the test field).
if (!budgetOnly) {
  const { findPath, setActiveMap } = await import('../packages/shared/src');
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
  console.log(JSON.stringify({ scenario: 'path-400m', msPerPath: Number(ms.toFixed(3)) }, null, 2));
}
