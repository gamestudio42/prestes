import { afterEach, describe, expect, it } from 'vitest';
import {
  allCoverSlots,
  buildTrenchLine,
  CATALOG_OBJECTS,
  compileMapDocument,
  coverAgainst,
  coverForStance,
  coverSlots,
  createEditableMap,
  EYE_HEIGHTS,
  isLineBlocked,
  MAP_DOCUMENT_VERSION,
  parseMapDocument,
  setActiveMap,
  terrainHeightAt,
  terrainSurfaceAt,
  toMapDocument,
  trenchSlotCount,
  VILA_MILITAR,
  type EditableMap,
  type TrenchLineDef,
} from '../src';

afterEach(() => setActiveMap(VILA_MILITAR));

function flat(): EditableMap {
  return createEditableMap({ id: 'trench-doc', size: 'small', name: { en: 'Test', 'pt-BR': 'Teste' } });
}

/** A straight fire trench along y = 0 from x -30 to 30; travelling east, left is north. */
function fireTrench(extra: Partial<TrenchLineDef> = {}): TrenchLineDef {
  return { id: 1, kind: 'fire', depth: 1.2, facing: 'left', bays: true, parapet: 'earth', points: [{ x: -30, y: 0 }, { x: 30, y: 0 }], ...extra };
}

describe('map document version 2', () => {
  it('old file opens: trench objects become 12 m fire trenches facing as they did, cambers dropped', () => {
    const v1 = toMapDocument(flat()) as unknown as Record<string, unknown>;
    v1.version = 1;
    delete v1.trenches;
    v1.roads = [{ id: 1, type: 'dirt-road', width: 5, camber: 0.1, ditches: { left: false, right: false }, points: [{ x: -50, y: 30 }, { x: 50, y: 30 }] }];
    // The old object's sandbags were on its local north: rotation 0 faces north, π faces south.
    v1.objects = [
      { id: 1, type: 'trench-line', x: 0, y: -40, rotation: 0 },
      { id: 2, type: 'trench-line', x: 20, y: 40, rotation: Math.PI },
      { id: 3, type: 'boulder', x: 10, y: 10, rotation: 0 },
    ];
    const result = parseMapDocument(v1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const doc = result.document;
    expect(doc.trenches).toHaveLength(2);
    expect(doc.objects.map((object) => object.type)).toEqual(['boulder']);
    expect('camber' in doc.roads[0]!).toBe(false);
    for (const [index, line] of doc.trenches.entries()) {
      const [a, b] = line.points;
      expect(Math.hypot(b!.x - a!.x, b!.y - a!.y)).toBeCloseTo(12, 6);
      expect(line.kind).toBe('fire');
      const front = buildTrenchLine(line, 1).covers.find((cover) => cover.kind === 'trench')!.facing!;
      expect(front.y).toBeCloseTo(index === 0 ? -1 : 1, 6);
    }
  });

  it('round trip writes the current version', () => {
    const map = flat();
    map.trenches.push(fireTrench());
    const doc = toMapDocument(map);
    expect(doc.version).toBe(MAP_DOCUMENT_VERSION);
    const parsed = parseMapDocument(JSON.parse(JSON.stringify(doc)) as unknown);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.document.trenches).toEqual(map.trenches);
  });

  it('rejects a malformed trench line', () => {
    const doc = toMapDocument(flat()) as unknown as Record<string, unknown>;
    doc.trenches = [{ id: 1, kind: 'fire', depth: 2, facing: 'left', bays: true, parapet: 'earth', points: [{ x: 0, y: 0 }, { x: 5, y: 0 }] }];
    expect(parseMapDocument(doc)).toMatchObject({ ok: false, detail: 'trenches' });
  });
});

describe('roads and relief', () => {
  it('road follows the relief: the height under its centre is the painted one', () => {
    const map = flat();
    // A 3 m rise under the road's middle.
    for (let row = 55; row <= 65; row += 1) for (let column = 55; column <= 65; column += 1) map.heights[row * 121 + column] = 300;
    map.roads.push({ id: 1, type: 'dirt-road', width: 5, ditches: { left: false, right: false }, points: [{ x: -100, y: 0 }, { x: 100, y: 0 }] });
    setActiveMap(compileMapDocument(map));
    expect(terrainHeightAt(0, 0)).toBeCloseTo(3, 5);
    expect(terrainHeightAt(-60, 0)).toBeCloseTo(0, 5);
    expect(terrainSurfaceAt(0.5, 0.5)).toBe('dirt-road');
  });

  it('cover in the ditch: the ditch still digs and shelters', () => {
    const map = flat();
    map.roads.push({ id: 1, type: 'dirt-road', width: 5, ditches: { left: false, right: true }, points: [{ x: -100, y: 0 }, { x: 100, y: 0 }] });
    const compiled = compileMapDocument(map);
    setActiveMap(compiled);
    expect(terrainHeightAt(0, 0)).toBeCloseTo(0, 5);
    expect(terrainHeightAt(0, 3.25)).toBeLessThan(-0.3);
    expect(coverAgainst(0, 3.25, 0, 60, 'prone', compiled.covers)).toBeGreaterThan(coverAgainst(0, -12, 0, 60, 'prone', compiled.covers));
  });
});

