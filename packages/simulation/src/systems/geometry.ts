import { clampToRegion as clampPointToRegion, isPointBlockedByCovers } from '@prestes/shared';
import type { Faction, Vec2 } from '@prestes/shared';
import { OPEN_POINT_DIRECTIONS } from './model';
import type { MutableUnit } from './model';
import type { SimContext } from './context';

export function clampToRegion(ctx: SimContext, point: Vec2, center: Vec2, radius: number): Vec2 {
  return clampPointToRegion(point, center, radius);
}

export function nearestOpenPoint(ctx: SimContext, point: Vec2, maxRadius = 3): Vec2 {
  if (!isPointBlockedByCovers(point.x, point.y, ctx.covers, 0.8)) {
    return { ...point };
  }
  for (let radius = 0.5; radius <= maxRadius; radius += 0.5) {
    for (const direction of OPEN_POINT_DIRECTIONS) {
      const candidate = {
        x: point.x + direction.x * radius,
        y: point.y + direction.y * radius,
      };
      if (!isPointBlockedByCovers(candidate.x, candidate.y, ctx.covers, 0.8)) {
        return candidate;
      }
    }
  }
  return { ...point };
}

export function squadCentroid(ctx: SimContext, unit: MutableUnit): Vec2 | null {
  const peers = ctx.units.filter(
    (other) =>
      other.alive &&
      !other.dummy &&
      !other.routed &&
      other.faction === unit.faction &&
      other.squadId === unit.squadId,
  );
  if (peers.length === 0) return null;
  return peers.reduce(
    (sum, other) => ({ x: sum.x + other.x / peers.length, y: sum.y + other.y / peers.length }),
    { x: 0, y: 0 },
  );
}

export function nearestEnemy(ctx: SimContext, unit: MutableUnit): MutableUnit | null {
  return nearestEnemyAt(ctx, unit, unit.faction);
}

export function nearestEnemyAt(
  ctx: SimContext,
  point: { x: number; y: number },
  faction: Faction,
): MutableUnit | null {
  let nearest: MutableUnit | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of ctx.units) {
    if (
      !candidate.alive ||
      candidate.dummy ||
      candidate.routed ||
      candidate.incapacitated ||
      candidate.faction === faction ||
      (faction !== 'column' && candidate.faction === 'target')
    ) {
      continue;
    }
    const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export function facingToward(
  ctx: SimContext,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  return length < 0.001 ? { x: 0, y: -1 } : { x: dx / length, y: dy / length };
}

export function occupied(ctx: SimContext, x: number, y: number, unit: MutableUnit): boolean {
  return ctx.units.some((other) => {
    if (other === unit || !other.alive || other.routed || other.dummy || other.incapacitated) {
      return false;
    }
    const nearPosition = (other.x - x) ** 2 + (other.y - y) ** 2 < 1.2 * 1.2;
    const nearTarget = (other.targetX - x) ** 2 + (other.targetY - y) ** 2 < 1.2 * 1.2;
    return nearPosition || nearTarget;
  });
}
