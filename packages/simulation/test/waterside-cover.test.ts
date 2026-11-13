import { describe, expect, it } from 'vitest';
import { coverAgainst } from '@prestes/shared';
import { SimulationEngine } from '../src';
import { waterside } from '../../shared/test/fixtures/waterside';

// revise-buildings-and-stone 5.1 (D9): a canoe drawn up on the bank is low
// cover like a barrel; the same canoe afloat shelters no one.
describe('waterside cover', () => {
  it('a man crouched behind a canoe on the bank is covered; behind one afloat he is not', () => {
    const map = waterside([
      ['dugout-canoe', 10, 0],
      ['dugout-canoe', 40, 0],
    ]);
    const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: map });
    engine.selectTerrain();
    // The enemy 50 m to the south; the canoe lies across his line.
    const behind = coverAgainst(10, -1.2, 10, 50, 'crouched', engine.covers);
    const open = coverAgainst(-10, -1.2, -10, 50, 'crouched', engine.covers);
    expect(behind).toBeGreaterThan(open);
    expect(engine.covers.filter((cover) => Math.hypot(cover.x - 40, cover.y) < 4)).toHaveLength(0);
  });
});
