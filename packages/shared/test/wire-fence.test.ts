import { afterEach, describe, expect, it } from 'vitest';
import {
  compileMapDocument,
  coverAgainst,
  createEditableMap,
  findPath,
  isLineOnWire,
  isPointBlockedByCovers,
  isPointOnWire,
  setActiveMap,
  toMapDocument,
  type CoverPoint,
  type Vec2,
} from '../src';
import { TEST_MAP } from './fixtures/test-map';

afterEach(() => setActiveMap(TEST_MAP));

// refine-battle-controls: barbed wire is walkable, gives no cover and blocks
// neither sight nor fire.
const LINE: Vec2[] = [
  { x: -30, y: 0 },
  { x: 30, y: 0 },
];

function wireMap() {
  const editable = createEditableMap({ id: 'wire-field', size: 'medium', name: { en: 'Wire field', 'pt-BR': 'Campo de arame' } });
  editable.lines.push({ id: 1, kind: 'wire-fence', height: 1.2, points: LINE });
  return compileMapDocument(toMapDocument(editable));
}

describe('barbed wire', () => {
  it('a compiled wire fence is marked wire, gives no cover and blocks no sight', () => {
    const map = wireMap();
    const wire = map.covers.find((cover) => cover.wire === true)!;
    expect(wire).toBeDefined();
    expect(wire.blocksMovement).toBe(true);
    expect(wire.blocksSight).toBe(false);
    expect(wire.quality).toBe(0);
    expect(coverAgainst(0, 6, 0, -6, 'standing', map.covers)).toBe(0);
  });

  it('does not block movement or a path', () => {
    const map = wireMap();
    setActiveMap(map);
    const wire = map.covers.find((cover) => cover.wire === true)!;
    expect(isPointBlockedByCovers(wire.x, wire.y, map.covers, 0)).toBe(false);
    const path = findPath({ x: 0, y: 10 }, { x: 0, y: -10 }, map.covers);
    expect(path.length).toBeGreaterThan(0);
  });

  it('a board fence still blocks movement', () => {
    const editable = createEditableMap({ id: 'board-field', size: 'medium', name: { en: 'Board field', 'pt-BR': 'Campo de tábuas' } });
    editable.lines.push({ id: 1, kind: 'board-fence', height: 1.8, points: LINE });
    const map = compileMapDocument(toMapDocument(editable));
    const fence = map.covers.find((cover) => cover.kind === 'fence')!;
    expect(fence.wire).toBeUndefined();
    expect(isPointBlockedByCovers(fence.x, fence.y, map.covers, 0)).toBe(true);
  });
});

// route-around-wire: a route goes round wire by a near gap and crosses only when the way round is far.
function fencedMap(id: string, lines: Vec2[][]) {
  const editable = createEditableMap({ id, size: 'medium', name: { en: id, 'pt-BR': id } });
  lines.forEach((points, index) => editable.lines.push({ id: index + 1, kind: 'wire-fence', height: 1.2, points }));
  const map = compileMapDocument(toMapDocument(editable));
  setActiveMap(map);
  return map;
}

/** The legs of a route from its start that enter wire. */
function wireLegs(start: Vec2, path: readonly Vec2[], covers: readonly CoverPoint[]): Vec2[] {
  const legs: Vec2[] = [];
  let from = start;
  for (const point of path) {
    if (isLineOnWire(from.x, from.y, point.x, point.y, covers, 0)) legs.push(point);
    from = point;
  }
  return legs;
}

describe('routes round barbed wire', () => {
  const start = { x: 0, y: 5 };
  const goal = { x: 0, y: -5 };

  it('tells a point and a segment on a rotated wire piece', () => {
    const wire: CoverPoint = {
      id: 1, kind: 'fence', x: 0, y: 0, rotation: Math.PI / 4, halfWidth: 5, halfDepth: 0.15,
      height: 1.2, radius: 0.5, quality: 0, blocksMovement: true, blocksSight: false, wire: true,
    };
    const along = { x: Math.cos(Math.PI / 4), y: Math.sin(Math.PI / 4) };
    expect(isPointOnWire(along.x * 3, along.y * 3, [wire])).toBe(true);
    expect(isPointOnWire(-along.y * 1, along.x * 1, [wire], 0.8)).toBe(false);
    expect(isPointOnWire(-along.y * 0.7, along.x * 0.7, [wire], 0.8)).toBe(true);
    expect(isLineOnWire(-along.y * 3, along.x * 3, along.y * 3, -along.x * 3, [wire])).toBe(true);
    expect(isLineOnWire(-along.y * 3, along.x * 3, -along.y * 3 + along.x * 4, along.x * 3 + along.y * 4, [wire])).toBe(false);
  });

  it('takes a near gap and touches no wire', () => {
    // A 6 m gap centred 6 m to the side: the way round adds about 6 m.
    const map = fencedMap('wire-near-gap', [
      [{ x: -60, y: 0 }, { x: 3, y: 0 }],
      [{ x: 9, y: 0 }, { x: 60, y: 0 }],
    ]);
    const path = findPath(start, goal, map.covers);
    expect(path.at(-1)).toEqual(goal);
    expect(wireLegs(start, path, map.covers)).toEqual([]);
    expect(Math.max(...path.map((point) => Math.abs(point.x)))).toBeLessThan(12);
  });

  it('crosses when the only gap is far, once, near the straight way', () => {
    // The gap centred 40 m to the side would add about 70 m.
    const map = fencedMap('wire-far-gap', [
      [{ x: -60, y: 0 }, { x: 37, y: 0 }],
      [{ x: 43, y: 0 }, { x: 60, y: 0 }],
    ]);
    const path = findPath(start, goal, map.covers);
    expect(path.at(-1)).toEqual(goal);
    expect(wireLegs(start, path, map.covers).length).toBeGreaterThan(0);
    expect(Math.max(...path.map((point) => Math.abs(point.x)))).toBeLessThan(5);
    // One crossing: the route is on one side of the fence, then on the other.
    let sides = 0;
    let last = Math.sign(start.y);
    for (const point of path) {
      const side = Math.abs(point.y) < 1 ? last : Math.sign(point.y);
      if (side !== last) sides += 1;
      last = side;
    }
    expect(sides).toBe(1);
  });
});
