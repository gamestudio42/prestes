import { findPath } from './pathfinding';
import { routeFor, sectionRoutes } from './section-routes';
import { matchDestinations } from './assignment';
import type {
  CoverPoint,
  FormationKind,
  Frame,
  UnitOrder,
  UnitSnapshot,
  Vec2,
} from './protocol';
import { eyeHeightForStance, firstSightBlocker, isPointBlockedByCovers } from './world';
import { getWeapon } from './weapons';
import { planCoverSlots, type CoverSlot } from './cover-slots';

import { VISION_CONE_DEGREES as PREVIEW_CONE_DEGREES } from './vision';
export { PREVIEW_CONE_DEGREES };
export const PREVIEW_CONE_RADIUS = 120;
export const DEFEND_REGION_RADIUS = 8;
const PREVIEW_FORMATION_SPACING = 2.8;

/**
 * Spacing between soldiers, metres: the default of a plain order, the close
 * order a drag starts from and the widest open order it reaches.
 */
export const DEFAULT_SPACING = 2.8;
export const MIN_SPACING = 1.5;
export const MAX_SPACING = 6;
/** Drag length (m) at which the section is fully opened. */
export const SPACING_FULL_DRAG = 20;

/** Clamps an ordered spacing to the allowed range. */
export function clampSpacing(spacing: number): number {
  return Math.min(MAX_SPACING, Math.max(MIN_SPACING, spacing));
}

/**
 * The spacing a facing drag of `length` metres asks for: the drag starts in
 * close order and opens linearly to the widest order at the full drag.
 */
export function dragSpacing(length: number): number {
  const t = Math.max(0, Math.min(1, length / SPACING_FULL_DRAG));
  return MIN_SPACING + t * (MAX_SPACING - MIN_SPACING);
}

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
  /** The cover slot this soldier would take. */
  slotId?: number;
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
  /** The facing the player is dragging, drawn as an arrow from the destination. */
  facingArrow?: { x: number; y: number; facingX: number; facingY: number; spacing: number };
}

