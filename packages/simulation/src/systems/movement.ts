import { TICK_DT } from '@prestes/kernel';
import {
  MAP_BOUNDS,
  FIRE_RANGE,
  coverAgainst,
  getWeapon,
  terrainSpeedFactor,
  findPath,
  isPointBlockedByCovers,
} from '@prestes/shared';
import type { SimEvent, Vec2 } from '@prestes/shared';
import { FATIGUE_MAX, OPEN_POINT_DIRECTIONS, clamp } from './model';
import type { ActiveOrder, MutableUnit } from './model';
import type { SimContext } from './context';
import { hasLineOfSight, nearestOpenPoint, occupied, nearestEnemy } from './geometry';
import { woundSpeedFactor } from './casualties';

export function groupSpeedFactor(ctx: SimContext, unit: MutableUnit): number {
  if (unit.orderDestination === null || unit.currentOrder === null) {
    return 1;
  }
  const peers = ctx.units.filter(
    (other) =>
      other !== unit &&
      other.alive &&
      !other.incapacitated &&
      other.faction === unit.faction &&
      other.squadId === unit.squadId &&
      other.currentOrder === unit.currentOrder &&
      other.orderDestination !== null &&
      Math.abs(other.orderDestination.x - unit.orderDestination!.x) < 0.01 &&
      Math.abs(other.orderDestination.y - unit.orderDestination!.y) < 0.01 &&
      other.path.length > 0,
  );
  if (peers.length === 0) {
    return 1;
  }
  const remaining = Math.sqrt((unit.targetX - unit.x) ** 2 + (unit.targetY - unit.y) ** 2);
  const average =
    peers.reduce(
      (sum, other) =>
        sum + Math.sqrt((other.targetX - other.x) ** 2 + (other.targetY - other.y) ** 2),
      0,
    ) / peers.length;
  return remaining + 2 < average ? 0.55 : 1;
}

function inSlot(unit: MutableUnit): boolean {
  return (
    unit.slotId !== null &&
    unit.path.length === 0 &&
    (unit.x - unit.targetX) ** 2 + (unit.y - unit.targetY) ** 2 < 0.25
  );
}

