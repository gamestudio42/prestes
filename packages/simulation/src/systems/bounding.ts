import { DEFAULT_SPACING, averageAim, averageFacing, coverAxes, findPath, isPointBlockedByCovers } from '@prestes/shared';
import type { CoverPoint, Vec2 } from '@prestes/shared';
import { formationSlots } from '../tactical';
import { BOUNDING_ORDERS } from './model';
import type { BoundingGroup, MutableUnit } from './model';
import type { SimContext } from './context';
import { nearestOpenPoint, occupied } from './geometry';
import { queueUnitOrder } from './movement';

/** A rush makes for cover this far ahead (m), else runs RUSH_MIN to RUSH_MAX in the open. */
export const RUSH_COVER_REACH = 30;
export const RUSH_MIN = 12;
export const RUSH_MAX = 20;
/** Rush cover must bring the soldier at least this much nearer the objective (m). */
export const RUSH_COVER_GAIN = 6;
/** Rush cover must lie within 45 degrees of the line to the objective. */
const COS_45 = 0.7071;

export function updateBounding(ctx: SimContext): void {
  const eligible = ctx.units.filter(
    (unit) =>
      // Both sides bound: the 3v3 enemy commander attacks by bounds too.
      (unit.faction === 'column' || unit.faction === 'legalist') &&
      unit.alive &&
      !unit.routed &&
      !unit.dummy &&
      !unit.incapacitated &&
      unit.state !== 'pinned' &&
      !unit.lineMove &&
      unit.currentOrder !== null &&
      BOUNDING_ORDERS.has(unit.currentOrder) &&
      // Only a soldier with ground still to cover bounds: an advance that has
      // arrived stays put instead of starting the bounds over.
      (unit.boundTeam !== null ||
        unit.path.length > 0 ||
        (unit.x - unit.targetX) ** 2 + (unit.y - unit.targetY) ** 2 > 1),
  );
  const activeSquads = new Set(eligible.map((unit) => unit.squadId));
  for (const [squadId] of ctx.bounding) {
    if (!activeSquads.has(squadId)) {
      for (const unit of ctx.units) {
        if (unit.squadId === squadId) {
          unit.boundTeam = null;
          unit.boundPhase = null;
        }
      }
      ctx.bounding.delete(squadId);
    }
  }

  for (const squadId of activeSquads) {
    const units = eligible.filter((unit) => unit.squadId === squadId);
    if (units.length < 2) {
      continue;
    }
    let group = ctx.bounding.get(squadId);
    if (!group) {
      const sorted = [...units].sort((left, right) => left.id - right.id);
      const split = Math.ceil(sorted.length / 2);
      const teamA = sorted.slice(0, split);
      const teamB = sorted.slice(split);
      const first = sorted[0]!;
      // Only an assault bounds onto its target; an advance bounds to the
      // ordered destination even when it sees the enemy on the way.
      const target =
        first.targetId === null || first.currentOrder !== 'attack'
          ? null
          : ctx.units.find((entry) => entry.id === first.targetId);
      const destination = target
        ? { x: target.x, y: target.y }
        : (first.orderDestination ?? {
            x: sorted.reduce((sum, unit) => sum + unit.x, 0) / sorted.length,
            y: sorted.reduce((sum, unit) => sum + unit.y, 0) / sorted.length,
          });
      const slots = formationSlots(
        sorted.map((unit) => ({ x: unit.x, y: unit.y })),
        destination,
        first.formationSpacing ?? DEFAULT_SPACING,
        first.formation ?? 'line',
        averageAim(sorted) ?? averageFacing(sorted),
      );
      const targets = new Map<number, Vec2>();
      sorted.forEach((unit, index) => {
        // A soldier bound for a cover slot keeps it as its final destination.
        targets.set(
          unit.id,
          unit.slotId !== null ? { x: unit.targetX, y: unit.targetY } : (slots[index] ?? destination),
        );
      });
      group = {
        squadId,
        teamA: teamA.map((unit) => unit.id),
        teamB: teamB.map((unit) => unit.id),
        destination,
        targetId: target?.id ?? null,
        phase: 'b',
        mode: first.currentOrder === 'attack' ? 'attack' : 'move',
        targets,
      };
      ctx.bounding.set(squadId, group);
      for (const unit of teamA) {
        unit.boundTeam = 'a';
        unit.boundPhase = 'cover';
      }
      for (const unit of teamB) {
        unit.boundTeam = 'b';
        unit.boundPhase = 'advance';
      }
      setBoundingCover(ctx, teamA);
      if (group.mode === 'attack') {
        assignBoundingAdvance(ctx, teamB, destination, first.targetId);
      } else if (farFromSlots(teamB, group)) {
        assignBoundingAdvance(ctx, teamB, destination, null);
      } else {
        assignBoundingDirect(ctx, teamB, destination, group.targets);
      }
      continue;
    }

    const first = units[0]!;
    const target =
      first.targetId === null || group.mode !== 'attack'
        ? null
        : ctx.units.find((entry) => entry.id === first.targetId);
    if (target) {
      group.destination = { x: target.x, y: target.y };
    }
    const teamA = units.filter((unit) => group.teamA.includes(unit.id));
    const teamB = units.filter((unit) => group.teamB.includes(unit.id));
    const moving = group.phase === 'a' ? teamA : teamB;
    const waiting = group.phase === 'a' ? teamB : teamA;
    const stillMoving = moving.filter((unit) => unit.path.length > 0);
    if (stillMoving.length > 1) {
      continue;
    }

    setBoundingCover(
      ctx,
      moving.filter((unit) => unit.path.length === 0),
    );
    if (group.mode === 'move' && (farFromSlots(teamA, group) || farFromSlots(teamB, group))) {
      // A long advance goes by rushes too, each team running ahead of the
      // other's line, until the section is close enough to take its slots.
      const next = group.phase === 'b' ? teamA : teamB;
      assignBoundingAdvance(ctx, next, group.destination, null, centroidOf(moving));
      group.phase = group.phase === 'b' ? 'a' : 'b';
      for (const unit of units) unit.boundPhase = 'cover';
      for (const unit of next) unit.boundPhase = unit.path.length > 0 ? 'advance' : 'cover';
      continue;
    }
    if (group.mode === 'move' && group.rushed) {
      // Close after rushing: the whole section takes its slots at once.
      assignBoundingDirect(ctx, units, group.destination, group.targets);
      for (const unit of units) {
        unit.boundTeam = null;
        unit.boundPhase = null;
      }
      ctx.bounding.delete(squadId);
      continue;
    }
    if (group.mode === 'move') {
      if (group.phase === 'b') {
        assignBoundingDirect(ctx, teamA, group.destination, group.targets);
        group.phase = 'a';
      } else {
        for (const id of group.teamA.concat(group.teamB)) {
          const unit = ctx.units.find((entry) => entry.id === id);
          if (!unit) {
            continue;
          }
          unit.boundTeam = null;
          unit.boundPhase = null;
          if ((unit.x - unit.targetX) ** 2 + (unit.y - unit.targetY) ** 2 > 1) {
            unit.holdPosition = false;
            unit.currentOrder = boundOrder(unit);
            unit.lineMove = false;
          }
        }
        ctx.bounding.delete(squadId);
      }
      continue;
    }
    if (group.phase === 'b') {
      const centroidB = {
        x: teamB.reduce((sum, unit) => sum + unit.x / Math.max(1, teamB.length), 0),
        y: teamB.reduce((sum, unit) => sum + unit.y / Math.max(1, teamB.length), 0),
      };
      assignBoundingAdvance(ctx, teamA, group.destination, group.targetId, centroidB);
      group.phase = 'a';
    } else {
      const centroidA = {
        x: teamA.reduce((sum, unit) => sum + unit.x / Math.max(1, teamA.length), 0),
        y: teamA.reduce((sum, unit) => sum + unit.y / Math.max(1, teamA.length), 0),
      };
      assignBoundingAdvance(ctx, teamB, group.destination, group.targetId, centroidA);
      group.phase = 'b';
    }
    for (const unit of waiting) {
      unit.boundPhase = 'cover';
    }
    for (const unit of moving) {
      unit.boundPhase = 'cover';
    }
    for (const unit of group.phase === 'a' ? teamA : teamB) {
      unit.boundPhase = unit.path.length > 0 ? 'advance' : 'cover';
    }
    if (
      teamA.every((unit) => unit.path.length === 0) &&
      teamB.every((unit) => unit.path.length === 0) &&
      teamA
        .concat(teamB)
        .every(
          (unit) =>
            (unit.x - group!.destination.x) ** 2 + (unit.y - group!.destination.y) ** 2 < 16,
        )
    ) {
      for (const unit of teamA.concat(teamB)) {
        unit.boundTeam = null;
        unit.boundPhase = null;
      }
      ctx.bounding.delete(squadId);
    }
  }
}

