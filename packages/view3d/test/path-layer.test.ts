import { describe, expect, it } from 'vitest';
import type { OrderPath } from '@prestes/shared';
import { buildPathVertices } from '../src/path-layer';

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
