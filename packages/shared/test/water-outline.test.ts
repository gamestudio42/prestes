import { afterEach, describe, expect, it } from 'vitest';
import {
  compileMapDocument,
  createEditableMap,
  distanceToPolyline,
  loopArea,
  outlineShapes,
  setActiveMap,
  smoothCentreline,
  traceWaterOutlines,
  waterAt,
  type Vec2,
} from '../src';
import { TEST_MAP } from './fixtures/test-map';

// refine-map-editor 4.2: smoothed river centrelines, traced water outlines.
afterEach(() => setActiveMap(TEST_MAP));

function riverMap(points: Vec2[], kinds: ('deep' | 'ford')[] = ['deep']) {
  const map = createEditableMap({ id: 'river-doc', size: 'small', name: { en: 'R', 'pt-BR': 'R' } });
  map.rivers.push({ id: 1, width: 12, points, kinds });
  return compileMapDocument(map);
}

function turn(a: Vec2, b: Vec2, c: Vec2): number {
  const first = Math.atan2(b.y - a.y, b.x - a.x);
  const second = Math.atan2(c.y - b.y, c.x - b.x);
  return Math.abs(Math.atan2(Math.sin(second - first), Math.cos(second - first)));
}

describe('water outlines', () => {
  it('diagonal river bank: the outline follows the bank line, with no 1 m staircase', () => {
    // A straight river at 30 degrees to the grid.
    const angle = Math.PI / 6;
    const centre = [
      { x: -150 * Math.cos(angle), y: -150 * Math.sin(angle) },
      { x: 150 * Math.cos(angle), y: 150 * Math.sin(angle) },
    ];
    const map = riverMap(centre);
    const loops = traceWaterOutlines(map, map.water.filter((area) => area.kind === 'deep'));
    expect(loops).toHaveLength(1);
    // Walking the outline every 25 cm inside the map, it stays on the bank line
    // within 6 cm (a 1 m staircase strays up to 0.5 m from it).
    const loop = loops[0]!;
    let checked = 0;
    for (let index = 0; index < loop.length; index += 1) {
      const a = loop[index]!;
      const b = loop[(index + 1) % loop.length]!;
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.25);
      for (let step = 0; step < steps; step += 1) {
        const point = { x: a.x + ((b.x - a.x) * step) / steps, y: a.y + ((b.y - a.y) * step) / steps };
        if (Math.abs(point.x) > 110 || Math.abs(point.y) > 110) continue;
        expect(Math.abs(distanceToPolyline(point.x, point.y, centre) - 6)).toBeLessThan(0.06);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(1000);
    // Simplified: each bank is a handful of vertices, not one per cell.
    expect(loops[0]!.length).toBeLessThan(24);
    // The simulation's water follows the same line.
    setActiveMap(map);
    const across = { x: -Math.sin(angle), y: Math.cos(angle) };
    expect(waterAt(across.x * 5.4, across.y * 5.4)).toBe(2);
    expect(waterAt(across.x * 6.6, across.y * 6.6)).toBe(0);
  });

  it('a bent centreline is smoothed every 2 m through its corner points', () => {
    const points = [
      { x: -100, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ];
    const smoothed = smoothCentreline(points);
    expect(smoothed.points[0]).toEqual(points[0]);
    expect(smoothed.points).toContainEqual(points[1]);
    expect(smoothed.points.at(-1)).toEqual(points[2]);
    expect(smoothed.source).toHaveLength(smoothed.points.length - 1);
    for (let index = 0; index + 1 < smoothed.points.length; index += 1) {
      const a = smoothed.points[index]!;
      const b = smoothed.points[index + 1]!;
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(2.05);
    }
    // No sharp corner: the 90 degree bend is spread over many pieces.
    for (let index = 1; index + 1 < smoothed.points.length; index += 1) {
      expect(turn(smoothed.points[index - 1]!, smoothed.points[index]!, smoothed.points[index + 1]!)).toBeLessThan(Math.PI / 8);
    }
  });

  it('a ford reach keeps its kind and its crossing ends after smoothing', () => {
    const map = riverMap(
      [
        { x: -110, y: 0 },
        { x: -20, y: 10 },
        { x: 20, y: 10 },
        { x: 110, y: 0 },
      ],
      ['deep', 'ford', 'deep'],
    );
    expect(map.water.map((area) => area.kind)).toEqual(['deep', 'ford', 'deep']);
    const ford = map.water[1]!;
    expect(ford.strip!.points[0]).toEqual({ x: -20, y: 10 });
    expect(ford.strip!.points.at(-1)).toEqual({ x: 20, y: 10 });
    expect(ford.ends![0].x).toBeCloseTo(0, 5);
    // The ford's own outline leaves out the deep reaches.
    const loops = traceWaterOutlines(map, [ford], map.water.filter((area) => area.kind === 'deep'));
    expect(loops).toHaveLength(1);
    for (const point of loops[0]!) expect(point.x).toBeGreaterThan(-26);
  });

  it('a pond with an island traces an outer loop and a hole', () => {
    const map = riverMap([
      { x: -110, y: 80 },
      { x: -60, y: 80 },
    ]);
    const ring = (radius: number): Vec2[] => Array.from({ length: 24 }, (_, index) => ({ x: radius * Math.cos((index / 24) * Math.PI * 2), y: radius * Math.sin((index / 24) * Math.PI * 2) }));
    const outer = { kind: 'deep' as const, polygon: ring(20) };
    const loops = traceWaterOutlines(map, [outer], [{ kind: 'deep', polygon: ring(8) }]);
    const shapes = outlineShapes(loops);
    expect(shapes).toHaveLength(1);
    expect(shapes[0]!.holes).toHaveLength(1);
    expect(Math.sign(loopArea(shapes[0]!.holes[0]!))).toBe(-Math.sign(loopArea(shapes[0]!.outer)));
  });
});
