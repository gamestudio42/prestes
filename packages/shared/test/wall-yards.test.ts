import { describe, expect, it } from 'vitest';
import { battleMap, compileMapDocument, createEditableMap, loadAuthoredMap, positionsFor, toMapDocument, type EditableMap, type Vec2 } from '../src';

// author-game-maps: walled yards on authored maps are found from their walls.

function withWalls(walls: { height: number; points: Vec2[] }[]) {
  const map: EditableMap = createEditableMap({ id: 'yard-sample', size: 'medium', name: { en: 'Yard', 'pt-BR': 'Pátio' } });
  walls.forEach((wall, index) => map.lines.push({ id: index + 1, kind: 'stone-wall', height: wall.height, points: wall.points }));
  const compiled = compileMapDocument(toMapDocument(map));
  return { compiled, yards: positionsFor(compiled).filter((position) => position.kind === 'yard') };
}

const U = [{ x: 0, y: 20 }, { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }];

describe('walled yards from authored walls', () => {
  it('three walls and two short ones with a 10 m gate make a yard: the gate its entrance, the ports facing out', () => {
    const { yards } = withWalls([
      { height: 1.6, points: U },
      { height: 1.6, points: [{ x: 0, y: 20 }, { x: 10, y: 20 }] },
      { height: 1.6, points: [{ x: 20, y: 20 }, { x: 30, y: 20 }] },
    ]);
    expect(yards).toHaveLength(1);
    const yard = yards[0]!;
    expect(yard.entrances).toHaveLength(1);
    expect(yard.entrances[0]!.x).toBeCloseTo(15);
    expect(yard.entrances[0]!.y).toBeCloseTo(20);
    expect(yard.capacity).toBeGreaterThan(0);
    expect(yard.capacity).toBeLessThanOrEqual(12);
    expect(yard.ports.every((port) => (port.x - yard.x) * port.facing.x + (port.y - yard.y) * port.facing.y > 0)).toBe(true);
  });

  it('enclosed enough: an open U is a yard, an L is not', () => {
    // 70 m of wall round a 100 m outline: a yard (gap 30 m is no gate, but it is enclosed enough).
    expect(withWalls([{ height: 1.6, points: U }]).yards).toHaveLength(1);
    // An L: 50 m of wall round a 100 m outline: not a yard.
    expect(withWalls([{ height: 1.6, points: [{ x: 0, y: 20 }, { x: 0, y: 0 }, { x: 30, y: 0 }] }]).yards).toHaveLength(0);
  });

  it('low walls, a straight wall and a field-sized enclosure are not yards', () => {
    expect(withWalls([{ height: 1.2, points: [...U, { x: 0, y: 20 }] }]).yards).toHaveLength(0);
    expect(withWalls([{ height: 2, points: [{ x: -60, y: 0 }, { x: 60, y: 0 }] }]).yards).toHaveLength(0);
    expect(withWalls([{ height: 2, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }] }]).yards).toHaveLength(0);
  });

  it('the test map\'s walled yard is a position by the column', async () => {
    await loadAuthoredMap('campo-de-provas');
    const map = battleMap('campo-de-provas');
    const yard = positionsFor(map).find((position) => position.kind === 'yard');
    expect(yard).toBeDefined();
    expect(yard!.entrances).toHaveLength(1);
    expect(yard!.entrances[0]).toMatchObject({ x: 33, y: 66 });
  });
});
