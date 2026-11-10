import { afterEach, describe, expect, it } from 'vitest';
import {
  catalogObject,
  compileMapDocument,
  coverAgainst,
  createEditableMap,
  decodeRaster,
  encodeRaster,
  EYE_HEIGHTS,
  fromMapDocument,
  GROUND_MATERIALS,
  groundMaterialIndex,
  isLineBlocked,
  isPointBlockedByCovers,
  parseMapDocument,
  parseMapDocumentText,
  resizeEditableMap,
  setActiveMap,
  surfaceSpeed,
  terrainHeightAt,
  terrainSurfaceAt,
  toMapDocument,
  validateEditableMap,
  vegetationAt,
  VEGETATION_KINDS,
  VILA_MILITAR,
  activeMapRuntime,
  concealmentDistance,
  type EditableMap,
} from '../src';

afterEach(() => setActiveMap(VILA_MILITAR));

function flat(size: 'small' | 'medium' | 'large' = 'small'): EditableMap {
  return createEditableMap({ id: 'test-doc', size, name: { en: 'Test', 'pt-BR': 'Teste' } });
}

describe('raster codec', () => {
  it('round-trips i16 and u8 layers', () => {
    const heights = new Int16Array([0, 0, 0, -1200, 4000, 4000, 7, -7, 0]);
    const paint = new Uint8Array(1000).fill(3);
    paint[500] = 11;
    expect([...decodeRaster(encodeRaster(heights), 'i16')]).toEqual([...heights]);
    expect([...decodeRaster(encodeRaster(paint), 'u8')]).toEqual([...paint]);
  });

  it('keeps a flat large map small', () => {
    const raster = encodeRaster(new Uint8Array(640 * 640));
    expect(raster.data.length).toBeLessThan(16);
  });

  it('refuses a truncated raster', () => {
    const raster = encodeRaster(new Uint8Array(10).fill(1));
    expect(() => decodeRaster({ ...raster, length: 20 }, 'u8')).toThrow();
  });
});

