import { MAP_BOUNDS, cachedCoverSlots, findPath, isPointBlockedByCovers, slotGuards } from '@prestes/shared';
import type { CoverKind, CoverSlot, SimEvent, Vec2 } from '@prestes/shared';
import { slotHolders, takeSlot } from './slots';

/** Automatic cover only looks for a free slot this close (metres). */
const AUTO_COVER_RADIUS = 8;
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { hasLineOfSight, occupied, nearestEnemy, squadCentroid } from './geometry';
import { reject } from './commands';

export function spawnCover(
  ctx: SimContext,
  kind: CoverKind,
  to: Vec2,
  tick: number,
  seq: number,
  events: SimEvent[],
  rotation = 0,
): void {
  if (!ctx.sandbox && !ctx.training) {
    reject(ctx, tick, seq, 'sandbox_only', events);
    return;
  }
  if (kind !== 'sandbag' && kind !== 'stone' && kind !== 'trench') {
    reject(ctx, tick, seq, 'invalid_cover', events);
    return;
  }
  if (
    isPointBlockedByCovers(to.x, to.y, ctx.covers, 1) ||
    to.x < MAP_BOUNDS.minX ||
    to.x > MAP_BOUNDS.maxX ||
    to.y < MAP_BOUNDS.minY ||
    to.y > MAP_BOUNDS.maxY
  ) {
    reject(ctx, tick, seq, 'invalid_position', events);
    return;
  }
  const dimensions =
    kind === 'stone'
      ? {
          halfWidth: 1.8,
          halfDepth: 0.5,
          height: 1.8,
          quality: 0.55,
          blocksMovement: true,
          blocksSight: true,
        }
      : kind === 'trench'
        ? {
            halfWidth: 2.4,
            halfDepth: 1.2,
            height: 0.25,
            quality: 0.35,
            blocksMovement: false,
            blocksSight: false,
          }
        : {
            halfWidth: 1.7,
            halfDepth: 0.4,
            height: 0.9,
            quality: 0.25,
            blocksMovement: true,
            blocksSight: false,
          };
  ctx.covers.push({
    id: ctx.nextCoverId,
    kind,
    x: to.x,
    y: to.y,
    ...dimensions,
    rotation,
    radius: 2.4,
  });
  ctx.nextCoverId += 1;
}

export function rescueCover(ctx: SimContext, rescuer: MutableUnit): Vec2 | null {
  let best: Vec2 | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const cover of ctx.covers) {
    const distance = Math.sqrt((cover.x - rescuer.x) ** 2 + (cover.y - rescuer.y) ** 2);
    if (distance > 12) {
      continue;
    }
    const offsets = [
      { x: 0, y: 0 },
      { x: 1.4, y: 0 },
      { x: -1.4, y: 0 },
      { x: 0, y: 1.4 },
      { x: 0, y: -1.4 },
    ];
    for (const offset of offsets) {
      const candidate = { x: cover.x + offset.x, y: cover.y + offset.y };
      if (isPointBlockedByCovers(candidate.x, candidate.y, ctx.covers, 0.7)) {
        continue;
      }
      if (occupied(ctx, candidate.x, candidate.y, rescuer)) {
        continue;
      }
      const path = findPath({ x: rescuer.x, y: rescuer.y }, candidate, ctx.covers);
      if (path.length === 0) {
        continue;
      }
      const score = distance + path.length * 0.05;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
      break;
    }
  }
  return best;
}

export function nearCoverObject(ctx: SimContext, unit: MutableUnit): boolean {
  return ctx.covers.some((cover) => {
    const distance = Math.sqrt((cover.x - unit.x) ** 2 + (cover.y - unit.y) ** 2);
    return distance <= Math.max(2.4, cover.halfDepth + 1.4);
  });
}

export function seekCover(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (
      !unit.alive ||
      unit.routed ||
      unit.dummy ||
      unit.incapacitated ||
      unit.state === 'panicked'
    ) {
      continue;
    }
    if (unit.coverSeekCooldown > 0) {
      unit.coverSeekCooldown -= 1;
    }
    const order = unit.currentOrder;
    if (
      (!unit.orderIssued && unit.posture !== 'defensive') ||
      unit.suppress ||
      unit.recon ||
      unit.role === 'training-enemy' ||
      unit.path.length > 0 ||
      order === 'hold' ||
      order === 'withdraw' ||
      order === 'flank' ||
      order === 'pursue' ||
      order === 'rescue' ||
      order === 'flee'
    ) {
      continue;
    }
    // A soldier holding a cover slot stays in it.
    if (unit.slotId !== null) {
      continue;
    }
    if (nearCoverObject(ctx, unit)) {
      if (!unit.stanceLocked) {
        unit.stance = unit.stance === 'standing' ? 'crouched' : unit.stance;
      }
      continue;
    }

    if (unit.coverSeekCooldown > 0) {
      continue;
    }

    const target =
      (unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId)) ??
      nearestEnemy(ctx, unit);
    if (!target || !target.alive || target.routed) {
      continue;
    }

    const holders = slotHolders(ctx);
    const center = squadCentroid(ctx, unit);
    let best: CoverSlot | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const slot of cachedCoverSlots(ctx.covers)) {
      const holder = holders.get(slot.id);
      if (holder !== undefined && holder !== unit.id) {
        continue;
      }
      const score = (unit.x - slot.x) ** 2 + (unit.y - slot.y) ** 2;
      if (score > AUTO_COVER_RADIUS * AUTO_COVER_RADIUS || score >= bestDistance) {
        continue;
      }
      if (!slotGuards(slot, target, null)) {
        continue;
      }
      if (center && (slot.x - center.x) ** 2 + (slot.y - center.y) ** 2 > 9 * 9) {
        continue;
      }
      if (
        unit.orderRegionCenter &&
        (slot.x - unit.orderRegionCenter.x) ** 2 + (slot.y - unit.orderRegionCenter.y) ** 2 >
          unit.orderRegionRadius * unit.orderRegionRadius
      ) {
        continue;
      }
      // Cover must not blind the shooter against its ordered target.
      if (unit.targetId !== null && !hasLineOfSight(ctx, slot, slot.stance, target)) {
        continue;
      }
      if (occupied(ctx, slot.x, slot.y, unit)) {
        continue;
      }
      bestDistance = score;
      best = slot;
    }

    if (!best) {
      unit.coverSeekCooldown = 60;
      continue;
    }
    const distance = Math.sqrt((unit.x - best.x) ** 2 + (unit.y - best.y) ** 2);
    if (distance < 0.6) {
      takeSlot(unit, best);
      unit.targetX = best.x;
      unit.targetY = best.y;
      unit.coverSeekCooldown = 120;
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, best, ctx.covers);
    if (path.length === 0) {
      unit.coverSeekCooldown = 60;
      continue;
    }
    takeSlot(unit, best);
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = best.x;
    unit.targetY = best.y;
    unit.coverSeekCooldown = 120;
  }
}
