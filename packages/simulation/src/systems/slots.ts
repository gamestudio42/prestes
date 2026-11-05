import { SLOT_ROOM, cachedCoverSlots, matchDestinations, planCoverSlots } from '@prestes/shared';
import type { CoverSlot, CoverSlotPlan, Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';

/** A slot is kept while its holder is still heading for (or standing in) it. */
const SLOT_KEEP_DISTANCE = 0.5;

function slotById(ctx: SimContext, id: number): CoverSlot | undefined {
  return cachedCoverSlots(ctx.covers).find((slot) => slot.id === id);
}

/** Slot id -> unit id for every reserved slot. */
export function slotHolders(ctx: SimContext): Map<number, number> {
  const holders = new Map<number, number>();
  for (const unit of ctx.units) {
    if (unit.slotId !== null) {
      holders.set(unit.slotId, unit.id);
    }
  }
  return holders;
}

export function releaseSlot(unit: MutableUnit): void {
  unit.slotId = null;
}

/**
 * Releases slots whose holder fell, broke, despawned, took a new destination,
 * or whose cover is gone; a soldier settled in its slot faces out of it.
 */
export function maintainSlots(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (unit.slotId === null) {
      continue;
    }
    const slot = slotById(ctx, unit.slotId);
    if (
      !slot ||
      !unit.alive ||
      unit.incapacitated ||
      unit.routed ||
      // While bounding, a soldier waits short of its slot and keeps it.
      (unit.boundTeam === null &&
        (unit.targetX - slot.x) ** 2 + (unit.targetY - slot.y) ** 2 >
          SLOT_KEEP_DISTANCE * SLOT_KEEP_DISTANCE)
    ) {
      unit.slotId = null;
      continue;
    }
    const settled = (unit.x - slot.x) ** 2 + (unit.y - slot.y) ** 2 < 0.36;
    if (settled && slot.guard && unit.targetId === null && unit.aimX === null) {
      unit.facingX = slot.guard.x;
      unit.facingY = slot.guard.y;
    }
  }
}

/**
 * Plans cover slots for an order. The ordered soldiers' own slots count as
 * free, so a re-issued order can keep or swap them.
 */
export function orderSlots(
  ctx: SimContext,
  units: readonly MutableUnit[],
  anchors: readonly (Vec2 | undefined)[],
  plan: Omit<CoverSlotPlan, 'held'>,
): Map<number, CoverSlot> {
  const anchorMap = new Map<number, Vec2>();
  units.forEach((unit, index) => {
    const anchor = anchors[index];
    if (anchor) {
      anchorMap.set(unit.id, anchor);
    }
  });
  for (const unit of units) {
    unit.slotId = null;
  }
  // The training troop is placed by the exercise director, not by cover.
  const takers = units.filter((unit) => unit.role !== 'training-enemy');
  return planCoverSlots(takers, anchorMap, ctx.covers, { ...plan, held: slotHolders(ctx) });
}

/** Reserves the slot and takes its stance. */
export function takeSlot(unit: MutableUnit, slot: CoverSlot): Vec2 {
  unit.slotId = slot.id;
  if (!unit.stanceLocked) {
    unit.stance = slot.stance;
  }
  return { x: slot.x, y: slot.y };
}

/**
 * Final destinations for an order: each soldier's cover slot or its anchor
 * (passed through `place`), re-matched to the soldiers by minimum total
 * distance so the routes into the slots do not cross.
 */
export function matchedDestinations(
  units: readonly MutableUnit[],
  anchors: readonly (Vec2 | undefined)[],
  coverSlots: ReadonlyMap<number, CoverSlot>,
  fallback: Vec2,
  place: (anchor: Vec2) => Vec2 = (anchor) => anchor,
): Array<{ x: number; y: number; slot: CoverSlot | null }> {
  const taken: Vec2[] = [...coverSlots.values()].map((slot) => ({ x: slot.x, y: slot.y }));
  const finals = units.map((unit, index) => {
    const slot = coverSlots.get(unit.id);
    if (slot) return { x: slot.x, y: slot.y, slot };
    // A soldier without a slot takes a place of his own: two anchors can be
    // placed on one point (the region clamp, the nearest open point).
    const point = roomOf(place(anchors[index] ?? fallback), taken, place);
    taken.push(point);
    return { x: point.x, y: point.y, slot: null };
  });
  return matchDestinations(units, finals);
}

/** Ring offsets tried around a crowded point, nearest first, in a fixed order. */
const ROOM_RINGS = [1.2, 2.4, 3.6, 4.8];
const ROOM_DIRECTIONS: readonly Vec2[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 0.7071, y: 0.7071 },
  { x: -0.7071, y: 0.7071 },
  { x: 0.7071, y: -0.7071 },
  { x: -0.7071, y: -0.7071 },
];

function crowded(point: Vec2, taken: readonly Vec2[]): boolean {
  return taken.some((other) => (other.x - point.x) ** 2 + (other.y - point.y) ** 2 < SLOT_ROOM * SLOT_ROOM);
}

/** The point, or the nearest ring point around it that keeps a man's width from every taken place. */
function roomOf(point: Vec2, taken: readonly Vec2[], place: (anchor: Vec2) => Vec2): Vec2 {
  if (!crowded(point, taken)) return point;
  for (const ring of ROOM_RINGS) {
    for (const direction of ROOM_DIRECTIONS) {
      const candidate = place({ x: point.x + direction.x * ring, y: point.y + direction.y * ring });
      if (!crowded(candidate, taken)) return candidate;
    }
  }
  return point;
}
