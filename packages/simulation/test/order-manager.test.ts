import { describe, expect, it } from 'vitest';
import { OrderManager, type OrderSubject } from '../src/order-manager';

function subject(id: number, overrides: Partial<OrderSubject> = {}): OrderSubject {
  return {
    id,
    alive: true,
    routed: false,
    incapacitated: false,
    beingCarriedBy: null,
    state: 'steady',
    ...overrides,
  };
}

describe('OrderManager', () => {
  it('rejects empty, unknown and exclusive soldier states', () => {
    const manager = new OrderManager();
    const units = [
      subject(1),
      subject(2, { alive: false }),
      subject(3, { incapacitated: true }),
      subject(4, { beingCarriedBy: 9 }),
      subject(5, { state: 'panicked' }),
    ];
    expect(manager.resolve([], units).rejection).toBe('empty_units');
    expect(manager.resolve([99], units).rejection).toBe('unknown_unit');
    expect(manager.resolve([2], units).rejection).toBe('invalid_state');
    expect(manager.resolve([3], units).rejection).toBe('invalid_state');
    expect(manager.resolve([4], units).rejection).toBe('invalid_state');
    expect(manager.resolve([5], units).rejection).toBe('invalid_state');
    expect(manager.resolve([1, 3], units).actionable.map((unit) => unit.id)).toEqual([1]);
  });

  it('exposes priority and task contracts', () => {
    const manager = new OrderManager();
    expect(manager.priorityFor('rescue')).toBe('interrupt');
    expect(manager.priorityFor('move')).toBe('primary');
    expect(manager.taskFor('rescue')).toBe('carry');
    expect(manager.taskFor('suppress')).toBe('suppress');
    expect(manager.taskFor('protect-officer')).toBe('move');
    expect(manager.taskFor(null)).toBeNull();
  });
});