export function separateUnits(ctx: SimContext): void {
  const living = ctx.units
    .filter((unit) => unit.alive && !unit.routed && !unit.dummy && !unit.incapacitated)
    .sort((left, right) => left.id - right.id);
  const minDistance = 1.2;
  for (let leftIndex = 0; leftIndex < living.length; leftIndex += 1) {
    const left = living[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < living.length; rightIndex += 1) {
      const right = living[rightIndex]!;
      let dx = right.x - left.x;
      let dy = right.y - left.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance >= minDistance) {
        continue;
      }
      const bothMoving =
        left.currentOrder === 'move' &&
        right.currentOrder === 'move' &&
        left.path.length > 0 &&
        right.path.length > 0 &&
        (left.targetX !== right.targetX || left.targetY !== right.targetY);
      if (bothMoving) {
        continue;
      }
      if (distance < 0.001) {
        dx = 0.001 * ((left.id + right.id) % 2 === 0 ? 1 : -1);
        dy = 0.001;
        distance = Math.sqrt(dx * dx + dy * dy);
      }
      // A soldier settled in a cover slot holds it; the other one gives way.
      const leftAnchored = inSlot(left);
      const rightAnchored = inSlot(right);
      if (leftAnchored && rightAnchored) {
        continue;
      }
      const overlap = minDistance - distance;
      const leftPush = leftAnchored ? 0 : rightAnchored ? overlap : overlap / 2;
      const rightPush = rightAnchored ? 0 : leftAnchored ? overlap : overlap / 2;
      const nx = dx / distance;
      const ny = dy / distance;
      left.x = clamp(left.x - nx * leftPush, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
      left.y = clamp(left.y - ny * leftPush, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
      right.x = clamp(right.x + nx * rightPush, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
      right.y = clamp(right.y + ny * rightPush, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
    }
  }
}

export function moveUnit(
  ctx: SimContext,
  unit: MutableUnit,
  tick: number,
  events: SimEvent[],
): void {
  if (
    !unit.alive ||
    unit.routed ||
    unit.dummy ||
    unit.incapacitated ||
    unit.state === 'pinned' ||
    unit.path.length === 0
  ) {
    return;
  }

  const point = unit.path[unit.pathIndex];
  if (!point) {
    unit.path = [];
    unit.pathIndex = 0;
    return;
  }

  const dx = point.x - unit.x;
  const dy = point.y - unit.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < 0.0001) {
    unit.pathIndex += 1;
    if (unit.pathIndex >= unit.path.length) {
      unit.path = [];
      unit.pathIndex = 0;
      unit.targetX = point.x;
      unit.targetY = point.y;
      unit.coverSeekCooldown = 0;
      events.push({ type: 'unit_arrived', tick, unitId: unit.id });
    }
    return;
  }

  const stanceFactor = unit.stance === 'prone' ? 0.45 : unit.stance === 'crouched' ? 0.7 : 1;
  const postureFactor = unit.posture === 'defensive' ? 0.65 : 1;
  const step =
    unit.speed *
    stanceFactor *
    postureFactor *
    TICK_DT *
    terrainSpeedFactor(unit.x, unit.y) *
    (0.75 + 0.25 * (unit.cohesion / 100)) *
    (1 - (unit.fatigue / FATIGUE_MAX) * 0.25) *
    woundSpeedFactor(ctx, unit) *
    groupSpeedFactor(ctx, unit);
  if (distance <= step) {
    unit.x = point.x;
    unit.y = point.y;
    unit.pathIndex += 1;
    if (unit.pathIndex >= unit.path.length) {
      unit.path = [];
      unit.pathIndex = 0;
      unit.targetX = point.x;
      unit.targetY = point.y;
      unit.coverSeekCooldown = 0;
      events.push({ type: 'unit_arrived', tick, unitId: unit.id });
    }
    return;
  }

  const nextX = unit.x + (dx / distance) * step;
  const nextY = unit.y + (dy / distance) * step;
  const hardBlocked = isPointBlockedByCovers(nextX, nextY, ctx.covers, 0);
  if (hardBlocked) {
    const detour = findPath(
      { x: unit.x, y: unit.y },
      { x: unit.targetX, y: unit.targetY },
      ctx.covers,
    );
    if (detour.length > 0) {
      unit.path = detour;
      unit.pathIndex = 0;
      return;
    }
    const order = unit.currentOrder ?? 'move';
    unit.currentOrder = 'hold';
    unit.orderIssued = false;
    unit.holdPosition = true;
    unit.path = [];
    unit.pathIndex = 0;
    events.push({ type: 'order_interrupted', tick, unitId: unit.id, order });
    return;
  }

  const softBlocked = isPointBlockedByCovers(nextX, nextY, ctx.covers, 0.8);
  if (softBlocked && !isPointBlockedByCovers(unit.x, unit.y, ctx.covers, 0.8)) {
    const detour = findPath(
      { x: unit.x, y: unit.y },
      { x: unit.targetX, y: unit.targetY },
      ctx.covers,
    );
    const nextPoint = detour[0];
    const waypoint = unit.path[unit.pathIndex];
    const sameWaypoint =
      nextPoint !== undefined &&
      waypoint !== undefined &&
      (nextPoint.x - waypoint.x) ** 2 + (nextPoint.y - waypoint.y) ** 2 < 0.01;
    const detourNear =
      nextPoint !== undefined && (nextPoint.x - unit.x) ** 2 + (nextPoint.y - unit.y) ** 2 <= 1;
    if (detour.length > 0 && !detourNear && !sameWaypoint) {
      unit.path = detour;
      unit.pathIndex = 0;
      return;
    }
    if (detour.length === 0) {
      const order = unit.currentOrder ?? 'move';
      unit.currentOrder = 'hold';
      unit.orderIssued = false;
      unit.holdPosition = true;
      unit.path = [];
      unit.pathIndex = 0;
      events.push({ type: 'order_interrupted', tick, unitId: unit.id, order });
      return;
    }
  }
  unit.x = nextX;
  unit.y = nextY;
  unit.fatigue = Math.min(FATIGUE_MAX, unit.fatigue + 0.8);
}

export function queueUnitOrder(
  ctx: SimContext,
  unit: MutableUnit,
  path: Vec2[],
  kind: ActiveOrder['kind'],
): void {
  ctx.orders = ctx.orders.filter((order) => !order.unitIds.includes(unit.id));
  ctx.orders.push({
    id: ctx.nextOrderId,
    unitIds: [unit.id],
    points: [{ x: unit.x, y: unit.y }, ...path],
    kind,
  });
  ctx.nextOrderId += 1;
}

export function repairStalledMovement(ctx: SimContext): void {
  for (const unit of ctx.units) {
    const advancingBounding = unit.boundTeam !== null && unit.boundPhase === 'advance';
    if (
      !unit.alive ||
      unit.routed ||
      unit.dummy ||
      unit.incapacitated ||
      unit.state === 'pinned' ||
      unit.path.length > 0 ||
      (!advancingBounding && (unit.holdPosition || unit.currentOrder !== 'move'))
    ) {
      continue;
    }
    const distance = Math.sqrt((unit.targetX - unit.x) ** 2 + (unit.targetY - unit.y) ** 2);
    if (distance <= 0.8) {
      unit.targetX = unit.x;
      unit.targetY = unit.y;
      continue;
    }
    let destination = { x: unit.targetX, y: unit.targetY };
    let path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
    if (path.length === 0) {
      destination = nearestOpenPoint(ctx, destination);
      path = findPath({ x: unit.x, y: unit.y }, destination, ctx.covers);
    }
    if (path.length === 0) {
      const escape = nearestOpenPoint(ctx, { x: unit.x, y: unit.y });
      if (escape.x !== unit.x || escape.y !== unit.y) {
        const rest = findPath(escape, destination, ctx.covers);
        if (rest.length > 0) {
          path = [escape, ...rest];
        }
      }
    }
    if (path.length === 0) {
      continue;
    }
    ctx.orders = ctx.orders.filter(
      (order) =>
        !(order.unitIds.length === 1 && order.unitIds[0] === unit.id && order.kind === 'move'),
    );
    unit.targetX = destination.x;
    unit.targetY = destination.y;
    unit.path = path;
    unit.pathIndex = 0;
    unit.orderIssued = true;
    unit.currentOrder = 'move';
    unit.lineMove = false;
    unit.holdPosition = false;
    queueUnitOrder(ctx, unit, path, 'move');
  }
}

export function updatePostureMovement(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (
      !unit.alive ||
      unit.routed ||
      unit.dummy ||
      unit.incapacitated ||
      unit.state === 'panicked' ||
      unit.state === 'pinned' ||
      unit.boundTeam !== null ||
      unit.path.length > 0 ||
      unit.holdPosition
    ) {
      continue;
    }
    if (unit.currentOrder !== null && unit.currentOrder !== 'attack') {
      continue;
    }
    if (unit.currentOrder === 'attack' || unit.posture === 'aggressive') {
      const target =
        (unit.targetId === null ? null : ctx.units.find((entry) => entry.id === unit.targetId)) ??
        nearestEnemy(ctx, unit);
      if (target && target.alive && !target.routed) {
        advanceTowardTarget(ctx, unit, target);
      }
      continue;
    }
    if (unit.currentOrder === null && unit.posture === 'protect-officer') {
      moveTowardOfficer(ctx, unit);
    }
  }
}

export function advanceTowardTarget(ctx: SimContext, unit: MutableUnit, target: MutableUnit): void {
  if (unit.path.length > 0 || !unit.alive || unit.routed || unit.incapacitated) {
    return;
  }
  const range = sightRange(ctx, unit);
  const currentDistance = Math.sqrt((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2);
  if (currentDistance <= range * 0.82) {
    return;
  }

  let best: Vec2 | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const cover of ctx.covers) {
    if (isPointBlockedByCovers(cover.x, cover.y, ctx.covers, 0.8)) {
      continue;
    }
    const coverDistance = Math.sqrt((cover.x - unit.x) ** 2 + (cover.y - unit.y) ** 2);
    if (coverDistance > 18) {
      continue;
    }
    const targetDistance = Math.sqrt((cover.x - target.x) ** 2 + (cover.y - target.y) ** 2);
    if (targetDistance > currentDistance - 2) {
      continue;
    }
    if (occupied(ctx, cover.x, cover.y, unit)) {
      continue;
    }
    if (coverAgainst(cover.x, cover.y, target.x, target.y, 'crouched', ctx.covers) < 0.2) {
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, cover, ctx.covers);
    if (path.length === 0) {
      continue;
    }
    const score = targetDistance + path.length * 0.1 - cover.quality * 4;
    if (score < bestScore) {
      bestScore = score;
      best = { x: cover.x, y: cover.y };
    }
  }

  if (!best) {
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0.001) {
      best = {
        x: target.x - (dx / length) * range * 0.78,
        y: target.y - (dy / length) * range * 0.78,
      };
    }
  }
  if (!best || isPointBlockedByCovers(best.x, best.y, ctx.covers, 0.8)) {
    return;
  }
  const path = findPath({ x: unit.x, y: unit.y }, best, ctx.covers);
  if (path.length === 0) {
    return;
  }
  unit.path = path;
  unit.pathIndex = 0;
  unit.targetX = best.x;
  unit.targetY = best.y;
  queueUnitOrder(ctx, unit, path, 'move');
}

