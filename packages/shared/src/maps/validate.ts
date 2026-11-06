import { findPath } from '../pathfinding';
import { isPointBlockedByCovers } from '../world';
import { setActiveMap } from './catalog';
import { isDeepWater } from './runtime';
import type { BattleMap } from './types';

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
