import { describe, expect, it } from 'vitest';
import {
  compileMapDocument,
  coverAgainst,
  createEditableMap,
  findPath,
  isPointBlockedByCovers,
  setActiveMap,
  toMapDocument,
  type Vec2,
} from '../src';

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