export function moveTowardOfficer(ctx: SimContext, unit: MutableUnit): void {
  const officer = ctx.units.find(
    (entry) =>
      entry.alive &&
      !entry.incapacitated &&
      !entry.routed &&
      entry.kind === 'officer' &&
      entry.faction === unit.faction,
  );
  if (!officer) {
    return;
  }
  const distance = Math.sqrt((officer.x - unit.x) ** 2 + (officer.y - unit.y) ** 2);
  if (distance <= 6) {
    return;
  }
  const offsets = [
    { x: 1.8, y: 0 },
    { x: -1.8, y: 0 },
    { x: 0, y: 1.8 },
    { x: 0, y: -1.8 },
  ];
  for (const offset of offsets) {
    const candidate = { x: officer.x + offset.x, y: officer.y + offset.y };
    if (
      isPointBlockedByCovers(candidate.x, candidate.y, ctx.covers, 0.8) ||
      occupied(ctx, candidate.x, candidate.y, unit)
    ) {
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, candidate, ctx.covers);
    if (path.length === 0) {
      continue;
    }
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = candidate.x;
    unit.targetY = candidate.y;
    queueUnitOrder(ctx, unit, path, 'move');
    return;
  }
}

const SIGHT_ORDERS = new Set(['attack', 'suppress', 'pursue', 'ambush', 'defend']);