export interface PreviewRequest {
  frame: Frame;
  unitIds: readonly number[];
  order: UnitOrder;
  formation?: FormationKind;
  to?: Vec2;
  targetId?: number;
  line?: { from: Vec2; to: Vec2 };
  /** Ground orders: the facing dragged by the player (not normalised). */
  facing?: Vec2;
  /** Ground orders: the spacing between soldiers set by the drag length. */
  spacing?: number;
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

/**
 * The nearest enemy the faction knows about, as the simulation picks it
 * (nearestKnownEnemyAt): under fog of war only the enemies its side sees now
 * count, so the preview and the order plan against the same man.
 */
export function nearestKnownEnemyAt(
  frame: Frame,
  point: Vec2,
  faction: UnitSnapshot['faction'],
): UnitSnapshot | null {
  return nearestEnemyIn(frame, point, faction, true);
}


function nearestEnemyIn(
  frame: Frame,
  point: Vec2,
  faction: UnitSnapshot['faction'],
  knownOnly: boolean,
): UnitSnapshot | null {
  const side = faction === 'column' || faction === 'legalist' ? faction : null;
  const seen = knownOnly && frame.fog && side && frame.seen ? new Set(frame.seen[side]) : null;
  let best: UnitSnapshot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of frame.units) {
    if (
      !candidate.alive ||
      candidate.routed ||
      candidate.incapacitated ||
      candidate.dummy ||
      candidate.faction === faction ||
      (faction !== 'column' && candidate.faction === 'target') ||
      (seen && !seen.has(candidate.id))
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

function facingToward(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  return length < 0.001 ? { x: 0, y: -1 } : { x: dx / length, y: dy / length };
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

/**
 * The cover slots a ground order would take: the simulation's planner, run on
 * the frame without reserving. Slots held by other soldiers stay taken.
 */
function previewCoverSlots(
  request: PreviewRequest,
  units: readonly UnitSnapshot[],
  anchors: readonly Vec2[],
  target: UnitSnapshot | null,
  facing: Vec2 | undefined,
  fast: boolean,
): Map<number, CoverSlot> {
  if (
    fast ||
    !request.to ||
    !GROUND_ORDERS.has(request.order) ||
    request.order === 'disperse' ||
    request.order === 'recon'
  ) {
    return new Map();
  }
  const selected = new Set(units.map((unit) => unit.id));
  const held = new Map<number, number>();
  for (const unit of request.frame.units) {
    if (unit.slotId != null && !selected.has(unit.id) && unit.alive && !unit.incapacitated) {
      held.set(unit.slotId, unit.id);
    }
  }
  const anchorMap = new Map<number, Vec2>();
  units.forEach((unit, index) => {
    const anchor = anchors[index];
    if (anchor) anchorMap.set(unit.id, anchor);
  });
  const line = request.order === 'move' && request.line;
  const center = line
    ? { x: (request.line!.from.x + request.line!.to.x) / 2, y: (request.line!.from.y + request.line!.to.y) / 2 }
    : request.to;
  const regionLimited = request.order === 'defend' || request.order === 'ambush';
  return planCoverSlots(units, anchorMap, request.frame.covers, {
    held,
    threat: target ?? nearestKnownEnemyAt(request.frame, center, units[0]!.faction),
    facing: line ? lineFacing(request.line!.from, request.line!.to) : (facing ?? null),
    click: line ? null : request.to,
    region: regionLimited ? { center: request.to, radius: DEFEND_REGION_RADIUS } : null,
  });
}

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
  const orderedFacing =
    request.facing && GROUND_ORDERS.has(request.order) && Math.sqrt(request.facing.x * request.facing.x + request.facing.y * request.facing.y) > 0.001
      ? facingToward({ x: 0, y: 0 }, request.facing)
      : undefined;
  let formationFacing: Vec2 | undefined;
  if (orderedFacing) {
    formationFacing = orderedFacing;
  } else if (lineDirection) {
    formationFacing = lineDirection;
  } else if (hasDestination && (request.order === 'defend' || request.order === 'ambush')) {
    const threat = target ?? nearestKnownEnemyAt(request.frame, request.to!, units[0]!.faction);
    formationFacing = threat ? facingToward(request.to!, threat) : averageAim(units);
  } else if (hasDestination && isPointNearCover(request.to!, request.frame.covers)) {
    formationFacing = averageAim(units) ?? averageFacing(units);
  } else if (request.order === 'aim') {
    formationFacing = aimDirection;
  } else if (hasDestination) {
    formationFacing = averageAim(units);
  }
  const coverFacing = formationFacing ?? averageFacing(units);
  const rawSlots = hasDestination
    ? request.line && request.order === 'move'
      ? lineFormationSlots(request.line.from, request.line.to, units.length)
      : formationSlots(
        units.map((unit) => ({ x: unit.x, y: unit.y })),
        request.to!,
        request.spacing !== undefined && GROUND_ORDERS.has(request.order)
          ? clampSpacing(request.spacing)
          : PREVIEW_FORMATION_SPACING,
        request.formation ?? 'line',
        formationFacing,
      )
    : units.map((unit) => ({ x: unit.x, y: unit.y }));
  // Same matching as the simulation: no two soldiers' routes cross.
  const slots = hasDestination ? matchDestinations(units, rawSlots) : rawSlots;

  const paths: PreviewPath[] = [];
  const cones: PreviewCone[] = [];
  // route-around-wire D5: ground orders route the soldiers as the move does,
  // with the simulation's own section routes (one search for a gathered
  // body, shifted per soldier; a soldier whose shifted leg is blocked or
  // would cross wire, or a scattered selection, searches his own).
  let groundRoutes: (Vec2[] | null)[] | null = null;
  const routedPath = (index: number, destinations: readonly Vec2[]): Vec2[] => {
    groundRoutes ??= sectionRoutes(request.frame.covers, units, destinations);
    const unit = units[index]!;
    const destination = destinations[index]!;
    return routeFor(groundRoutes[index], destination) ?? findPath({ x: unit.x, y: unit.y }, destination, request.frame.covers);
  };
  const sectionCentres = new Map<number, Vec2>();
  for (const squadId of new Set(units.map((unit) => unit.squadId))) {
    const section = units.filter((unit) => unit.squadId === squadId);
    sectionCentres.set(squadId, {
      x: section.reduce((sum, unit) => sum + unit.x, 0) / section.length,
      y: section.reduce((sum, unit) => sum + unit.y, 0) / section.length,
    });
  }
  const los: PreviewLos[] = [];
  const plannedSlots = previewCoverSlots(request, units, slots, target, coverFacing, fast);
  const groundFinal = !fast && hasDestination && GROUND_ORDERS.has(request.order);
  const finals = groundFinal
    ? matchDestinations(
        units,
        units.map((unit, index) => {
          const slot = plannedSlots.get(unit.id);
          if (slot) return { x: slot.x, y: slot.y, slot };
          const anchor = slots[index] ?? { x: unit.x, y: unit.y };
          const point =
            request.order === 'defend'
              ? clampToRegion(anchor, request.to!, DEFEND_REGION_RADIUS)
              : anchor;
          return { x: point.x, y: point.y, slot: null as CoverSlot | null };
        }),
      )
    : null;
  const coverSlots = new Map<number, CoverSlot>();
  if (finals) {
    units.forEach((unit, index) => {
      const slot = finals[index]?.slot;
      if (slot) coverSlots.set(unit.id, slot);
    });
  } else {
    for (const [id, slot] of plannedSlots) coverSlots.set(id, slot);
  }
  // Where each soldier would end: his cover slot or place in the full form,
  // his formation slot in the quick form.
  const groundDestinations = units.map((unit, index) => {
    const final = !fast && hasDestination && GROUND_ORDERS.has(request.order) ? finals?.[index] : undefined;
    return final ? { x: final.x, y: final.y } : (slots[index] ?? { x: unit.x, y: unit.y });
  });
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
      const centre = sectionCentres.get(unit.squadId) ?? { x: unit.x, y: unit.y };
      if (request.order === 'flank') {
        // The section flanks as a body: its flank point is taken from its centre.
        const dx = target.x - centre.x;
        const dy = target.y - centre.y;
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
      // A straight approach guide: a targeted order moves by rushes and finds
      // its way as it goes, so a searched route was not what would happen,
      // and 33 long searches per frame took 364 ms (movement-polish).
      const targetPoints = [{ x: unit.x, y: unit.y }, targetDestination];
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
      const final = finals?.[index];
      if (final) {
        destination = { x: final.x, y: final.y };
        cover = final.slot !== null;
      }
    }
    const path = hasDestination ? routedPath(index, groundDestinations) : [];
    const points = path.length > 0 ? [{ x: unit.x, y: unit.y }, ...path] : [];
    const slotId = coverSlots.get(unit.id)?.id;
    paths.push({ unitId: unit.id, points, destination, cover, ...(slotId === undefined ? {} : { slotId }) });

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

  const facingArrow =
    orderedFacing && request.to
      ? {
          x: request.to.x,
          y: request.to.y,
          facingX: orderedFacing.x,
          facingY: orderedFacing.y,
          spacing: clampSpacing(request.spacing ?? DEFAULT_SPACING),
        }
      : undefined;
  return { unitIds: units.map((unit) => unit.id), paths, cones, los, ...(facingArrow ? { facingArrow } : {}) };
}



































