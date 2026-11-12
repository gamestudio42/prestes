import { NodeIO } from '@gltf-transform/core';
import { fileURLToPath } from 'node:url';
import type { CatalogObject } from '../packages/shared/src';
import { MAX_TREE_HEIGHT, meshTriangles } from './tree-budgets';

/**
 * biome-trees-and-plants 3.1, 3.3: every tree and plant of a biome has its
 * model in its file at its catalog height, a name in every locale, and no
 * tree stands over the 9 m limit; every model in a biome file is in the
 * catalog with its biome. `pnpm check:content` runs it.
 */

/** Mesh heights (m) by node name, per model file (without `.glb`). */
export type ModelHeights = ReadonlyMap<string, ReadonlyMap<string, number>>;

/** Catalog heights are rounded to 0.1 m; the models are scaled to them in Blender. */
const HEIGHT_TOLERANCE = 0.1;

export function floraProblems(
  catalog: readonly CatalogObject[],
  models: ModelHeights,
  hasName: (key: string) => string[],
): string[] {
  const problems: string[] = [];
  const flora = catalog.filter((entry) => entry.group === 'tree' && entry.biome);
  for (const entry of flora) {
    const file = entry.modelFile ?? 'trees';
    const height = models.get(file)?.get(entry.model);
    if (height === undefined) problems.push(`${entry.id}: no model ${entry.model} in ${file}.glb`);
    else if (Math.abs(height - entry.height) > HEIGHT_TOLERANCE)
      problems.push(`${entry.id}: catalog height ${entry.height} m, model ${height.toFixed(2)} m`);
    if (entry.height > MAX_TREE_HEIGHT) problems.push(`${entry.id}: ${entry.height} m, over the ${MAX_TREE_HEIGHT} m limit`);
    for (const locale of hasName(entry.nameKey)) problems.push(`${entry.id}: ${locale} has no ${entry.nameKey}`);
  }
  for (const [file, meshes] of models) {
    if (file === 'trees') continue;
    for (const name of meshes.keys()) {
      const entry = catalog.find((candidate) => candidate.model === name && candidate.modelFile === file);
      if (!entry) problems.push(`${file}.glb: ${name} is not in the catalog`);
      else if (!entry.biome) problems.push(`${entry.id}: no biome`);
    }
  }
  return problems;
}

export const FLORA_FILES = ['trees', 'trees-mata-atlantica', 'trees-cerrado', 'trees-amazonia', 'trees-caatinga'];

/** Reads the tree model files the game ships. */
export async function readModelHeights(files: readonly string[] = FLORA_FILES): Promise<ModelHeights> {
  const io = new NodeIO();
  const models = new Map<string, Map<string, number>>();
  for (const file of files) {
    const document = await io.read(fileURLToPath(new URL(`../apps/game/public/models/${file}.glb`, import.meta.url)));
    models.set(file, new Map(meshTriangles(document).map((mesh) => [mesh.name, mesh.height ?? 0])));
  }
  return models;
}