/** Room per soldier along a cover (m). */
const COVER_FRONTAGE = 1.6;

/** How many rushing soldiers a cover takes. */
function coverCapacity(cover: CoverPoint): number {
  return Math.max(1, Math.round((cover.halfWidth * 2) / COVER_FRONTAGE));
}

/**
 * The n-th soldier's place at a cover: spread along it, on the side he comes
 * from when the cover blocks movement (a wall), along its middle otherwise (a
 * trench, a parapet he can kneel behind).
 */
function placeAlongCover(ctx: SimContext, cover: CoverPoint, index: number, unit: MutableUnit): Vec2 {
  const capacity = coverCapacity(cover);
  const along = ((index % capacity) + 0.5) * ((cover.halfWidth * 2) / capacity) - cover.halfWidth;
  const { cos: axisX, sin: axisY } = coverAxes(cover);
  const side = (unit.x - cover.x) * -axisY + (unit.y - cover.y) * axisX >= 0 ? 1 : -1;
  const back = cover.blocksMovement ? side * (cover.halfDepth + 0.6) : 0;
  return nearestOpenPoint(ctx, {
    x: cover.x + axisX * along - axisY * back,
    y: cover.y + axisY * along + axisX * back,
  });
}

/** An advance whose soldiers are farther than this from their slots goes by rushes. */
const LONG_ADVANCE = 2 * RUSH_MAX;

