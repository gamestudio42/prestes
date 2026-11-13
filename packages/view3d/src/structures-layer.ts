import type { BattleMap, Building } from '@prestes/shared';
import type { ModelPlacements } from './environment-models';

/**
 * revise-buildings-and-stone 3.6 (D7): the buildings of a battle map, placed
 * as their Blender models (art-src/blender/target_buildings.py). Every
 * catalog building is modelled, doors and windows cut where the battle has
 * them; a building's look (3.5) is its model with the variant's swatches,
 * named `<model>@<variant>`.
 */

/** The model a building is drawn with: its own, or its variant of it. */
export function buildingModelName(building: Pick<Building, 'model' | 'variant'>): string {
  return building.variant ? `${building.model}@${building.variant}` : building.model;
}

/** Adds every building of the map to the model placements, on the ground at its place. */
export function placeBuildings(map: Pick<BattleMap, 'buildings'>, placements: ModelPlacements): void {
  for (const building of map.buildings) placements.add(buildingModelName(building), building.x, building.y, building.rotation);
}
