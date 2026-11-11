import { describe, expect, it } from 'vitest';
import { battleMap, compileMapDocument, createEditableMap, DEFAULT_BATTLE_MAP, loadAuthoredMap, parseMapDocument, toMapDocument, validateEditableMap, type Objective } from '../src';

// add-map-objectives 1.3: objectives in the map document (version 5).
const BRIDGE: Objective = {
  id: 1,
  name: { en: 'Bridge', 'pt-BR': 'Ponte' },
  area: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }],
  flag: { x: 0, y: 0 },
  value: 2,
  owner: 'neutral',
};

function withObjectives(objectives?: Objective[]) {
  const map = createEditableMap({ id: 'objectives-doc', size: 'small', name: { en: 'Test', 'pt-BR': 'Teste' } });
  return toMapDocument(objectives ? { ...map, objectives } : map);
}

describe('objectives in the map document', () => {
  it('a version 4 file opens with no objectives', () => {
    const document = withObjectives();
    const parsed = parseMapDocument({ ...document, version: 4 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.version).toBe(6);
    expect(compileMapDocument(parsed.document).objectives).toBeUndefined();
  });

  it('round-trips and compiles the objectives', () => {
    const parsed = parseMapDocument(JSON.parse(JSON.stringify(withObjectives([BRIDGE]))));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.objectives).toEqual([BRIDGE]);
    expect(compileMapDocument(parsed.document).objectives).toEqual([BRIDGE]);
  });

  it('refuses an objective with a bad owner or too few area points', () => {
    expect(parseMapDocument(withObjectives([{ ...BRIDGE, owner: 'nobody' as never }]))).toMatchObject({ ok: false, detail: 'objectives' });
    expect(parseMapDocument(withObjectives([{ ...BRIDGE, area: BRIDGE.area.slice(0, 2) }]))).toMatchObject({ ok: false, detail: 'objectives' });
  });

  it('clamps the value to 1-3 when compiling', () => {
    const parsed = parseMapDocument(withObjectives([{ ...BRIDGE, value: 7 }]));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(compileMapDocument(parsed.document).objectives![0]!.value).toBe(3);
  });
});

// add-map-objectives 1.2: the map check's objective rules.
describe('objectives in the map check', () => {
  const at = (id: number, x: number, y: number, radius = 10): Objective => ({
    ...BRIDGE,
    id,
    name: { en: `O${id}`, 'pt-BR': `O${id}` },
    area: [{ x: x - radius, y: y - radius }, { x: x + radius, y: y - radius }, { x: x + radius, y: y + radius }, { x: x - radius, y: y + radius }],
    flag: { x, y },
  });
  const codes = (objectives?: Objective[]) => {
    const map = createEditableMap({ id: 'objectives-check', size: 'small', name: { en: 'Test', 'pt-BR': 'Teste' } });
    return validateEditableMap(objectives ? { ...map, objectives } : map)
      .filter((problem) => problem.code.startsWith('objective'))
      .map((problem) => `${problem.severity}:${problem.code}`);
  };

  it('three objectives apart pass', () => {
    expect(codes([at(1, -60, 0), at(2, 0, 0), at(3, 60, 0)])).toEqual([]);
  });

  it('too few is a warning, a map without any still loads', () => {
    expect(codes()).toEqual(['warning:objective-count']);
  });

  it('overlapping areas and a missing name are errors', () => {
    const unnamed = { ...at(3, 60, 0), name: { en: '', 'pt-BR': 'Sem nome' } };
    expect(codes([at(1, -5, 0), at(2, 5, 0), unnamed])).toEqual(['error:objectives-overlap', 'error:objective-name-missing']);
  });
});

// add-map-objectives 1.4: the test map carries the design table's five.
describe('the test map objectives', () => {
  it('compiles with the bridge, ford, church, trench and houses', async () => {
    await loadAuthoredMap(DEFAULT_BATTLE_MAP);
    const objectives = battleMap(DEFAULT_BATTLE_MAP).objectives ?? [];
    expect(objectives.map((objective) => `${objective.name['pt-BR']}:${objective.value}:${objective.owner}`)).toEqual([
      'Ponte:2:neutral',
      'Vau:2:neutral',
      'Igreja:3:legalist',
      'Trincheira:1:legalist',
      'Casario:1:column',
    ]);
  });
});
