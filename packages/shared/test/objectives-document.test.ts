import { describe, expect, it } from 'vitest';
import { compileMapDocument, createEditableMap, parseMapDocument, toMapDocument, type Objective } from '../src';

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
    expect(parsed.document.version).toBe(5);
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
