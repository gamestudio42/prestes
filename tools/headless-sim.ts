import { SimulationEngine } from '@prestes/simulation';

const seed = Number(process.argv[2] ?? 1922);
const engine = new SimulationEngine({ seed });

engine.enqueue({ type: 'move', unitIds: [1], to: { x: 0, y: 0 } });
engine.enqueue({ type: 'move', unitIds: [2], to: { x: 0, y: 0 } });
const frame = engine.runTicks(60);

console.log(
  JSON.stringify(
    {
      seed,
      tick: frame.tick,
      hash: frame.hash,
      units: frame.units,
    },
    null,
    2,
  ),
);
