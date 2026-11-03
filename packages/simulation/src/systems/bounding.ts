import { averageFacing, findPath, isPointBlockedByCovers } from '@prestes/shared';
import type { Vec2 } from '@prestes/shared';
import { formationSlots } from '../tactical';
import { BOUNDING_ORDERS } from './model';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { nearestOpenPoint, occupied } from './geometry';
import { queueUnitOrder } from './movement';

export function updateBounding(ctx: SimContext): void {
  if (!ctx.boundingEnabled) {
    return;
  }
  const eligible = ctx.units.filter(
    (unit) =>
      unit.faction === 'column' &&
      unit.alive &&
      !unit.routed &&
      !unit.dummy &&
      !unit.incapacitated &&
      unit.state !== 'pinned' &&
      !unit.lineMove &&
      unit.currentOrder !== null &&
      BOUNDING_ORDERS.has(unit.currentOrder),
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
      const target =
        first.targetId === null ? null : ctx.units.find((entry) => entry.id === first.targetId);
      const destination = target
        ? { x: target.x, y: target.y }
        : (first.orderDestination ?? {
            x: sorted.reduce((sum, unit) => sum + unit.x, 0) / sorted.length,
            y: sorted.reduce((sum, unit) => sum + unit.y, 0) / sorted.length,
          });
      const slots = formationSlots(
        sorted.map((unit) => ({ x: unit.x, y: unit.y })),
        destination,
        2.8,
        first.formation ?? 'line',
        averageFacing(sorted),
      );
      const targets = new Map<number, Vec2>();
      sorted.forEach((unit, index) => {
        targets.set(unit.id, slots[index] ?? destination);
      });
      group = {
        squadId,
        teamA: teamA.map((unit) => unit.id),
        teamB: teamB.map((unit) => unit.id),
        destination,
        targetId: first.targetId,
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
      } else {
        assignBoundingDirect(ctx, teamB, destination, group.targets);
      }
      continue;
    }

    const first = units[0]!;
    const target =
      first.targetId === null ? null : ctx.units.find((entry) => entry.id === first.targetId);
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
            unit.currentOrder = 'move';
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

export function assignBoundingDirect(
  ctx: SimContext,
  units: readonly MutableUnit[],
  destination: Vec2,
  targets?: ReadonlyMap<number, Vec2>,
): void {
  const slots = formationSlots(
    units.map((unit) => ({ x: unit.x, y: unit.y })),
    destination,
    2.8,
    units[0]?.formation ?? 'line',
    averageFacing(units),
  );
  units.forEach((unit, index) => {
    // A slot inside a cover's clearance has no path; without this the soldier
    // would wait in cover forever while the rest of the team moves on.
    const target = nearestOpenPoint(ctx, targets?.get(unit.id) ?? slots[index] ?? destination);
    unit.targetX = target.x;
    unit.targetY = target.y;
    unit.holdPosition = false;
    unit.currentOrder = 'move';
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
  for (const unit of units) {
    const currentDistance = Math.sqrt(
      (unit.x - destination.x) ** 2 + (unit.y - destination.y) ** 2,
    );
    let best: Vec2 | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cover of ctx.covers) {
      const coverDistance = Math.sqrt((cover.x - unit.x) ** 2 + (cover.y - unit.y) ** 2);
      if (coverDistance > 16 || coverDistance < 0.6) {
        continue;
      }
      const destinationDistance = Math.sqrt(
        (cover.x - destination.x) ** 2 + (cover.y - destination.y) ** 2,
      );
      if (destinationDistance >= currentDistance - 1.5) {
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
        best = { x: cover.x, y: cover.y };
      }
    }
    if (!best) {
      const dx = destination.x - unit.x;
      const dy = destination.y - unit.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0.001) {
        const distance = Math.min(8, Math.max(2, length * 0.5));
        best = {
          x: unit.x + (dx / length) * distance,
          y: unit.y + (dy / length) * distance,
        };
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
