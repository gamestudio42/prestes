import { describe, expect, it } from 'vitest';
import { compileMapDocument, createEditableMap, insideDeploymentArea, sectionStartsFromArea, toMapDocument } from '../src/maps';

// author-game-maps 8.1: the section starts come from the deployment area.
describe('section starts from the deployment area', () => {
  it('a rectangle facing north: three starts across the middle of its depth, west to east', () => {
    const area = [{ x: -60, y: 80 }, { x: 60, y: 80 }, { x: 60, y: 130 }, { x: -60, y: 130 }];
    const starts = sectionStartsFromArea(area, { x: 0, y: -1 });
    expect(starts.map((p) => [Math.round(p.x), Math.round(p.y)])).toEqual([[-36, 105], [0, 105], [36, 105]]);
  });

  it('a slanted area: all three starts inside it', () => {
    const area = [{ x: 0, y: 0 }, { x: 80, y: 30 }, { x: 60, y: 90 }, { x: -20, y: 60 }];
    const starts = sectionStartsFromArea(area, { x: 0.6, y: -0.8 });
    expect(starts).toHaveLength(3);
    for (const p of starts) expect(insideDeploymentArea(area, p.x, p.y)).toBe(true);
  });

  it('the test map keeps the starts it had by hand', async () => {
    const { battleMap, loadAuthoredMap } = await import('../src/maps');
    await loadAuthoredMap('campo-de-provas');
    const { column, legalist } = battleMap('campo-de-provas').deployment;
    expect(column.sections).toEqual([{ x: -44, y: 95 }, { x: 0, y: 95 }, { x: 44, y: 95 }]);
    expect(legalist.sections).toEqual([{ x: -44, y: -75 }, { x: 0, y: -75 }, { x: 44, y: -75 }]);
  });

  it("the document's stored section points do not change the compiled starts", () => {
    const map = createEditableMap({ id: 'starts', size: 'medium', name: { en: 'Starts', 'pt-BR': 'Inicios' } });
    const before = compileMapDocument(toMapDocument(map)).deployment;
    map.deployment.column.sections = map.deployment.column.sections.map((p) => ({ x: p.x + 30, y: p.y }));
    const after = compileMapDocument(toMapDocument(map)).deployment;
    expect(after.column.sections).toEqual(before.column.sections);
    for (const side of ['column', 'legalist'] as const) {
      for (const p of after[side].sections) expect(insideDeploymentArea(after[side].area, p.x, p.y)).toBe(true);
    }
    expect(after.column.facing.y).toBeLessThan(0); // the column faces the legalists
  });
});
