import * as THREE from 'three';
import type { BattleMap, Building, PropPlacement } from '@prestes/shared';
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
/**
 * revise-buildings-and-stone 4.1: a stone's model, by its rock kind; granite
 * (no kind) is the bare id, the others `<id>@<kind>`. Any other prop is its id.
 */
export function stoneModelName(prop: Pick<PropPlacement, 'model' | 'kind'>): string {
  return prop.kind ? `${prop.model}@${prop.kind}` : prop.model;
}

export function placeBuildings(map: Pick<BattleMap, 'buildings'>, placements: ModelPlacements): void {
  for (const building of map.buildings) placements.add(buildingModelName(building), building.x, building.y, building.rotation);
}

/** 4.2: the longest piece a dry stone wall is laid in, the model's length (m). */
export const STONE_WALL_PIECE = 2;
/** The model's height: a piece is stretched to its line's (art-src/blender/target_stones.py WALL_SEGMENT). */
const STONE_WALL_MODEL_HEIGHT = 1;

/**
 * revise-buildings-and-stone 4.2 (D5): a dry stone wall line (and a corral's
 * walls) as its rock kind's model, `dry-wall` or `dry-wall@<kind>`, in pieces
 * of at most 2 m, each set on the ground under its middle and sunk into it, so
 * the wall follows a slope with no gap under it.
 */
export function placeStoneWalls(map: Pick<BattleMap, 'lines'>, placements: ModelPlacements): void {
  for (const line of map.lines ?? []) {
    if (line.kind !== 'stone-wall') continue;
    const model = line.rock ? `dry-wall@${line.rock}` : 'dry-wall';
    for (let index = 1; index < line.points.length; index += 1) {
      const from = line.points[index - 1]!;
      const to = line.points[index]!;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const count = Math.max(1, Math.ceil(length / STONE_WALL_PIECE));
      const rotation = Math.atan2(to.y - from.y, to.x - from.x);
      // A hair longer than its share, so the pieces meet.
      const scale = new THREE.Vector3((length / count + 0.05) / STONE_WALL_PIECE, line.height / STONE_WALL_MODEL_HEIGHT, 1);
      for (let piece = 0; piece < count; piece += 1) {
        const t = (piece + 0.5) / count;
        placements.add(model, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, rotation, scale);
      }
    }
  }
}
