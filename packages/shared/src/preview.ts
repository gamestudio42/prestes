import { findPath } from './pathfinding';
import type {
  CoverPoint,
  FormationKind,
  Frame,
  UnitOrder,
  UnitSnapshot,
  Vec2,
} from './protocol';
import { coverAgainst, eyeHeightForStance, firstSightBlocker, isPointBlockedByCovers } from './world';
import { getWeapon } from './weapons';

import { VISION_CONE_DEGREES as PREVIEW_CONE_DEGREES } from './vision';
export { PREVIEW_CONE_DEGREES };
export const PREVIEW_CONE_RADIUS = 120;
export const DEFEND_REGION_RADIUS = 8;
const PREVIEW_FORMATION_SPACING = 2.8;
const PREVIEW_COVER_OFFSET = 2;

export function clampToRegion(point: Vec2, center: Vec2, radius: number): Vec2 {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= radius || distance < 0.001) {
    return { ...point };
  }
  return {
    x: center.x + (dx / distance) * radius,
    y: center.y + (dy / distance) * radius,
  };
}

export interface PreviewPath {
  unitId: number;
  points: Vec2[];
  destination: Vec2;
  cover: boolean;
}

export interface PreviewCone {
  unitId: number;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  degrees: number;
  radius: number;
}

export interface PreviewLos {
  unitId: number;
  from: Vec2;
  to: Vec2;
  blockedAt: Vec2 | null;
}

export interface PreviewPlan {
  unitIds: number[];
  paths: PreviewPath[];
  cones: PreviewCone[];
  los: PreviewLos[];
}

export interface PreviewRequest {
  frame: Frame;
  unitIds: readonly number[];
  order: UnitOrder;
  formation?: FormationKind;
  to?: Vec2;
  targetId?: number;
  line?: { from: Vec2; to: Vec2 };
  fast?: boolean;
}

export function averageFacing(
  units: readonly { facingX: number; facingY: number }[],
): Vec2 | undefined {
  let x = 0;
  let y = 0;
  for (const unit of units) {
    x += unit.facingX;
    y += unit.facingY;
  }
  const length = Math.sqrt(x * x + y * y);
  return length < 0.001 ? undefined : { x: x / length, y: y / length };
}

export function averageAim(
  units: readonly { aimX?: number | null; aimY?: number | null }[],
): Vec2 | undefined {
  let x = 0;
  let y = 0;
  let count = 0;
  for (const unit of units) {
    if (unit.aimX === null || unit.aimX === undefined || unit.aimY === null || unit.aimY === undefined) {
      continue;
    }
    x += unit.aimX;
    y += unit.aimY;
    count += 1;
  }
  const length = Math.sqrt(x * x + y * y);
  return count === 0 || length < 0.001 ? undefined : { x: x / length, y: y / length };
}

export function lineFacing(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) {
    return { x: 0, y: -1 };
  }
  return { x: dy / length, y: -dx / length };
}

