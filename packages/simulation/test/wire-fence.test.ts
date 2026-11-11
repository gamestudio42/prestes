import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';
import { SimulationEngine } from '../src';

// refine-battle-controls: crossing barbed wire costs 3 health once, never fatal.
const WIRE = { halfWidth: 30, halfDepth: 0.2, height: 1.2, radius: 0.5, quality: 0, blocksSight: false };

function battle() {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true, battleMap: TEST_MAP });
  const ids = engine.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1).map((unit) => unit.id);
  const men = engine.units.filter((unit) => unit.squadId === 1);
  const start = {
    x: men.reduce((sum, unit) => sum + unit.x, 0) / men.length,
    y: men.reduce((sum, unit) => sum + unit.y, 0) / men.length,
  };
  // The wire lies five metres in front of the section, across its width.
  engine.covers.push({ id: 99999, kind: 'fence', x: start.x, y: start.y - 5, blocksMovement: true, wire: true, ...WIRE });
  const events: SimEvent[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) events.push(...engine.tick().events);
  };
  return { engine, ids, men, start, events, run };
}

describe('crossing barbed wire', () => {
  it('costs 3 health once per crossing and the men go through', () => {
    const { engine, ids, start, events, run } = battle();
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x, y: start.y - 15 } });
    run(200);
    const hits = events.filter(
      (event): event is Extract<SimEvent, { type: 'unit_hit' }> =>
        event.type === 'unit_hit' && ids.includes(event.unitId) && event.damage === 3,
    );
    expect(hits.length).toBeGreaterThanOrEqual(ids.length - 1);
    for (const id of new Set(hits.map((hit) => hit.unitId))) {
      // One crossing, one loss.
      expect(hits.filter((hit) => hit.unitId === id)).toHaveLength(1);
    }
    const crossed = engine.units.filter((unit) => unit.squadId === 1 && unit.y < start.y - 6);
    expect(crossed.length).toBeGreaterThan(0);
  });

  it('never brings a soldier below 1 health', () => {
    const { engine, ids, men, start, events, run } = battle();
    const last = men[men.length - 1]!;
    last.hp = 1;
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x, y: start.y - 15 } });
    run(200);
    expect(last.hp).toBe(1);
    expect(last.alive).toBe(true);
    expect(events.some((event) => event.type === 'unit_hit' && event.unitId === last.id)).toBe(false);
  });
});