function centroidOf(units: readonly MutableUnit[]): Vec2 {
  return {
    x: units.reduce((sum, unit) => sum + unit.x / Math.max(1, units.length), 0),
    y: units.reduce((sum, unit) => sum + unit.y / Math.max(1, units.length), 0),
  };
}

/** Whether any soldier of the team still has a long way to his slot (and marks the group as rushing). */
function farFromSlots(team: readonly MutableUnit[], group: BoundingGroup): boolean {
  const far = team.some((unit) => {
    const slot = group.targets.get(unit.id) ?? group.destination;
    return Math.sqrt((slot.x - unit.x) ** 2 + (slot.y - unit.y) ** 2) > LONG_ADVANCE;
  });
  if (far) group.rushed = true;
  return far;
}

export function assignBoundingDirect(
  ctx: SimContext,
  units: readonly MutableUnit[],
  destination: Vec2,
  targets?: ReadonlyMap<number, Vec2>,
): void {
  const slots = formationSlots(
    units.map((unit) => ({ x: unit.x, y: unit.y })),
    destination,
    units[0]?.formationSpacing ?? DEFAULT_SPACING,
    units[0]?.formation ?? 'line',
    averageAim(units) ?? averageFacing(units),
  );
  units.forEach((unit, index) => {
    // A slot inside a cover's clearance has no path; without this the soldier
    // would wait in cover forever while the rest of the team moves on.
    const target = nearestOpenPoint(ctx, targets?.get(unit.id) ?? slots[index] ?? destination);
    unit.targetX = target.x;
    unit.targetY = target.y;
    unit.holdPosition = false;
    unit.currentOrder = boundOrder(unit);
    unit.lineMove = false;
    const path = findPath({ x: unit.x, y: unit.y }, target, ctx.covers);
    if (path.length === 0) {
      unit.path = [];
      unit.pathIndex = 0;
      unit.boundPhase = 'cover';
      return;
    }
    unit.path = path;
    unit.pathIndex = 0;
    unit.boundPhase = 'advance';
    queueUnitOrder(ctx, unit, path, 'move');
  });
}

export function setBoundingCover(ctx: SimContext, units: readonly MutableUnit[]): void {
  for (const unit of units) {
    unit.path = [];
    unit.pathIndex = 0;
    unit.holdPosition = true;
    unit.boundPhase = 'cover';
  }
}

