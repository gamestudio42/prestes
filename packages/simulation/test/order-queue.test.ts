import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src';

// refine-battle-controls: Shift queues orders behind the section's current one.
function battle() {
  const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true });
  const frame = engine.frame();
  const ids = frame.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1).map((unit) => unit.id);
  const here = frame.units.filter((unit) => unit.squadId === 1);
  const start = {
    x: here.reduce((sum, unit) => sum + unit.x, 0) / here.length,
    y: here.reduce((sum, unit) => sum + unit.y, 0) / here.length,
  };
  const events: SimEvent[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) {
      const next = engine.tick();
      events.push(...next.events);
    }
  };
  return { engine, ids, start, events, run };
}

const queue = (engine: SimulationEngine, ids: number[], x: number, y: number) =>
  engine.enqueue({ type: 'move', unitIds: ids, to: { x, y }, queue: true });

describe('queued orders', () => {
  it('shift appends: the current order keeps running and the queued one waits', () => {
    const { engine, ids, start, run } = battle();
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x + 2, y: start.y } });
    queue(engine, ids, start.x + 2, start.y - 2);
    run(1);
    const frame = engine.frame();
    expect(frame.queuedOrders).toHaveLength(1);
    expect(frame.queuedOrders![0]).toMatchObject({ squadId: 1, order: 'move' });
    expect(engine.units.filter((unit) => unit.squadId === 1).every((unit) => unit.currentOrder === 'move')).toBe(true);
    // Still walking to the first destination.
    expect(engine.orderQueues.get(1)).toHaveLength(1);
  });

  it('runs in order: the queued order starts when the current one completes', () => {
    const { engine, ids, start, events, run } = battle();
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x + 2, y: start.y } });
    queue(engine, ids, start.x + 2, start.y - 2);
    run(1);
    for (let tick = 0; tick < 300 && (engine.frame().queuedOrders?.length ?? 0) > 0; tick += 1) run(1);
    expect(engine.frame().queuedOrders ?? []).toHaveLength(0);
    expect(engine.units.filter((unit) => unit.squadId === 1).every((unit) => unit.currentOrder === 'move')).toBe(true);
    expect(events.some((event) => event.type === 'command_rejected')).toBe(false);
  });

  it('halt clears the queue', () => {
    const { engine, ids, start, run } = battle();
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x + 2, y: start.y } });
    queue(engine, ids, start.x + 2, start.y - 2);
    queue(engine, ids, start.x + 4, start.y - 2);
    run(1);
    expect(engine.frame().queuedOrders).toHaveLength(2);
    engine.enqueue({ type: 'hold', unitIds: ids });
    run(1);
    expect(engine.frame().queuedOrders).toBeUndefined();
    expect(engine.orderQueues.size).toBe(0);
  });

  it('an order invalid at activation is dropped and the next runs', () => {
    const { engine, ids, start, events, run } = battle();
    const enemy = engine.units.find((unit) => unit.faction === 'legalist')!;
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x + 2, y: start.y } });
    engine.enqueue({ type: 'attack', unitIds: ids, targetId: enemy.id, queue: true });
    queue(engine, ids, start.x + 2, start.y - 2);
    run(1);
    expect(engine.frame().queuedOrders).toHaveLength(2);
    // The target falls while the section walks to its first destination.
    enemy.alive = false;
    for (let tick = 0; tick < 400 && (engine.frame().queuedOrders?.length ?? 0) > 0; tick += 1) run(1);
    expect(events.some((event) => event.type === 'command_rejected' && event.reason === 'invalid_target')).toBe(true);
    expect(engine.frame().queuedOrders ?? []).toHaveLength(0);
    expect(engine.units.filter((unit) => unit.squadId === 1).every((unit) => unit.currentOrder === 'move')).toBe(true);
  });

  it('queue limit: a fourth queued order is refused', () => {
    const { engine, ids, start, events, run } = battle();
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x + 2, y: start.y } });
    queue(engine, ids, start.x + 2, start.y - 2);
    queue(engine, ids, start.x + 4, start.y - 2);
    queue(engine, ids, start.x + 6, start.y - 2);
    queue(engine, ids, start.x + 8, start.y - 2);
    run(1);
    expect(engine.frame().queuedOrders).toHaveLength(3);
    expect(events.some((event) => event.type === 'command_rejected' && event.reason === 'queue_full')).toBe(true);
  });

  it('a queued order is validated when it is given', () => {
    const { engine, ids, start, events, run } = battle();
    engine.enqueue({ type: 'move', unitIds: ids, to: { x: start.x + 2, y: start.y } });
    const enemy = engine.frame().units.find((unit) => unit.faction === 'legalist')!;
    engine.enqueue({ type: 'incapacitate', targetId: enemy.id });
    engine.enqueue({ type: 'attack', unitIds: ids, targetId: enemy.id, queue: true });
    run(1);
    expect(engine.frame().queuedOrders ?? []).toHaveLength(0);
    expect(events.some((event) => event.type === 'command_rejected' && event.reason === 'invalid_target')).toBe(true);
  });
});