export function lineFormationSlots(
  from: Vec2,
  to: Vec2,
  count: number,
  spacing = PREVIEW_FORMATION_SPACING,
): Vec2[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [{ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }];
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) {
    return Array.from({ length: count }, () => ({ ...from }));
  }
  const usable = Math.max(0, length - Math.min(length, spacing));
  const slots: Vec2[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const distance = (usable * t) / Math.max(0.001, length);
    slots.push({ x: from.x + dx * distance, y: from.y + dy * distance });
  }
  return slots;
}
export function isPointNearCover(
  point: Vec2,
  covers: readonly CoverPoint[],
  radius = 6,
): boolean {
  return covers.some(
    (cover) => (cover.x - point.x) ** 2 + (cover.y - point.y) ** 2 <= radius * radius,
  );
}
export function formationSlots(
  positions: readonly Vec2[],
  to: Vec2,
  spacing = 2.8,
  formation: FormationKind = 'line',
  facing?: Vec2,
): Vec2[] {
  if (positions.length <= 1) {
    return positions.map(() => ({ ...to }));
  }
  const centroid = positions.reduce(
    (sum, point) => ({
      x: sum.x + point.x / positions.length,
      y: sum.y + point.y / positions.length,
    }),
    { x: 0, y: 0 },
  );
  let dx = 0;
  let dy = -1;
  const facingLength = facing ? Math.sqrt(facing.x * facing.x + facing.y * facing.y) : 0;
  if (facing && facingLength > 0.001) {
    dx = facing.x / facingLength;
    dy = facing.y / facingLength;
  } else {
    dx = to.x - centroid.x;
    dy = to.y - centroid.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.001) {
      dx = 0;
      dy = -1;
    } else {
      dx /= length;
      dy /= length;
    }
  }
  const perpendicular = { x: -dy, y: dx };
  if (formation === 'column') {
    return positions.map((_, index) => ({
      x: to.x - dx * index * spacing,
      y: to.y - dy * index * spacing,
    }));
  }
  if (formation === 'wedge') {
    return positions.map((_, index) => {
      if (index === 0) return { ...to };
      const rank = Math.ceil(index / 2);
      const side = index % 2 === 1 ? 1 : -1;
      return {
        x: to.x - dx * rank * spacing * 0.8 + perpendicular.x * side * rank * spacing * 0.7,
        y: to.y - dy * rank * spacing * 0.8 + perpendicular.y * side * rank * spacing * 0.7,
      };
    });
  }
  if (formation === 'free') {
    return positions.map((point) => ({
      x: to.x + point.x - centroid.x,
      y: to.y + point.y - centroid.y,
    }));
  }
  return positions.map((_, index) => {
    const offset = (index - (positions.length - 1) / 2) * spacing;
    return {
      x: to.x + perpendicular.x * offset,
      y: to.y + perpendicular.y * offset,
    };
  });
}

