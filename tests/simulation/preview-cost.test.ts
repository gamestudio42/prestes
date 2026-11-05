import { describe, expect, it } from 'vitest';
import { planOrderPreview, type PreviewRequest } from '../../packages/shared/src';
import { SimulationEngine } from '../../packages/simulation/src/engine';

// movement-polish: the order preview stays light with three sections selected.
const BUDGET_MS = 2;
/** CI machines vary; the guard keeps the test meaningful without flaking. */
const GUARD = Number(process.env.PRESTES_PREVIEW_GUARD ?? 1);

describe('order preview cost', () => {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true });
  const frame = engine.runTicks(5);
  const column = frame.units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
  const enemy = frame.units.find((unit) => unit.faction === 'legalist')!;

  // The best of five batches: the preview's cost, not the load of whatever
  // else the test run is doing in parallel (whole battles in other workers).
  const time = (request: PreviewRequest): number => {
    planOrderPreview(request);
    const runs = 10;
    let best = Number.POSITIVE_INFINITY;
    for (let batch = 0; batch < 5; batch += 1) {
      const start = performance.now();
      for (let index = 0; index < runs; index += 1) planOrderPreview({ ...request, to: { x: -10 + index, y: 30 } });
      best = Math.min(best, (performance.now() - start) / runs);
    }
    return best;
  };

  for (const order of ['attack', 'flank', 'advance', 'defend', 'move'] as const) {
    it(`${order} with three sections takes under ${BUDGET_MS} ms`, () => {
      const ms = time({
        frame,
        unitIds: column,
        order,
        to: { x: 0, y: 30 },
        targetId: order === 'attack' || order === 'flank' ? enemy.id : undefined,
        fast: order === 'move',
      });
      expect(ms).toBeLessThan(BUDGET_MS * GUARD);
    });
  }

  it('draws a straight approach guide per soldier for a targeted order', () => {
    const plan = planOrderPreview({ frame, unitIds: column, order: 'flank', targetId: enemy.id })!;
    expect(plan.paths).toHaveLength(33);
    for (const path of plan.paths) expect(path.points).toHaveLength(2);
    // A section flanks as a body: one approach point per section.
    const approaches = new Set(plan.paths.map((path) => `${path.destination.x.toFixed(2)}:${path.destination.y.toFixed(2)}`));
    expect(approaches.size).toBeLessThanOrEqual(3);
  });
});
