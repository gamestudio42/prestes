import { afterEach, describe, expect, it } from 'vitest';
import {
  buildingOpenings,
  compileMapDocument,
  createEditableMap,
  toMapDocument,
  VEGETATION_KINDS,
  buildingPosition,
  EYE_HEIGHTS,
  isLineBlocked,
  positionsFor,
  setActiveMap,
  type Building,
  type CoverPoint,
} from '../src';
import { TEST_MAP } from './fixtures/test-map';

// garrison-and-assault 1.3: upper floors and lofts, and sight from them.

afterEach(() => setActiveMap(TEST_MAP));

const TARGET_X = -44;

const building = (overrides: Partial<Building>): Building => ({
  id: 9,
  model: 'casa-terrea',
  x: 0,
  y: 0,
  rotation: 0,
  halfWidth: 5,
  halfDepth: 5,
  height: 8,
  ...overrides,
});

const eye = (elevation = 0) => EYE_HEIGHTS.standing + elevation;

describe('elevated ports (garrison-and-assault 1.3)', () => {
  it("the spec's eye heights: sobrado 4.6 m, factory and station armazéns 5 m, lofts 4 m", () => {
    const cases: [Building['model'], number][] = [
      ['sobrado', 4.6],
      ['factory', 5],
      ['warehouse', 5],
      ['casa-sede', 4],
      ['engenho', 4],
    ];
    for (const [model, height] of cases) {
      const upper = buildingPosition(building({ model, halfWidth: 8, halfDepth: 5, height: 7 }))!.ports.filter((port) => port.level === 1);
      expect(upper.length, model).toBeGreaterThan(0);
      for (const port of upper) expect(eye(port.elevation), model).toBeCloseTo(height);
    }
    for (const model of ['casa-terrea', 'venda', 'armazem', 'barn'] as const) {
      expect(buildingPosition(building({ model }))!.ports.some((port) => port.level !== undefined), model).toBe(false);
    }
  });

  it("a loft's windows are in its gable ends, half as many as the ground floor's", () => {
    // Wider than deep: the ridge runs along the width and the gables are the side walls.
    const openings = buildingOpenings(building({ model: 'casa-sede', halfWidth: 7, halfDepth: 5, height: 6.5 }));
    const loft = openings.windows.filter((window) => window.level === 1);
    expect(new Set(loft.map((window) => window.wall))).toEqual(new Set(['left', 'right']));
    expect(loft.filter((window) => window.wall === 'left')).toHaveLength(2);
    expect(openings.windows.filter((window) => window.wall === 'left' && window.level === 0)).toHaveLength(4);
    // Deeper than wide: the gables are the front and the back.
    const deep = buildingOpenings(building({ model: 'engenho', halfWidth: 4, halfDepth: 8, height: 7 }));
    expect(new Set(deep.windows.filter((window) => window.level === 1).map((window) => window.wall))).toEqual(new Set(['front', 'back']));
  });

  it('over the corn from the loft: the casa-sede loft sees a standing man beyond a cornfield that its ground floor cannot', () => {
    // author-game-maps 3.1: a small authored map, a casa-sede with a cornfield off its west gable.
    const editable = createEditableMap({ id: 'loft-corn', size: 'medium', name: { en: 'Loft', 'pt-BR': 'Sótão' } });
    editable.objects.push({ id: 1, type: 'casa-sede', x: 0, y: 0, rotation: 0 });
    const side = Math.sqrt(editable.vegetation.length);
    const corn = VEGETATION_KINDS.indexOf('corn') + 1;
    for (let y = -15; y < 15; y += 1) for (let x = -40; x < -14; x += 1) editable.vegetation[(y + side / 2) * side + (x + side / 2)] = corn;
    const map = compileMapDocument(toMapDocument(editable));
    setActiveMap(map);
    const casaSede = positionsFor(map).find((position) => position.model === 'casa-sede')!;
    // The west gable faces the cornfield (x −40 to −14); the man stands just beyond it.
    const west = casaSede.ports.filter((port) => port.facing.x < -0.9);
    const target = { x: TARGET_X, y: 0 };
    const sees = (port: (typeof west)[number]) =>
      !isLineBlocked(port.x, port.y, target.x, target.y, map.covers, [], eye(port.elevation), eye());
    const ground = west.filter((port) => port.level === undefined);
    const loft = west.filter((port) => port.level === 1);
    expect(ground.length).toBeGreaterThan(0);
    expect(loft.length).toBeGreaterThan(0);
    expect(ground.some(sees)).toBe(false);
    expect(loft.every(sees)).toBe(true);
    // And he sees the man in the loft in turn.
    for (const port of loft) expect(isLineBlocked(target.x, target.y, port.x, port.y, map.covers, [], eye(), eye(port.elevation))).toBe(false);
  });

  it('an upper window sees over a 1.8 m wall the ground floor cannot, and is seen over it in turn', () => {
    const sobrado = buildingPosition(building({ model: 'sobrado', halfWidth: 5, halfDepth: 6, height: 8 }))!;
    // A quintal wall 20 m in front of the sobrado, a crouched man 10 m behind it.
    const wall = { id: 1, kind: 'wall', x: 0, y: 26, halfWidth: 10, halfDepth: 0.2, height: 1.8, rotation: 0 } as unknown as CoverPoint;
    const covers = [wall];
    const target = { x: 0, y: 36 };
    const crouched = EYE_HEIGHTS.crouched;
    const front = sobrado.ports.filter((port) => port.facing.y > 0.9 && Math.abs(port.x) < 2);
    const ground = front.find((port) => port.level === undefined)!;
    const upper = front.find((port) => port.level === 1)!;
    expect(isLineBlocked(ground.x, ground.y, target.x, target.y, covers, [], eye(), crouched)).toBe(true);
    expect(isLineBlocked(upper.x, upper.y, target.x, target.y, covers, [], eye(upper.elevation), crouched)).toBe(false);
    expect(isLineBlocked(target.x, target.y, upper.x, upper.y, covers, [], crouched, eye(upper.elevation))).toBe(false);
    // Right behind the wall he is hidden even from upstairs.
    expect(isLineBlocked(upper.x, upper.y, 0, 26.6, covers, [], eye(upper.elevation), crouched)).toBe(true);
  });
});
