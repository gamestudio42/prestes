import { describe, expect, it } from 'vitest';
import { CATALOG_OBJECTS, type CatalogObject } from '../../packages/shared/src';
import { floraProblems, readModelHeights, type ModelHeights } from '../../tools/flora-check';

// biome-trees-and-plants 3.1, 3.3: model, height, names and biome for every tree and plant.

const named = () => [];

describe('flora content check', () => {
  it('every tree and plant in the game passes: models at catalog height, a biome each', async () => {
    expect(floraProblems(CATALOG_OBJECTS, await readModelHeights(), named)).toEqual([]);
  });

  it('fails a tree over 9 m, a missing model, a missing name and a model without a biome', () => {
    const tall: CatalogObject = { ...CATALOG_OBJECTS.find((entry) => entry.id === 'ipe')!, height: 12 };
    const lost: CatalogObject = { ...tall, id: 'jatoba', model: 'jatoba', nameKey: 'editor.object.jatoba', height: 6 };
    const models: ModelHeights = new Map([['trees-cerrado', new Map([['ipe', 12], ['pequi-dead', 4.5]])]]);
    const problems = floraProblems([tall, lost], models, (key) => (key === 'editor.object.jatoba' ? ['pt-BR'] : []));
    expect(problems).toEqual([
      'ipe: 12 m, over the 9 m limit',
      'jatoba: no model jatoba in trees-cerrado.glb',
      'jatoba: pt-BR has no editor.object.jatoba',
      'trees-cerrado.glb: pequi-dead is not in the catalog',
    ]);
    const noBiome = { ...tall, height: 6, biome: undefined, id: 'x' };
    expect(floraProblems([noBiome], new Map([['trees-cerrado', new Map([['ipe', 6]])]]), named)).toEqual(['x: no biome']);
  });
});
