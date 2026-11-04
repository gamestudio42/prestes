import { cachedCoverSlots, planCoverSlots } from '@prestes/shared';
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
