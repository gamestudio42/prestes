import { describe, expect, it } from 'vitest';
import type { OrderPath } from '@prestes/shared';
import { buildPathVertices, selectedOrders } from '../src/path-layer';

const order = (points: OrderPath['points']): OrderPath => ({
  id: 1,
  unitIds: [1, 2],
  points,
  kind: 'move',
});

describe('buildPathVertices', () => {
  it('returns an empty buffer for no orders', () => {
    expect(buildPathVertices([], 70).length).toBe(0);
  });

  it('builds dashes and waypoint crosses', () => {
    const vertices = buildPathVertices([order([{ x: 0, y: 0 }, { x: 20, y: 0 }])], 70);
    expect(vertices.length).toBeGreaterThan(12);
    expect(vertices.length % 3).toBe(0);
  });

  it('adds crosses for every point', () => {
    const onePoint = buildPathVertices([order([{ x: 0, y: 0 }])], 70);
    const twoPoints = buildPathVertices(
      [order([{ x: 0, y: 0 }, { x: 4, y: 0 }])],
      70,
    );
    expect(twoPoints.length).toBeGreaterThan(onePoint.length);
  });
});

describe('routes of the selection only', () => {
  const order = (id: number, unitIds: number[]) => ({ id, unitIds, points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], kind: 'move' as const });
  it('draws only the orders of selected soldiers, and none without a selection', () => {
    const orders = [order(1, [1, 2]), order(2, [12, 13]), order(3, [45])];
    expect(selectedOrders(orders, [2]).map((entry) => entry.id)).toEqual([1]);
    expect(selectedOrders(orders, [13, 45]).map((entry) => entry.id)).toEqual([2, 3]);
    expect(selectedOrders(orders, [])).toEqual([]);
  });
});
