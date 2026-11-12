import type { Document } from '@gltf-transform/core';

/**
 * biome-trees-and-plants 1.2 (design D2): every tree model stays inside a
 * triangle budget set by its size class, and `pnpm models` fails over it.
 * The budgets come from the five trees adapted first (2026-11-12): bush 160
 * triangles at 1.3 m; cerrado tree 506 at 6 m; buriti 663 at 12 m; broadleaf
 * 689 at 8 m; araucária 766 at 14 m. The tree class keeps the 800 the tree
 * model test already held; the small tree sits between bush and tree; the
 * giant keeps its trunk's full detail (D1) and gets half as much again.
 */
export type SizeClass = 'bush' | 'small-tree' | 'tree' | 'giant';

export const TREE_BUDGETS: Record<SizeClass, number> = {
  bush: 300,
  'small-tree': 600,
  tree: 800,
  giant: 1200,
};

/** By catalog height in metres: a bush under 2 m, a small tree under 6, a giant over 15. */
export function sizeClass(height: number): SizeClass {
  if (height < 2) return 'bush';
  if (height < 6) return 'small-tree';
  if (height <= 15) return 'tree';
  return 'giant';
}

export interface TreeMesh {
  name: string;
  triangles: number;
}

/** Each mesh node of a model file with its triangle count. */
export function meshTriangles(document: Document): TreeMesh[] {
  const meshes: TreeMesh[] = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    let triangles = 0;
    for (const primitive of mesh.listPrimitives()) {
      const count = primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')?.getCount() ?? 0;
      triangles += count / 3;
    }
    meshes.push({ name: node.getName(), triangles });
  }
  return meshes;
}

/**
 * One line per model over its class's budget, naming the species and the
 * count; a model with no catalog height is reported too, since its class is
 * unknown.
 */
export function treeBudgetProblems(meshes: readonly TreeMesh[], heightOf: (model: string) => number | undefined): string[] {
  const problems: string[] = [];
  for (const mesh of meshes) {
    const height = heightOf(mesh.name);
    if (height === undefined) {
      problems.push(`${mesh.name}: no catalog height, so no size class`);
      continue;
    }
    const size = sizeClass(height);
    const budget = TREE_BUDGETS[size];
    if (mesh.triangles > budget) problems.push(`${mesh.name}: ${mesh.triangles} triangles, over the ${size} budget of ${budget}`);
  }
  return problems;
}

/** The model files whose meshes are trees: `trees.glb` now, one `trees-<biome>.glb` per biome later (D3). */
export const isTreeModel = (file: string) => /^trees(-[a-z-]+)?\.glb$/.test(file);
