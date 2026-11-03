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

const results = [6, 12].map((units) => {
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

console.log(JSON.stringify(results, null, 2));


const battle = runBattle3v3();
console.log(JSON.stringify({ scenario: 'battle3v3', units: 66, ticks: TICKS, ms: Number(battle.ms.toFixed(2)), msPerTick: Number((battle.ms / TICKS).toFixed(4)), hash: battle.hash }, null, 2));
