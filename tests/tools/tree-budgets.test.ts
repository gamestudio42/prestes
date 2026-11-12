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
    expect(over).toEqual([{ name: 'buriti', triangles: 801 }]);
    expect(treeBudgetProblems(over, heightOf)).toEqual(['buriti: 801 triangles, over the tree budget of 800']);
    expect(treeBudgetProblems(meshTriangles(fixture('bush', 299)), heightOf)).toEqual([]);
    expect(treeBudgetProblems([{ name: 'nao-existe', triangles: 10 }], heightOf)).toEqual(['nao-existe: no catalog height, so no size class']);
  });

  it('the five trees in the game are inside their budgets', async () => {
    const file = fileURLToPath(new URL('../../apps/game/public/models/trees.glb', import.meta.url));
    const meshes = meshTriangles(await new NodeIO().read(file));
    expect(meshes).toHaveLength(5);
    expect(treeBudgetProblems(meshes, heightOf)).toEqual([]);
  });

  it('tree model files: trees.glb and one per biome', () => {
    expect(['trees.glb', 'trees-caatinga.glb', 'trees-mata-atlantica.glb', 'soldier.glb', 'trees.blend'].filter(isTreeModel)).toEqual([
      'trees.glb',
      'trees-caatinga.glb',
      'trees-mata-atlantica.glb',
    ]);
  });
});