/** Firing distance: the weapon range, never beyond the scenario combat range. */
export function sightRange(ctx: SimContext, unit: MutableUnit): number {
  const weapon = getWeapon(unit.weaponId);
  return Math.min(weapon?.range ?? FIRE_RANGE, ctx.combatRange);
}

/**
 * Units with a combat order whose target is in range but hidden move to a
 * nearby point with a sightline, so cover never leaves them blind for good.
 */
export function repositionForSight(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (
      !unit.alive ||
      unit.routed ||
      unit.dummy ||
      unit.incapacitated ||
      unit.holdFire ||
      unit.state === 'pinned' ||
      unit.state === 'panicked' ||
      unit.boundTeam !== null ||
      unit.path.length > 0 ||
      unit.targetId === null ||
      unit.currentOrder === null ||
      !SIGHT_ORDERS.has(unit.currentOrder)
    ) {
      continue;
    }
    const target = ctx.units.find((entry) => entry.id === unit.targetId);
    if (!target || !target.alive || target.routed) {
      continue;
    }
    const range = sightRange(ctx, unit);
    if ((target.x - unit.x) ** 2 + (target.y - unit.y) ** 2 > range * range) {
      continue;
    }
    if (hasLineOfSight(ctx, unit, unit.stance, target)) {
      continue;
    }
    const best = sightPoint(ctx, unit, target, range);
    if (!best) {
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, best, ctx.covers);
    if (path.length === 0) {
      continue;
    }
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = best.x;
    unit.targetY = best.y;
    unit.holdPosition = false;
    queueUnitOrder(ctx, unit, path, 'move');
  }
}

