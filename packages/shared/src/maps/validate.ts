import { deploymentSlots } from '../deploy-roster';
import { findPath, isWalkable } from '../pathfinding';
import { insideDeploymentArea, polygonsOverlap } from './deployment-areas';
import { isPointBlockedByCovers } from '../world';
import { setActiveMap } from './catalog';
import { isDeepWater } from './runtime';
import type { CoverPoint } from '../protocol';
import type { BattleMap, Polygon } from './types';

/** Deployment zones must be at least this far apart (m). */
export const MIN_DEPLOYMENT_GAP = 160;

function centroid(points: readonly { x: number; y: number }[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/**
 * The content check for a battle map (add-battle-maps): three sections a
 * side, every section start inside the bounds and on walkable ground, the two
 * zones at least MIN_DEPLOYMENT_GAP m apart and joined by a walkable path.
 * Leaves `map` active; callers restore their own.
 */
export function validateBattleMap(map: BattleMap): string[] {
  const errors: string[] = [];
  setActiveMap(map);
  const blocking = map.covers;
  for (const side of ['column', 'legalist'] as const) {
    const zone = map.deployment[side];
    if (zone.sections.length !== 3) errors.push(`${map.id}: ${side} has ${zone.sections.length} sections, not 3`);
    for (const start of zone.sections) {
      const { minX, minY, maxX, maxY } = map.bounds;
      // A section stands in two ranks of six, 2.8 m apart: check its corners too.
      for (const [dx, dy] of [
        [0, 0],
        [-7, 0],
        [7, 0],
        [-7, 2.8],
        [7, 2.8],
      ] as const) {
        const x = start.x + dx;
        const y = start.y + dy;
        if (x < minX || x > maxX || y < minY || y > maxY) {
          errors.push(`${map.id}: ${side} section at (${start.x}, ${start.y}) leaves the bounds`);
        } else if (isDeepWater(x, y) || isPointBlockedByCovers(x, y, blocking, 0)) {
          errors.push(`${map.id}: ${side} section at (${start.x}, ${start.y}) is not on walkable ground`);
        }
      }
    }
  }
  const column = centroid(map.deployment.column.sections);
  const legalist = centroid(map.deployment.legalist.sections);
  const gap = Math.hypot(column.x - legalist.x, column.y - legalist.y);
  if (gap < MIN_DEPLOYMENT_GAP) errors.push(`${map.id}: deployment zones are ${gap.toFixed(0)} m apart`);
  for (let index = 0; index < 3; index += 1) {
    const from = map.deployment.column.sections[index];
    const to = map.deployment.legalist.sections[index];
    if (from && to && findPath(from, to, blocking).length === 0) {
      errors.push(`${map.id}: no walkable path from column section ${index + 1} to the legalist zone`);
    }
  }
  return errors;
}

/** The share of a deployment area that must be walkable. */
export const MIN_WALKABLE_AREA_SHARE = 0.5;
/** Spacing of the sample grid for the walkable share (m). */
const AREA_SAMPLE_STEP = 2;

/** The walkable share (0-1) of an area on the active map, sampled on a 2 m grid. */
export function walkableShare(area: Polygon, covers: readonly CoverPoint[]): number {
  const xs = area.map((p) => p.x);
  const ys = area.map((p) => p.y);
  let inside = 0;
  let walkable = 0;
  for (let y = Math.min(...ys) + AREA_SAMPLE_STEP / 2; y < Math.max(...ys); y += AREA_SAMPLE_STEP) {
    for (let x = Math.min(...xs) + AREA_SAMPLE_STEP / 2; x < Math.max(...xs); x += AREA_SAMPLE_STEP) {
      if (!insideDeploymentArea(area, x, y)) continue;
      inside += 1;
      if (isWalkable(x, y, covers)) walkable += 1;
    }
  }
  return inside === 0 ? 0 : walkable / inside;
}

/**
 * add-deployment-phase D3: the deployment areas of a map. Each side's area
 * holds its six deployment slots, the two areas do not overlap, and at least
 * half of each area is walkable (sampled on a 2 m grid). Leaves `map` active.
 */
export function validateDeploymentAreas(map: BattleMap): string[] {
  const errors: string[] = [];
  setActiveMap(map);
  for (const side of ['column', 'legalist'] as const) {
    const area = map.deployment[side].area;
    if (!area || area.length < 3) {
      errors.push(`${map.id}: ${side} has no deployment area`);
      continue;
    }
    for (const slot of deploymentSlots(map, side)) {
      if (!insideDeploymentArea(area, slot.x, slot.y)) {
        errors.push(`${map.id}: ${side} slot at (${slot.x.toFixed(1)}, ${slot.y.toFixed(1)}) lies outside its deployment area`);
      }
    }
    const share = walkableShare(area, map.covers);
    if (share < MIN_WALKABLE_AREA_SHARE) errors.push(`${map.id}: ${side} deployment area is only ${Math.round(share * 100)}% walkable`);
  }
  const { column, legalist } = map.deployment;
  if (column.area?.length >= 3 && legalist.area?.length >= 3 && polygonsOverlap(column.area, legalist.area)) {
    errors.push(`${map.id}: the column and legalist deployment areas overlap`);
  }
  return errors;
}