describe('map document', () => {
  it('creates a medium map with ±200 m bounds, flat, base material', () => {
    const map = createEditableMap({ id: 'm', size: 'medium', baseMaterial: 'dry-grass' });
    const compiled = compileMapDocument(map);
    expect(compiled.bounds).toEqual({ minX: -200, minY: -200, maxX: 200, maxY: 200 });
    expect(map.heights.every((value) => value === 0)).toBe(true);
    expect(map.paint.every((value) => value === groundMaterialIndex('dry-grass'))).toBe(true);
  });

  it('round-trips through the file format to the same battle map', () => {
    const map = flat();
    map.heights[100] = 350;
    map.paint[2000] = groundMaterialIndex('mud');
    map.objects.push({ id: 1, type: 'boulder', x: 10, y: 5, rotation: 0.3 });
    const text = JSON.stringify(toMapDocument(map));
    const parsed = parseMapDocumentText(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const again = compileMapDocument(fromMapDocument(parsed.document));
    const first = compileMapDocument(map);
    expect([...again.height.kind === 'field' && again.height.grid ? again.height.grid.centimetres : []]).toEqual([
      ...(first.height.kind === 'field' && first.height.grid ? first.height.grid.centimetres : []),
    ]);
    expect(again.covers).toEqual(first.covers);
    expect([...again.raster!.surfaces]).toEqual([...first.raster!.surfaces]);
  });

  it('refuses a newer version and a file that is not a map', () => {
    const document = toMapDocument(flat());
    expect(parseMapDocument({ ...document, version: 99 })).toMatchObject({ ok: false, error: 'newer-version' });
    expect(parseMapDocumentText('{"hello": 1}')).toMatchObject({ ok: false, error: 'not-a-map' });
    expect(parseMapDocumentText('not json')).toMatchObject({ ok: false, error: 'not-a-map' });
    expect(parseMapDocument({ ...document, size: 'huge' })).toMatchObject({ ok: false, error: 'invalid' });
  });

  // author-game-maps 1.1: mission slot, the test map's use, the time of day.
  it('a new map lights at midday from the north-east; a version 3 file loads with the defaults', () => {
    const document = toMapDocument(flat());
    expect(document.version).toBe(4);
    expect(document.light).toEqual({ time: 12, bearing: 45 });
    const older: Partial<typeof document> = { ...document };
    delete older.light;
    const parsed = parseMapDocument({ ...older, version: 3 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.version).toBe(4);
    expect(parsed.document.mission).toBeUndefined();
    expect(compileMapDocument(parsed.document).light).toEqual({ time: 12, bearing: 45 });
  });

  it('mission, test use and light round-trip; light is kept in range', () => {
    const map = createEditableMap({ id: 'anel', size: 'small', use: 'campaign', mission: 'anel-de-ferro' });
    map.light = { time: 21, bearing: -90 };
    const parsed = parseMapDocument(JSON.parse(JSON.stringify(toMapDocument(map))));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document).toMatchObject({ use: 'campaign', mission: 'anel-de-ferro', light: { time: 21, bearing: -90 } });
    expect(compileMapDocument(parsed.document).light).toEqual({ time: 18, bearing: 270 });
    expect(parseMapDocument({ ...toMapDocument(flat()), use: 'test' }).ok).toBe(true);
    expect(parseMapDocument({ ...toMapDocument(flat()), light: { time: 'noon' } })).toMatchObject({ ok: false, detail: 'light' });
  });

  it('a campaign map without a mission is refused by the check', () => {
    const map = createEditableMap({ id: 'sem-missao', size: 'small', use: 'campaign', name: { en: 'X', 'pt-BR': 'X' } });
    map.setting.sourceNote = 'note';
    expect(validateEditableMap(map).some((problem) => problem.code === 'mission-missing' && problem.severity === 'error')).toBe(true);
    map.mission = 'anel-de-ferro';
    expect(validateEditableMap(map).some((problem) => problem.code === 'mission-missing')).toBe(false);
  });

  it('shrinking lists the objects that fall outside', () => {
    const map = createEditableMap({ id: 'big', size: 'large' });
    map.objects.push({ id: 7, type: 'casa-terrea', x: 280, y: 0, rotation: 0 });
    const { map: shrunk, outside } = resizeEditableMap(map, 'medium');
    expect(outside).toEqual([7]);
    expect(shrunk.paint.length).toBe(400 * 400);
    expect(shrunk.objects.some((object) => object.id === 7)).toBe(false);
  });

  it('compiles deterministically', () => {
    const map = flat();
    map.roads.push({ id: 1, type: 'dirt-road', width: 5, ditches: { left: false, right: true }, points: [{ x: -100, y: 20 }, { x: 100, y: 30 }] });
    const a = compileMapDocument(map);
    const b = compileMapDocument(map);
    expect(a).toEqual(b);
  });
});

describe('grid terrain and painted surfaces', () => {
  it('samples a stored grid bilinearly (1.00 m and 3.00 m give 2.00 m between)', () => {
    const map = flat();
    // Nodes (60, 60) and (61, 60) are at x 0 and x 2, y 0.
    map.heights[60 * 121 + 60] = 100;
    map.heights[60 * 121 + 61] = 300;
    map.heights[61 * 121 + 60] = 100;
    map.heights[61 * 121 + 61] = 300;
    setActiveMap(compileMapDocument(map));
    expect(terrainHeightAt(1, 1)).toBeCloseTo(2, 5);
  });

  it('a painted hill blocks sight', () => {
    const map = flat();
    for (let row = 50; row <= 70; row += 1) for (let column = 55; column <= 65; column += 1) map.heights[row * 121 + column] = 600;
    setActiveMap(compileMapDocument(map));
    expect(isLineBlocked(-40, 0, 40, 0, [], [], EYE_HEIGHTS.standing)).toBe(true);
  });

  it('painted mud slows, gravel reads as dirt road', () => {
    const map = flat();
    const paint = (x: number, y: number, material: Parameters<typeof groundMaterialIndex>[0]) => {
      map.paint[(y + 120) * 240 + (x + 120)] = groundMaterialIndex(material);
    };
    paint(5, 5, 'mud');
    paint(6, 5, 'gravel');
    paint(7, 5, 'caatinga-soil');
    setActiveMap(compileMapDocument(map));
    expect(terrainSurfaceAt(5.5, 5.5)).toBe('mud');
    expect(surfaceSpeed(terrainSurfaceAt(5.5, 5.5))).toBeLessThan(surfaceSpeed('grass'));
    expect(terrainSurfaceAt(6.5, 5.5)).toBe('dirt-road');
    expect(terrainSurfaceAt(7.5, 5.5)).toBe('dirt-road');
  });

  it('every material maps to a surface with a speed', () => {
    for (const material of GROUND_MATERIALS) expect(surfaceSpeed(material.surface)).toBeGreaterThan(0);
  });

  it('a road over painted mud gives the road surface; its ditch gives trench cover', () => {
    const map = flat();
    for (let index = 0; index < map.paint.length; index += 1) map.paint[index] = groundMaterialIndex('mud');
    map.roads.push({ id: 1, type: 'dirt-road', width: 5, ditches: { left: false, right: true }, points: [{ x: -100, y: 0 }, { x: 100, y: 0 }] });
    const compiled = compileMapDocument(map);
    setActiveMap(compiled);
    expect(terrainSurfaceAt(0.5, 0.5)).toBe('dirt-road');
    // Travelling east, right is south (+y): the ditch is at y ≈ 3.25.
    expect(terrainHeightAt(0, 3.25)).toBeLessThan(terrainHeightAt(0, 0));
    const ditch = compiled.covers.find((cover) => cover.kind === 'trench');
    expect(ditch).toBeDefined();
    expect(coverAgainst(0, 3.25, 0, 60, 'prone', compiled.covers)).toBeGreaterThan(coverAgainst(0, -12, 0, 60, 'prone', compiled.covers));
  });
});

describe('every object affects the battle', () => {
  function withObject(type: string, extra: Partial<{ x: number; y: number; rotation: number }> = {}) {
    const map = flat();
    map.objects.push({ id: 1, type, x: 0, y: 0, rotation: 0, ...extra });
    const compiled = compileMapDocument(map);
    setActiveMap(compiled);
    return compiled;
  }

  it('boulder hides: a matacão hides a standing man and gives stone cover', () => {
    const { covers } = withObject('matacao');
    expect(isLineBlocked(0, -4, 0, 30, covers, [], EYE_HEIGHTS.standing)).toBe(true);
    expect(coverAgainst(0, -3, 0, 30, 'crouched', covers)).toBeGreaterThan(coverAgainst(0, -40, 0, 30, 'crouched', covers));
  });

  it('small rock prone only: covers a prone man, not a standing one, and does not block standing sight', () => {
    const { covers } = withObject('rock-small');
    expect(isLineBlocked(0, -2, 0, 30, covers, [], EYE_HEIGHTS.standing)).toBe(false);
    expect(coverAgainst(0, -1.4, 0, 30, 'prone', covers)).toBeGreaterThan(coverAgainst(0, -40, 0, 30, 'prone', covers));
    expect(coverAgainst(0, -1.4, 0, 30, 'standing', covers)).toBe(coverAgainst(0, -40, 0, 30, 'standing', covers));
  });

  it('cart gives cover and blocks movement', () => {
    const { covers } = withObject('cart');
    expect(isPointBlockedByCovers(0, 0, covers, 0)).toBe(true);
    expect(coverAgainst(0, -3, 0, 30, 'crouched', covers)).toBeGreaterThan(coverAgainst(0, -40, 0, 30, 'crouched', covers));
  });

  it('post blocks only movement', () => {
    const { covers } = withObject('telegraph-pole');
    expect(isPointBlockedByCovers(0, 0, covers, 0)).toBe(true);
    expect(isLineBlocked(0, -10, 0, 10, covers, [], EYE_HEIGHTS.prone)).toBe(false);
    expect(coverAgainst(0, -1, 0, 30, 'prone', covers)).toBe(coverAgainst(0, -40, 0, 30, 'prone', covers));
  });

  it('cactus conceals: a xique-xique clump stamps scrub', () => {
    withObject('xique-xique');
    expect(vegetationAt(0.5, 0.5)).toBe('scrub');
  });

  it('a painted cornfield conceals a crouched man from 8 m and a standing one from 15 m', () => {
    const map = flat();
    const side = 240;
    const corn = VEGETATION_KINDS.indexOf('corn') + 1;
    for (let y = 110; y < 130; y += 1) for (let x = 110; x < 130; x += 1) map.vegetation[y * side + x] = corn;
    setActiveMap(compileMapDocument(map));
    expect(vegetationAt(0, 0)).toBe('corn');
    expect(concealmentDistance(activeMapRuntime(), 0, 0, 'crouched', false)).toBe(8);
    expect(concealmentDistance(activeMapRuntime(), 0, 0, 'standing', false)).toBe(15);
    expect(concealmentDistance(activeMapRuntime(), 30, 30, 'crouched', false)).toBeNull();
  });

  it('lajedo slab paints lajedo and gives prone cover', () => {
    const compiled = withObject('lajedo-slab');
    expect(compiled.paint![(120) * 240 + 120]).toBe(groundMaterialIndex('lajedo'));
    expect(compiled.covers).toHaveLength(1);
  });

  it('every catalog entry declares a footprint that emits something', () => {
    for (const type of ['farmhouse', 'boulder', 'outcrop', 'stone-pile', 'tree-broad', 'juazeiro', 'mandacaru', 'lamp', 'sandbags', 'well', 'pebbles']) {
      const entry = catalogObject(type)!;
      const map = flat();
      map.objects.push({ id: 1, type, x: 0, y: 0, rotation: 0 });
      const compiled = compileMapDocument(map);
      const changed = compiled.covers.length > 0 || compiled.paint![120 * 240 + 120] !== map.paint[120 * 240 + 120];
      expect(changed, `${entry.id} has no effect`).toBe(true);
    }
  });

  it('a tall stone wall blocks sight; a wire fence does not hide a standing man', () => {
    const map = flat();
    map.lines.push({ id: 1, kind: 'stone-wall', height: 2, points: [{ x: -10, y: 0 }, { x: 10, y: 0 }] });
    map.lines.push({ id: 2, kind: 'wire-fence', height: 1.2, points: [{ x: -10, y: 20 }, { x: 10, y: 20 }] });
    const { covers } = compileMapDocument(map);
    setActiveMap(compileMapDocument(map));
    expect(isLineBlocked(0, -5, 0, 5, covers, [], EYE_HEIGHTS.standing)).toBe(true);
    expect(isLineBlocked(0, 15, 0, 25, covers, [], EYE_HEIGHTS.standing)).toBe(false);
  });
});


describe('document validation', () => {
  function riverMap() {
    const map = createEditableMap({ id: 'river', size: 'medium', name: { en: 'River', 'pt-BR': 'Rio' } });
    map.description = { en: 'd', 'pt-BR': 'd' };
    map.setting.sourceNote = 'note';
    map.rivers.push({ id: 1, width: 14, points: [{ x: -220, y: 0 }, { x: 220, y: 0 }], kinds: ['deep'] });
    return map;
  }

  it('deep river blocks: the zones are unreachable', () => {
    const codes = validateEditableMap(riverMap()).map((problem) => problem.code);
    expect(codes).toContain('no-path');
  });

  it('bridge crossing: a bridge over the river gives a path', () => {
    const map = riverMap();
    map.bridges.push({ id: 1, x: 0, y: 0, rotation: 0, halfWidth: 2.5, halfDepth: 12, deckHeight: 1.6 });
    const problems = validateEditableMap(map);
    expect(problems.filter((problem) => problem.severity === 'error')).toEqual([]);
  });

  it('a section start in a pond is reported at its spot, pointing at the area (author-game-maps 8.2)', () => {
    const map = riverMap();
    map.rivers = [];
    map.ponds.push({ id: 1, kind: 'deep', polygon: [{ x: -60, y: 80 }, { x: -30, y: 80 }, { x: -30, y: 110 }, { x: -60, y: 110 }] });
    const problem = validateEditableMap(map).find((entry) => entry.code === 'section-not-walkable');
    expect(problem?.at).toEqual(compileMapDocument(toMapDocument(map)).deployment.column.sections[0]);
    expect(problem?.target).toEqual({ kind: 'area', id: 'column' });
  });

  it('a campaign map needs its source note; both names are required', () => {
    const map = riverMap();
    map.rivers = [];
    map.use = 'campaign';
    map.setting.sourceNote = ' ';
    map.name.en = '';
    const problems = validateEditableMap(map);
    expect(problems).toContainEqual(expect.objectContaining({ code: 'source-note-missing', severity: 'error' }));
    expect(problems).toContainEqual(expect.objectContaining({ code: 'name-missing', params: { language: 'en' } }));
  });

  it('warns about open ground without cover', () => {
    const map = riverMap();
    map.rivers = [];
    expect(validateEditableMap(map).map((problem) => problem.code)).toContain('cover-gap');
  });
});
