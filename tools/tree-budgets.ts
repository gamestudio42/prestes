import type { Document } from '@gltf-transform/core';
import budgets from './tree-budgets.json';

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

/** In `tools/tree-budgets.json`, which the Blender build reads too. */
export const TREE_BUDGETS: Record<SizeClass, number> = {
  bush: budgets.bush,
  'small-tree': budgets['small-tree'],
  tree: budgets.tree,
  giant: budgets.giant,
};

/** No tree stands taller, in metres (owner, 2026-11-12: no giant trees on the battle maps). */
export const MAX_TREE_HEIGHT: number = budgets.maxHeight;

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
  /** The model's own height (its Y extent), in metres. */
  height?: number;
}

/** Each mesh node of a model file with its triangle count. */
export function meshTriangles(document: Document): TreeMesh[] {
  const meshes: TreeMesh[] = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    let triangles = 0;
    let low = Infinity;
    let high = -Infinity;
    for (const primitive of mesh.listPrimitives()) {
      const position = primitive.getAttribute('POSITION');
      triangles += (primitive.getIndices()?.getCount() ?? position?.getCount() ?? 0) / 3;
      if (position) {
        low = Math.min(low, position.getMin([])[1]!);
        high = Math.max(high, position.getMax([])[1]!);
      }
    }
    meshes.push({ name: node.getName(), triangles, ...(high > low ? { height: high - low } : {}) });
  }
  return meshes;
}

/**
 * One line per model over its class's budget, naming the species and the
 * count. The class comes from the catalog height, or from the model's own
 * height for a species not in the catalog yet; a model with neither is
 * reported, since its class is unknown.
 */
export function treeBudgetProblems(meshes: readonly TreeMesh[], heightOf: (model: string) => number | undefined): string[] {
  const problems: string[] = [];
  for (const mesh of meshes) {
    const height = heightOf(mesh.name) ?? mesh.height;
    if (height === undefined) {
      problems.push(`${mesh.name}: no height, so no size class`);
      continue;
    }
    if (height > MAX_TREE_HEIGHT + 0.05) problems.push(`${mesh.name}: ${height.toFixed(1)} m, over the ${MAX_TREE_HEIGHT} m limit`);
    const size = sizeClass(height);
    const budget = TREE_BUDGETS[size];
    if (mesh.triangles > budget) problems.push(`${mesh.name}: ${mesh.triangles} triangles, over the ${size} budget of ${budget}`);
  }
  return problems;
}

/** The model files whose meshes are trees: `trees.glb` now, one `trees-<biome>.glb` per biome later (D3). */
export const isTreeModel = (file: string) => /^trees(-[a-z-]+)?\.glb$/.test(file);