function sightPoint(
  ctx: SimContext,
  unit: MutableUnit,
  target: MutableUnit,
  range: number,
): Vec2 | null {
  // Prefer a short step from the shooter; if a long obstacle hides the target
  // from everywhere nearby, look for a firing point around the target instead.
  return (
    bestSightPoint(ctx, unit, target, range, unit, [2, 4, 6, 8, 10]) ??
    bestSightPoint(ctx, unit, target, range, target, [10, 15, 20, 25])
  );
}

function bestSightPoint(
  ctx: SimContext,
  unit: MutableUnit,
  target: MutableUnit,
  range: number,
  origin: Vec2,
  radii: readonly number[],
): Vec2 | null {
  let best: Vec2 | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const radius of radii) {
    for (const direction of OPEN_POINT_DIRECTIONS) {
      const candidate = {
        x: origin.x + direction.x * radius,
        y: origin.y + direction.y * radius,
      };
      if (
        candidate.x < MAP_BOUNDS.minX ||
        candidate.x > MAP_BOUNDS.maxX ||
        candidate.y < MAP_BOUNDS.minY ||
        candidate.y > MAP_BOUNDS.maxY ||
        isPointBlockedByCovers(candidate.x, candidate.y, ctx.covers, 0.8) ||
        occupied(ctx, candidate.x, candidate.y, unit)
      ) {
        continue;
      }
      if (
        unit.orderRegionCenter &&
        (candidate.x - unit.orderRegionCenter.x) ** 2 +
          (candidate.y - unit.orderRegionCenter.y) ** 2 >
          unit.orderRegionRadius * unit.orderRegionRadius
      ) {
        continue;
      }
      if ((target.x - candidate.x) ** 2 + (target.y - candidate.y) ** 2 > range * range) {
        continue;
      }
      if (!hasLineOfSight(ctx, candidate, 'crouched', target)) {
        continue;
      }
      const cover = coverAgainst(candidate.x, candidate.y, target.x, target.y, 'crouched', ctx.covers);
      const travel = Math.sqrt((candidate.x - unit.x) ** 2 + (candidate.y - unit.y) ** 2);
      const score = travel - cover * 4;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }
  return best;
}

const INSTRUCTOR_FOLLOW_START = 15;
const INSTRUCTOR_FOLLOW_STOP = 12;

/**
 * Training: the instructor (the column officer outside the player section) walks
 * after the section, stopping behind it within aura range.
 */
export function updateInstructorFollow(ctx: SimContext): void {
  if (!ctx.training || ctx.instructorPinned) {
    return;
  }
  const instructor = ctx.units.find(
    (unit) => unit.faction === 'column' && unit.kind === 'officer' && unit.squadId === 99,
  );
  if (
    !instructor ||
    !instructor.alive ||
    instructor.incapacitated ||
    instructor.routed ||
    instructor.state === 'pinned' ||
    instructor.state === 'panicked' ||
    instructor.path.length > 0
  ) {
    return;
  }
  const section = ctx.units.filter(
    (unit) =>
      unit.faction === 'column' &&
      unit.squadId !== 99 &&
      !unit.dummy &&
      unit.alive &&
      !unit.incapacitated &&
      !unit.routed,
  );
  if (section.length === 0) {
    return;
  }
  const centroid = {
    x: section.reduce((sum, unit) => sum + unit.x, 0) / section.length,
    y: section.reduce((sum, unit) => sum + unit.y, 0) / section.length,
  };
  const dx = instructor.x - centroid.x;
  const dy = instructor.y - centroid.y;
  const gap = Math.sqrt(dx * dx + dy * dy);
  if (gap <= INSTRUCTOR_FOLLOW_START) {
    return;
  }
  const stop = INSTRUCTOR_FOLLOW_STOP * 0.5;
  const destination = nearestOpenPoint(ctx, {
    x: centroid.x + (dx / gap) * stop,
    y: centroid.y + (dy / gap) * stop,
  });
  const path = findPath({ x: instructor.x, y: instructor.y }, destination, ctx.covers);
  if (path.length === 0) {
    return;
  }
  instructor.path = path;
  instructor.pathIndex = 0;
  instructor.targetX = destination.x;
  instructor.targetY = destination.y;
  instructor.holdPosition = false;
  queueUnitOrder(ctx, instructor, path, 'move');
}
