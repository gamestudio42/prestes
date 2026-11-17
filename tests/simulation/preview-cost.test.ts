import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_MAP, loadAuthoredMap, planOrderPreview, type Frame, type PreviewRequest } from '../../packages/shared/src';
import { SimulationEngine } from '../../packages/simulation/src/engine';
import { TEST_MAP } from '../../packages/shared/test/fixtures/test-map';

// movement-polish: the order preview stays light with three sections selected.
// author-game-maps 3.1: on the test map the pointer sits on open ground on the
// column's side of the stone wall (y 32); a point just beyond a long wall costs
// more (A* fills the walled pocket), see the change's apply findings.
const BUDGET_MS = 2;
/** route-around-wire: a move preview past a wire fence with a gap, on the 400 m test map. */
const FENCE_BUDGET_MS = 6;
/** scale-forces-by-map-size 4.2: twelve sections, four times the men of three, on the test map. */
const TWELVE_BUDGET_MS = 8;
/** CI machines vary; the guard keeps the test meaningful without flaking. */
const GUARD = Number(process.env.PRESTES_PREVIEW_GUARD ?? 1);

describe('order preview cost', () => {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true });
  const frame = engine.runTicks(5);
  const column = frame.units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
  const enemy = frame.units.find((unit) => unit.faction === 'legalist')!;

  // The best batch: the preview's cost, not the load of the machine. A batch
  // can land on a slow core or be pre-empted (the gate runs at low priority),
  // so it keeps sampling, up to 25 batches, until one is inside the budget.
  const time = (request: PreviewRequest, budget = BUDGET_MS, at = (index: number) => ({ x: -10 + index, y: 42 })): number => {
    planOrderPreview(request);
    const runs = 10;
    let best = Number.POSITIVE_INFINITY;
    for (let batch = 0; batch < 25 && (batch < 5 || best >= budget * GUARD); batch += 1) {
      const start = performance.now();
      for (let index = 0; index < runs; index += 1) planOrderPreview({ ...request, to: at(index) });
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
        to: { x: 0, y: 42 },
        targetId: order === 'attack' || order === 'flank' ? enemy.id : undefined,
        fast: order === 'move',
      });
      expect(ms).toBeLessThan(BUDGET_MS * GUARD);
    });
  }

  it(`move past a wire fence with a gap takes under ${FENCE_BUDGET_MS} ms`, () => {
    const fenced = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
    const men = fenced.units.filter((unit) => unit.faction === 'column');
    const centre = { x: men.reduce((sum, unit) => sum + unit.x, 0) / men.length, y: men.reduce((sum, unit) => sum + unit.y, 0) / men.length };
    // Ahead of the column, across the whole test map but for a 10 m gap at its centre.
    const fenceY = centre.y - 8;
    const wire = { kind: 'fence' as const, y: fenceY, halfDepth: 0.2, height: 1.2, radius: 0.5, quality: 0, blocksMovement: true, blocksSight: false, wire: true };
    fenced.covers.push(
      { id: 99998, x: (-200 + centre.x - 5) / 2, halfWidth: (centre.x - 5 + 200) / 2, ...wire },
      { id: 99999, x: (centre.x + 5 + 200) / 2, halfWidth: (200 - centre.x - 5) / 2, ...wire },
    );
    const fencedFrame = fenced.runTicks(1);
    const ms = time(
      { frame: fencedFrame, unitIds: men.map((unit) => unit.id), order: 'move', to: { x: centre.x, y: fenceY - 20 }, fast: true },
      FENCE_BUDGET_MS,
      (index) => ({ x: centre.x - 5 + index, y: fenceY - 20 }),
    );
    expect(ms).toBeLessThan(FENCE_BUDGET_MS * GUARD);
  });

  // scale-forces-by-map-size 4.2: a medium map's company, twelve sections selected.
  describe('with twelve sections', () => {
    const TWELVE = ['comando', 'metralhadora', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'fuzileiros', 'fuzileiros', 'irregulares', 'esquadra-4', 'esquadra-5', 'esquadra-4', 'irregulares'] as const;
    let big: Frame;
    let men: number[];
    let target: number;
    beforeAll(async () => {
      await loadAuthoredMap(DEFAULT_BATTLE_MAP);
      const company = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: DEFAULT_BATTLE_MAP, rosters: { column: { sections: [...TWELVE] } } });
      big = company.runTicks(5);
      men = big.units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
      target = big.units.find((unit) => unit.faction === 'legalist')!.id;
    });
    for (const order of ['attack', 'move'] as const) {
      it(`${order} takes under ${TWELVE_BUDGET_MS} ms`, () => {
        expect(men).toHaveLength(65);
        const ms = time(
          { frame: big, unitIds: men, order, to: { x: 0, y: 40 }, targetId: order === 'attack' ? target : undefined, fast: order === 'move' },
          TWELVE_BUDGET_MS,
          (index) => ({ x: -10 + index, y: 40 }),
        );
        expect(ms).toBeLessThan(TWELVE_BUDGET_MS * GUARD);
      });
    }
  });

  it('draws a straight approach guide per soldier for a targeted order', () => {
    const plan = planOrderPreview({ frame, unitIds: column, order: 'flank', targetId: enemy.id })!;
    expect(plan.paths).toHaveLength(33);
    for (const path of plan.paths) expect(path.points).toHaveLength(2);
    // A section flanks as a body: one approach point per section.
    const approaches = new Set(plan.paths.map((path) => `${path.destination.x.toFixed(2)}:${path.destination.y.toFixed(2)}`));
    expect(approaches.size).toBeLessThanOrEqual(3);
  });
});