function nearestEnemyAt(
  frame: Frame,
  point: Vec2,
  faction: UnitSnapshot['faction'],
): UnitSnapshot | null {
  let best: UnitSnapshot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of frame.units) {
    if (
      !candidate.alive ||
      candidate.routed ||
      candidate.dummy ||
      candidate.faction === faction
    ) {
      continue;
    }
    const distance = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function nearestEnemy(frame: Frame, unit: UnitSnapshot): UnitSnapshot | null {
  return nearestEnemyAt(frame, unit, unit.faction);
}

function facingToward(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  return length < 0.001 ? { x: 0, y: -1 } : { x: dx / length, y: dy / length };
}

export function coverDestinationForSlot(
  unit: { x: number; y: number },
  slot: Vec2,
  threat: { x: number; y: number } | null,
  covers: readonly CoverPoint[],
  used: readonly Vec2[] = [],
  sideAnchor?: Vec2,
  facing?: Vec2,
): { destination: Vec2; cover: boolean } {
  const candidates: Array<{ destination: Vec2; score: number }> = [];
  for (const point of covers) {
    const slotDistance = Math.sqrt((point.x - slot.x) ** 2 + (point.y - slot.y) ** 2);
    if (slotDistance > 6) continue;
    const sideReference =
      facing && !threat
        ? { x: point.x - facing.x, y: point.y - facing.y }
        : (sideAnchor ?? slot);
    const sideTooClose =
      (sideReference.x - point.x) ** 2 + (sideReference.y - point.y) ** 2 < 0.36;
    const reference = threat ?? (sideTooClose ? unit : sideReference);
    const sideCheck = threat ? (sideAnchor ?? slot) : reference;
    const normalX = threat ? point.x - threat.x : reference.x - point.x;
    const normalY = threat ? point.y - threat.y : reference.y - point.y;
    const normalLength = Math.sqrt(normalX * normalX + normalY * normalY);
    if (normalLength < 0.001) continue;
    const nx = normalX / normalLength;
    const ny = normalY / normalLength;
    const tangentX = -ny;
    const tangentY = nx;
    const baseX = point.x + nx * PREVIEW_COVER_OFFSET;
    const baseY = point.y + ny * PREVIEW_COVER_OFFSET;
    const extent = Math.max(0, point.halfWidth - 0.7);
    const lateralOffsets = [0];
    for (let offset = 1.1; offset <= extent + 0.01; offset += 1.1) {
      lateralOffsets.push(offset, -offset);
    }
    for (const lateral of lateralOffsets) {
      const candidate = {
        x: baseX + tangentX * lateral,
        y: baseY + tangentY * lateral,
      };
      if (
        (sideCheck.x - point.x) * (candidate.x - point.x) +
          (sideCheck.y - point.y) * (candidate.y - point.y) <
        0
      ) {
        continue;
      }
      if (
        used.some(
          (entry) => (entry.x - candidate.x) ** 2 + (entry.y - candidate.y) ** 2 < 1.2 * 1.2,
        )
      ) {
        continue;
      }
      if (isPointBlockedByCovers(candidate.x, candidate.y, covers, 0.8)) {
        continue;
      }
      if (
        threat &&
        coverAgainst(candidate.x, candidate.y, threat.x, threat.y, 'crouched', covers) < 0.1
      ) {
        continue;
      }
      const score = (candidate.x - slot.x) ** 2 + (candidate.y - slot.y) ** 2;
      candidates.push({ destination: candidate, score });
    }
  }
  candidates.sort((left, right) => left.score - right.score);
  for (const candidate of candidates) {
    if (findPath({ x: unit.x, y: unit.y }, candidate.destination, covers).length > 0) {
      return { destination: candidate.destination, cover: true };
    }
  }
  return { destination: slot, cover: false };
}
const GROUND_ORDERS = new Set<UnitOrder>([
  'move',
  'advance',
  'defend',
  'ambush',
  'disperse',
  'recon',
  'reserve',
]);

export function planOrderPreview(request: PreviewRequest): PreviewPlan | null {
  const unitIds = new Set(request.unitIds);
  const units = request.frame.units.filter(
    (unit) =>
      unitIds.has(unit.id) &&
      unit.alive &&
      !unit.routed &&
      !unit.dummy &&
      !unit.incapacitated,
  );
  if (units.length === 0) {
    return null;
  }
  const fast = request.fast === true;
  const target =
    request.targetId === undefined
      ? null
      : request.frame.units.find((unit) => unit.id === request.targetId) ?? null;
  if (request.targetId !== undefined && target === null) {
    return null;
  }
  if (GROUND_ORDERS.has(request.order) && !request.to) {
    return null;
  }

  const hasDestination = request.to !== undefined && request.order !== 'aim';
  const centroid = units.reduce(
    (sum, unit) => ({ x: sum.x + unit.x / units.length, y: sum.y + unit.y / units.length }),
    { x: 0, y: 0 },
  );
  const aimDirection =
    request.order === 'aim' && request.to
      ? (() => {
          const dx = request.to!.x - centroid.x;
          const dy = request.to!.y - centroid.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          return length < 0.001 ? undefined : { x: dx / length, y: dy / length };
        })()
      : undefined;
  const lineDirection =
    request.order === 'move' && request.line
      ? lineFacing(request.line.from, request.line.to)
      : undefined;
  let formationFacing: Vec2 | undefined;
  if (lineDirection) {
    formationFacing = lineDirection;
  } else if (hasDestination && (request.order === 'defend' || request.order === 'ambush')) {
    const threat = target ?? nearestEnemyAt(request.frame, request.to!, units[0]!.faction);
    formationFacing = threat ? facingToward(request.to!, threat) : averageAim(units);
  } else if (hasDestination && isPointNearCover(request.to!, request.frame.covers)) {
    formationFacing = averageAim(units) ?? averageFacing(units);
  } else if (request.order === 'aim') {
    formationFacing = aimDirection;
  } else if (hasDestination) {
    formationFacing = averageAim(units);
  }
  const coverFacing = formationFacing ?? averageFacing(units);
  const slots = hasDestination
    ? request.line && request.order === 'move'
      ? lineFormationSlots(request.line.from, request.line.to, units.length)
      : formationSlots(
        units.map((unit) => ({ x: unit.x, y: unit.y })),
        request.to!,
        PREVIEW_FORMATION_SPACING,
        request.formation ?? 'line',
        formationFacing,
      )
    : units.map((unit) => ({ x: unit.x, y: unit.y }));

  const paths: PreviewPath[] = [];
  const cones: PreviewCone[] = [];
  const los: PreviewLos[] = [];
  const usedCover: Vec2[] = [];
  units.forEach((unit, index) => {
    let destination = slots[index] ?? { x: unit.x, y: unit.y };
    let cover = false;
    if (
      !fast &&
      target &&
      (request.order === 'attack' ||
        request.order === 'flank' ||
        request.order === 'pursue' ||
        request.order === 'rescue')
    ) {
      let targetDestination = { x: target.x, y: target.y };
      if (request.order === 'flank') {
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpendicular = { x: -dy / length, y: dx / length };
        const candidates = [
          { x: target.x + perpendicular.x * 9, y: target.y + perpendicular.y * 9 },
          { x: target.x - perpendicular.x * 9, y: target.y - perpendicular.y * 9 },
        ];
        for (const candidate of candidates) {
          if (isPointBlockedByCovers(candidate.x, candidate.y, request.frame.covers, 0.8)) {
            continue;
          }
          targetDestination = candidate;
          break;
        }
      }
      const targetPath = findPath(
        { x: unit.x, y: unit.y },
        targetDestination,
        request.frame.covers,
      );
      const targetPoints =
        targetPath.length > 0 ? [{ x: unit.x, y: unit.y }, ...targetPath] : [];
      paths.push({
        unitId: unit.id,
        points: targetPoints,
        destination: targetDestination,
        cover: false,
      });
      const dx = target.x - targetDestination.x;
      const dy = target.y - targetDestination.y;
      const length = Math.sqrt(dx * dx + dy * dy) || 1;
      cones.push({
        unitId: unit.id,
        x: targetDestination.x,
        y: targetDestination.y,
        facingX: dx / length,
        facingY: dy / length,
        degrees: PREVIEW_CONE_DEGREES,
        radius: PREVIEW_CONE_RADIUS,
      });
      return;
    }
    if (!fast && hasDestination && GROUND_ORDERS.has(request.order)) {
      const planned = coverDestinationForSlot(
        unit,
        destination,
        target ?? nearestEnemy(request.frame, unit),
        request.frame.covers,
        usedCover,
        request.to,
        coverFacing,
      );
      destination = planned.destination;
      cover = planned.cover;
      if (request.order === 'defend') {
        destination = clampToRegion(destination, request.to!, DEFEND_REGION_RADIUS);
      }
      if (cover) {
        usedCover.push(destination);
      }
    }
    const path = hasDestination
      ? fast
        ? [{ ...destination }]
        : findPath({ x: unit.x, y: unit.y }, destination, request.frame.covers)
      : [];
    const points = path.length > 0 ? [{ x: unit.x, y: unit.y }, ...path] : [];
    paths.push({ unitId: unit.id, points, destination, cover });

    const facing = formationFacing;
    const dx = facing?.x ?? unit.facingX;
    const dy = facing?.y ?? unit.facingY;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    cones.push({
      unitId: unit.id,
      x: destination.x,
      y: destination.y,
      facingX: dx / length,
      facingY: dy / length,
      degrees: PREVIEW_CONE_DEGREES,
      radius: PREVIEW_CONE_RADIUS,
    });
    if (!fast) {
      if (request.order === 'aim' && aimDirection) {
        const range = getWeapon(unit.weaponId)?.range ?? 26;
        const end = {
          x: unit.x + aimDirection.x * range,
          y: unit.y + aimDirection.y * range,
        };
        los.push({
          unitId: unit.id,
          from: { x: unit.x, y: unit.y },
          to: end,
          blockedAt: firstSightBlocker(
            unit.x,
            unit.y,
            end.x,
            end.y,
            request.frame.covers,
            request.frame.sightObstacles ?? [],
            eyeHeightForStance(unit.stance),
          ),
        });
      } else if (lineDirection) {
        const range = getWeapon(unit.weaponId)?.range ?? 26;
        const end = {
          x: destination.x + lineDirection.x * range,
          y: destination.y + lineDirection.y * range,
        };
        los.push({
          unitId: unit.id,
          from: { ...destination },
          to: end,
          blockedAt: firstSightBlocker(
            destination.x,
            destination.y,
            end.x,
            end.y,
            request.frame.covers,
            request.frame.sightObstacles ?? [],
            eyeHeightForStance(cover ? 'crouched' : unit.stance),
          ),
        });
      }
    }
  });

  return { unitIds: units.map((unit) => unit.id), paths, cones, los };
}



