describe('trench lines', () => {
  it('fire step protects forward', () => {
    const built = buildTrenchLine(fireTrench(), 1);
    const slot = coverSlots(built.covers[0]!)[0]!;
    expect(coverAgainst(slot.x, slot.y, slot.x, -100, 'crouched', built.covers)).toBeGreaterThan(coverForStance('crouched'));
  });

  it('no protection from behind', () => {
    const built = buildTrenchLine(fireTrench(), 1);
    const slot = coverSlots(built.covers[0]!)[0]!;
    expect(coverAgainst(slot.x, slot.y, slot.x, 100, 'crouched', built.covers)).toBeCloseTo(coverForStance('crouched'), 6);
  });

  it('slots along a long trench: one per 1.2 m on the fire step, facing the parapet', () => {
    const line = fireTrench();
    const built = buildTrenchLine(line, 1);
    const slots = allCoverSlots(built.covers);
    expect(slots).toHaveLength(50);
    expect(trenchSlotCount(line)).toBe(50);
    for (const slot of slots) {
      expect(slot.y).toBeCloseTo(-0.45, 6);
      expect(slot.guard).toEqual({ x: expect.closeTo(0, 6) as number, y: -1 });
    }
    // Firing bays: a traverse every 10 m.
    expect(built.traverses).toHaveLength(5);
  });

  it('flipping the facing turns the parapet and the slots', () => {
    const built = buildTrenchLine(fireTrench({ facing: 'right' }), 1);
    const slots = allCoverSlots(built.covers);
    expect(slots.every((slot) => slot.y > 0 && slot.guard!.y === 1)).toBe(true);
    expect(built.parapet!.every((point) => point.y > 0)).toBe(true);
  });

  it('communication trench has no slots and shelters from both sides', () => {
    const line = fireTrench({ kind: 'communication', depth: 0.8, bays: false });
    const built = buildTrenchLine(line, 1);
    expect(allCoverSlots(built.covers)).toHaveLength(0);
    expect(trenchSlotCount(line)).toBe(0);
    expect(built.parapet).toBeNull();
    expect(built.traverses).toHaveLength(0);
    const north = coverAgainst(0, 0, 0, -100, 'crouched', built.covers);
    const south = coverAgainst(0, 0, 0, 100, 'crouched', built.covers);
    expect(north).toBeGreaterThan(coverForStance('crouched'));
    expect(south).toBeCloseTo(north, 6);
  });

  it('a sandbag parapet adds sandbags without slots', () => {
    const built = buildTrenchLine(fireTrench({ parapet: 'sandbag' }), 1);
    expect(built.covers.some((cover) => cover.kind === 'sandbag')).toBe(true);
    expect(allCoverSlots(built.covers)).toHaveLength(50);
  });

  it('a crouched man on the fire step sees over the parapet; a prone man on the floor does not', () => {
    const map = flat();
    map.trenches.push(fireTrench());
    const compiled = compileMapDocument(map);
    setActiveMap(compiled);
    const slot = allCoverSlots(compiled.covers).find((candidate) => Math.abs(candidate.x) < 2)!;
    expect(isLineBlocked(slot.x, slot.y, slot.x, -100, compiled.covers, [], EYE_HEIGHTS.crouched, EYE_HEIGHTS.crouched)).toBe(false);
    expect(isLineBlocked(slot.x, slot.y, slot.x, -100, compiled.covers, [], EYE_HEIGHTS.prone, EYE_HEIGHTS.prone)).toBe(true);
  });

  it('catalog has no trench object', () => {
    expect(CATALOG_OBJECTS.some((entry) => entry.id === 'trench-line')).toBe(false);
  });

  it('compiles a trench into the map: cut, floor surface, no plants, deterministic', () => {
    const map = flat();
    map.vegetation.fill(1);
    map.trenches.push(fireTrench());
    const a = compileMapDocument(map);
    const b = compileMapDocument(map);
    expect(a).toEqual(b);
    expect(a.trenches).toHaveLength(1);
    setActiveMap(a);
    expect(terrainHeightAt(0, 0)).toBeCloseTo(-0.5, 1);
    expect(terrainSurfaceAt(0.5, 0.5)).toBe('trench-floor');
    expect(a.raster!.vegetation[120 * 240 + 120]).toBe(0);
    expect(a.covers.filter((cover) => cover.kind === 'trench' && cover.facing)).toHaveLength(17);
  });
});