export function assignBoundingAdvance(
  ctx: SimContext,
  units: readonly MutableUnit[],
  destination: Vec2,
  targetId: number | null,
  aheadOf?: Vec2,
): void {
  // Soldiers already sent to each cover this rush: a cover takes as many as
  // fit along it, spread out, so a team does not pile onto one point.
  const claims = new Map<number, number>();
  // In the open the team keeps its frontage: every man runs the same heading.
  const team = centroidOf(units);
  const headingX = destination.x - team.x;
  const headingY = destination.y - team.y;
  const headingLength = Math.sqrt(headingX * headingX + headingY * headingY);
  for (const unit of units) {
    const currentDistance = Math.sqrt(
      (unit.x - destination.x) ** 2 + (unit.y - destination.y) ** 2,
    );
    let best: Vec2 | null = null;
    let bestCover: CoverPoint | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cover of ctx.covers) {
      if ((claims.get(cover.id) ?? 0) >= coverCapacity(cover)) {
        continue;
      }
      const coverDistance = Math.sqrt((cover.x - unit.x) ** 2 + (cover.y - unit.y) ** 2);
      if (coverDistance > RUSH_COVER_REACH || coverDistance < 0.6) {
        continue;
      }
      const destinationDistance = Math.sqrt(
        (cover.x - destination.x) ** 2 + (cover.y - destination.y) ** 2,
      );
      // Only cover ahead that gains real ground: inside a 45-degree cone toward
      // the objective and at least half a rush nearer (movement-polish).
      if (destinationDistance > currentDistance - RUSH_COVER_GAIN) {
        continue;
      }
      const toCoverX = cover.x - unit.x;
      const toCoverY = cover.y - unit.y;
      const toGoalX = destination.x - unit.x;
      const toGoalY = destination.y - unit.y;
      if (toCoverX * toGoalX + toCoverY * toGoalY < COS_45 * coverDistance * currentDistance) {
        continue;
      }
      if (
        aheadOf &&
        destinationDistance >=
          Math.sqrt((aheadOf.x - destination.x) ** 2 + (aheadOf.y - destination.y) ** 2) - 1
      ) {
        continue;
      }
      if (
        isPointBlockedByCovers(cover.x, cover.y, ctx.covers, 0.8) ||
        occupied(ctx, cover.x, cover.y, unit)
      ) {
        continue;
      }
      const path = findPath({ x: unit.x, y: unit.y }, cover, ctx.covers);
      if (path.length === 0) {
        continue;
      }
      const score = destinationDistance + path.length * 0.15 - cover.quality * 3;
      if (score < bestScore) {
        bestScore = score;
        bestCover = cover;
      }
    }
    if (bestCover) {
      const claimed = claims.get(bestCover.id) ?? 0;
      claims.set(bestCover.id, claimed + 1);
      best = placeAlongCover(ctx, bestCover, claimed, unit);
    }
    if (!best) {
      const length = Math.sqrt((destination.x - unit.x) ** 2 + (destination.y - unit.y) ** 2);
      if (length > 0.001 && headingLength > 0.001) {
        // A rush is 3 to 5 s at a run, and never past the objective.
        const distance = Math.min(length, Math.min(RUSH_MAX, Math.max(RUSH_MIN, length * 0.5)));
        best = nearestOpenPoint(ctx, {
          x: unit.x + (headingX / headingLength) * distance,
          y: unit.y + (headingY / headingLength) * distance,
        });
      }
    }
    if (!best) {
      unit.boundPhase = 'cover';
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, best, ctx.covers);
    if (path.length === 0) {
      unit.boundPhase = 'cover';
      return;
    }
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = best.x;
    unit.targetY = best.y;
    unit.holdPosition = false;
    unit.boundPhase = 'advance';
    queueUnitOrder(ctx, unit, path, 'move');
  }
}

/**
 * Alternating movement changes how a soldier gets there, not why: a defend,
 * ambush or other tactical order survives the bounds.
 */
function boundOrder(unit: MutableUnit): MutableUnit['currentOrder'] {
  return unit.currentOrder !== null && unit.currentOrder !== 'move' ? unit.currentOrder : 'move';
}
