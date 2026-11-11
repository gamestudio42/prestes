import { afterEach, describe, expect, it } from 'vitest';
import {
  activeMapRuntime,
  compileMapDocument,
  concealmentDistance,
  createEditableMap,
  growableCell,
  growthMask,
  maskedVegetation,
  setActiveMap,
  validateEditableMap,
  vegetationAt,
  VEGETATION_KINDS,
  type EditableMap,
} from '../src';
import { TEST_MAP } from './fixtures/test-map';

// refine-map-editor 3.1: one vegetation mask for the brush, the compiler and the check.
afterEach(() => setActiveMap(TEST_MAP));

const SCRUB = VEGETATION_KINDS.indexOf('scrub') + 1;
const GRASS = VEGETATION_KINDS.indexOf('tall-grass') + 1;

function flat(): EditableMap {
  return createEditableMap({ id: 'mask-doc', size: 'small', name: { en: 'M', 'pt-BR': 'M' } });
}

/** The cell index of a point on a 240 m map. */
const cell = (x: number, y: number) => Math.floor(y + 120) * 240 + Math.floor(x + 120);

describe('growth mask', () => {
  it('nothing grows under water: a river clears its cells, its banks stay', () => {
    const map = flat();
    map.rivers.push({ id: 1, width: 14, points: [{ x: -120, y: 0 }, { x: 120, y: 0 }], kinds: ['deep'] });
    const mask = growthMask(map);
    expect(mask[cell(0, 0)]).toBe(0);
    expect(mask[cell(0, 6.5)]).toBe(0);
    expect(mask[cell(0, 10)]).toBe(1);
    expect(mask[cell(0, -10)]).toBe(1);
    expect(growableCell(map, 0, 0)).toBe(false);
    expect(growableCell(map, 0, 12)).toBe(true);
  });

  it('ford without scrub: scrub cells on a ford are cleared, and a man there is not concealed', () => {
    const map = flat();
    map.rivers.push({ id: 1, width: 10, points: [{ x: -120, y: 0 }, { x: 120, y: 0 }], kinds: ['ford'] });
    for (let y = -20; y < 20; y += 1) for (let x = -20; x < 20; x += 1) map.vegetation[cell(x, y)] = SCRUB;
    const compiled = compileMapDocument(map);
    setActiveMap(compiled);
    expect(vegetationAt(0.5, 0.5)).toBeNull();
    expect(concealmentDistance(activeMapRuntime(), 0.5, 0.5, 'crouched', false)).toBeNull();
    // The bank keeps its scrub.
    expect(vegetationAt(0.5, 15.5)).toBe('scrub');
  });

  it('clears bridges, paved and cobbled roads, buildings and trench channels, not dirt roads', () => {
    const map = flat();
    map.vegetation.fill(GRASS);
    map.roads.push({ id: 1, type: 'paved-road', width: 6, ditches: { left: false, right: false }, points: [{ x: -100, y: -60 }, { x: 100, y: -60 }] });
    map.roads.push({ id: 2, type: 'cobbled-street', width: 7, ditches: { left: false, right: false }, points: [{ x: -100, y: -40 }, { x: 100, y: -40 }] });
    map.roads.push({ id: 3, type: 'dirt-road', width: 5, ditches: { left: false, right: false }, points: [{ x: -100, y: 60 }, { x: 100, y: 60 }] });
    map.bridges.push({ id: 1, x: 40, y: 20, rotation: 0, halfWidth: 3, halfDepth: 8, deckHeight: 1.6 });
    map.objects.push({ id: 1, type: 'farmhouse', x: -40, y: 20, rotation: 0 });
    map.trenches.push({ id: 1, kind: 'communication', depth: 0.8, facing: 'left', bays: false, parapet: 'earth', points: [{ x: 0, y: 80 }, { x: 0, y: 100 }] });
    const mask = growthMask(map);
    expect(mask[cell(0, -60)]).toBe(0);
    expect(mask[cell(0, -40)]).toBe(0);
    expect(mask[cell(40, 20)]).toBe(0);
    expect(mask[cell(-40, 20)]).toBe(0);
    expect(mask[cell(0, 90)]).toBe(0);
    // A dirt road is not masked (the compiler clears its own surface).
    expect(mask[cell(0, 60)]).toBe(1);
    expect(mask[cell(0, 0)]).toBe(1);
  });

  it('water drawn over a field: the check warns and the compiled map has no corn in the pond', () => {
    const map = flat();
    const corn = VEGETATION_KINDS.indexOf('corn') + 1;
    for (let y = -20; y < 20; y += 1) for (let x = -20; x < 20; x += 1) map.vegetation[cell(x, y)] = corn;
    map.ponds.push({ id: 1, kind: 'deep', polygon: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }] });
    const masked = maskedVegetation(map);
    expect(masked.count).toBe(400);
    const warning = validateEditableMap(map).find((problem) => problem.code === 'masked-vegetation');
    expect(warning).toMatchObject({ severity: 'warning', params: { count: 400 } });
    setActiveMap(compileMapDocument(map));
    expect(vegetationAt(0.5, 0.5)).toBeNull();
    expect(vegetationAt(15.5, 15.5)).toBe('corn');
  });
});
