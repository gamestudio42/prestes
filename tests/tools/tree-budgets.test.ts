import { Document, NodeIO } from '@gltf-transform/core';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG_OBJECTS } from '../../packages/shared/src';
import { TREE_BUDGETS, isTreeModel, meshTriangles, sizeClass, treeBudgetProblems } from '../../tools/tree-budgets';

// biome-trees-and-plants 1.2: triangle budgets by size class; the build fails over budget.

const heightOf = (model: string) => CATALOG_OBJECTS.find((entry) => entry.model === model)?.height;

/** A model file with one mesh node of `triangles` unindexed triangles. */
function fixture(name: string, triangles: number): Document {
  const document = new Document();
  const buffer = document.createBuffer();
  const position = document.createAccessor().setType('VEC3').setArray(new Float32Array(triangles * 9)).setBuffer(buffer);
  const mesh = document.createMesh(name).addPrimitive(document.createPrimitive().setAttribute('POSITION', position));
  document.createScene().addChild(document.createNode(name).setMesh(mesh));
  return document;
}

describe('tree triangle budgets', () => {
  it('size classes by height: bush under 2 m, small tree under 6, tree to 15, giant over', () => {
    expect([1.3, 2, 5.9, 6, 15, 15.1].map(sizeClass)).toEqual(['bush', 'small-tree', 'small-tree', 'tree', 'tree', 'giant']);
    expect(TREE_BUDGETS.bush).toBeLessThan(TREE_BUDGETS['small-tree']);
    expect(TREE_BUDGETS.tree).toBeLessThan(TREE_BUDGETS.giant);
  });

  it('a fixture over budget is named with its count; one under passes', () => {
    const over = meshTriangles(fixture('buriti', TREE_BUDGETS.tree + 1));
    expect(over).toMatchObject([{ name: 'buriti', triangles: 801 }]);
    expect(treeBudgetProblems(over, heightOf)).toEqual(['buriti: 801 triangles, over the tree budget of 800']);
    expect(treeBudgetProblems(meshTriangles(fixture('bush', 299)), heightOf)).toEqual([]);
    expect(treeBudgetProblems([{ name: 'nao-existe', triangles: 10 }], heightOf)).toEqual(['nao-existe: no height, so no size class']);
    // A species not in the catalog yet is classed by its own height.
    expect(treeBudgetProblems([{ name: 'sumauma', triangles: 1100, height: 38 }], heightOf)).toEqual([]);
    expect(treeBudgetProblems([{ name: 'cagaita', triangles: 700, height: 5 }], heightOf)).toEqual(['cagaita: 700 triangles, over the small-tree budget of 600']);
  });

  it('every tree model in the game is inside its budget', async () => {
    const read = async (name: string) => meshTriangles(await new NodeIO().read(fileURLToPath(new URL(`../../apps/game/public/models/${name}`, import.meta.url))));
    expect(await read('trees.glb')).toHaveLength(5);
    // 2.2-2.4: Refloreste's adult trees, one file per biome.
    const counts = { 'trees-mata-atlantica.glb': 7, 'trees-cerrado.glb': 6, 'trees-amazonia.glb': 6 };
    for (const [file, count] of Object.entries({ 'trees.glb': 5, ...counts })) {
      const meshes = await read(file);
      expect(meshes, file).toHaveLength(count);
      expect(treeBudgetProblems(meshes, heightOf), file).toEqual([]);
    }
  });

  it('tree model files: trees.glb and one per biome', () => {
    expect(['trees.glb', 'trees-caatinga.glb', 'trees-mata-atlantica.glb', 'soldier.glb', 'trees.blend'].filter(isTreeModel)).toEqual([
      'trees.glb',
      'trees-caatinga.glb',
      'trees-mata-atlantica.glb',
    ]);
  });
});
