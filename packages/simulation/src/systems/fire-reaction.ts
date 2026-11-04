import { cachedCoverSlots, findPath, slotGuards } from '@prestes/shared';
import type { CoverSlot, UnitOrder } from '@prestes/shared';
import type { MutableUnit } from './model';
import type { SimContext } from './context';
import { occupied } from './geometry';
import { queueUnitOrder } from './movement';
import { slotHolders, takeSlot } from './slots';
import { openFireOnContact } from './combat';

/** How long a soldier stays under fire after a shot at him or near him (ticks). */
export const UNDER_FIRE_TICKS = 30;
/** Squad mates this close to the man shot at are under fire too (metres). */
export const UNDER_FIRE_RADIUS = 6;
/** Cover a soldier under fire will run to, at most (metres). */
export const FIRE_COVER_RADIUS = 6;
/** Ticks before a soldier under fire looks for cover again. */
const FIRE_COVER_COOLDOWN = 60;

/** Orders that keep a soldier moving at his pace and stance under fire. */
const KEEPS_MOVING: ReadonlySet<UnitOrder> = new Set<UnitOrder>(['move', 'withdraw', 'flank', 'pursue', 'rescue']);

/** Marks the man shot at, and his squad mates near him, as under fire. */
export function markUnderFire(ctx: SimContext, shooter: MutableUnit, target: MutableUnit): void {
  for (const unit of ctx.units) {
    if (!unit.alive || unit.dummy || unit.faction !== target.faction || unit.squadId !== target.squadId) {
      continue;
    }
    if (
      unit !== target &&
      (unit.x - target.x) ** 2 + (unit.y - target.y) ** 2 > UNDER_FIRE_RADIUS * UNDER_FIRE_RADIUS
    ) {
      continue;
    }
    unit.underFireTicks = UNDER_FIRE_TICKS;
    unit.lastShooter = shooter.id;
  }
}

/** The shooter a soldier under fire reacts to, if still a threat. */
export function shooterOf(ctx: SimContext, unit: MutableUnit): MutableUnit | null {
  if (!unit.underFireTicks || unit.lastShooter == null) {
    return null;
  }
  const shooter = ctx.units.find((entry) => entry.id === unit.lastShooter);
  return shooter && shooter.alive && !shooter.routed && !shooter.incapacitated ? shooter : null;
}

/**
 * The first shots: a soldier under fire crouches (unless his order keeps him
 * moving or the player locked his stance), and an idle or holding soldier
 * with the balanced or defensive posture takes a free cover slot in reach that
 * guards against the shooter and is not closer to him. Aggressive soldiers
 * only turn and return fire (the turn is in `updateFacing`). Player orders
 * are never replaced.
 */
export function reactToFire(ctx: SimContext): void {
  for (const unit of ctx.units) {
    if (unit.fireCoverCooldown) {
      unit.fireCoverCooldown -= 1;
    }
    if (!unit.underFireTicks) {
      continue;
    }
    unit.underFireTicks -= 1;
    // Fired upon, a section holding for contact opens fire.
    if (unit.fireOnContact) {
      openFireOnContact(ctx, unit);
    }
    if (
      !unit.alive ||
      unit.dummy ||
      unit.routed ||
      unit.incapacitated ||
      unit.state === 'panicked' ||
      unit.state === 'pinned' ||
      unit.posture === 'aggressive'
    ) {
      continue;
    }
    // An ordered Hold is the player's: the soldier stays put and as he is.
    if (unit.currentOrder === 'hold') {
      continue;
    }
    const keepsMoving = unit.currentOrder !== null && KEEPS_MOVING.has(unit.currentOrder);
    // A soldier in a cover slot keeps the slot's stance (he may need to stand
    // to fire over a wall).
    if (unit.stance === 'standing' && !unit.stanceLocked && !keepsMoving && unit.slotId === null) {
      unit.stance = 'crouched';
    }
    // Idle: no order, including a section that has arrived and stands.
    const idle = unit.currentOrder === null;
    if (
      !idle ||
      keepsMoving ||
      unit.suppress ||
      unit.recon ||
      unit.ambush ||
      unit.path.length > 0 ||
      unit.slotId !== null ||
      unit.fireCoverCooldown
    ) {
      continue;
    }
    const shooter = shooterOf(ctx, unit);
    if (!shooter) {
      continue;
    }
    unit.fireCoverCooldown = FIRE_COVER_COOLDOWN;
    const slot = coverInReach(ctx, unit, shooter);
    if (!slot) {
      continue;
    }
    const path = findPath({ x: unit.x, y: unit.y }, slot, ctx.covers);
    if (path.length === 0) {
      continue;
    }
    takeSlot(unit, slot);
    unit.path = path;
    unit.pathIndex = 0;
    unit.targetX = slot.x;
    unit.targetY = slot.y;
    queueUnitOrder(ctx, unit, path, 'move');
  }
}

function coverInReach(ctx: SimContext, unit: MutableUnit, shooter: MutableUnit): CoverSlot | null {
  const holders = slotHolders(ctx);
  const fromShooter = Math.sqrt((unit.x - shooter.x) ** 2 + (unit.y - shooter.y) ** 2);
  let best: CoverSlot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const slot of cachedCoverSlots(ctx.covers)) {
    const holder = holders.get(slot.id);
    if (holder !== undefined && holder !== unit.id) {
      continue;
    }
    const distance = (slot.x - unit.x) ** 2 + (slot.y - unit.y) ** 2;
    if (distance > FIRE_COVER_RADIUS * FIRE_COVER_RADIUS || distance >= bestDistance) {
      continue;
    }
    // Not toward the shooter: the slot is at least as far from him.
    if (Math.sqrt((slot.x - shooter.x) ** 2 + (slot.y - shooter.y) ** 2) < fromShooter - 0.5) {
      continue;
    }
    if (!slotGuards(slot, shooter, null) || occupied(ctx, slot.x, slot.y, unit)) {
      continue;
    }
    best = slot;
    bestDistance = distance;
  }
  return best;
}

/** Soldiers this close to an officer under fire screen him (metres). */
export const OFFICER_SCREEN_RADIUS = 10;
/** At most this many soldiers screen one officer. */
const OFFICER_SCREENS = 3;

/**
 * Protecting the officer, in every posture: when an officer is under fire, up
 * to three of his soldiers within reach take free cover slots between him and
 * the shooter. Soldiers on a moving order, suppressing or already screening
 * keep what they do.
 */
export function screenOfficers(ctx: SimContext): void {
  for (const officer of ctx.units) {
    if (officer.kind !== 'officer' || !officer.alive || officer.incapacitated || !officer.underFireTicks) {
      continue;
    }
    const shooter = shooterOf(ctx, officer);
    if (!shooter) {
      continue;
    }
    const officerRange = Math.sqrt((officer.x - shooter.x) ** 2 + (officer.y - shooter.y) ** 2);
    const guards = ctx.units
      .filter(
        (unit) =>
          unit !== officer &&
          unit.alive &&
          !unit.incapacitated &&
          !unit.routed &&
          !unit.dummy &&
          unit.faction === officer.faction &&
          unit.state !== 'panicked' &&
          unit.state !== 'pinned' &&
          !unit.suppress &&
          unit.path.length === 0 &&
          !unit.fireCoverCooldown &&
          (unit.currentOrder === null || !KEEPS_MOVING.has(unit.currentOrder)) &&
          (unit.x - officer.x) ** 2 + (unit.y - officer.y) ** 2 <= OFFICER_SCREEN_RADIUS * OFFICER_SCREEN_RADIUS,
      )
      .sort(
        (left, right) =>
          (left.x - officer.x) ** 2 + (left.y - officer.y) ** 2 - ((right.x - officer.x) ** 2 + (right.y - officer.y) ** 2) ||
          left.id - right.id,
      )
      .slice(0, OFFICER_SCREENS);
    const holders = slotHolders(ctx);
    for (const guard of guards) {
      let best: CoverSlot | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const slot of cachedCoverSlots(ctx.covers)) {
        const holder = holders.get(slot.id);
        if (holder !== undefined && holder !== guard.id) {
          continue;
        }
        // Between the officer and the shooter: near him, nearer the shooter.
        const fromOfficer = (slot.x - officer.x) ** 2 + (slot.y - officer.y) ** 2;
        if (fromOfficer > 25) {
          continue;
        }
        if (Math.sqrt((slot.x - shooter.x) ** 2 + (slot.y - shooter.y) ** 2) > officerRange - 1) {
          continue;
        }
        if (!slotGuards(slot, shooter, null) || occupied(ctx, slot.x, slot.y, guard)) {
          continue;
        }
        const distance = (slot.x - guard.x) ** 2 + (slot.y - guard.y) ** 2;
        if (distance < bestDistance) {
          best = slot;
          bestDistance = distance;
        }
      }
      guard.fireCoverCooldown = FIRE_COVER_COOLDOWN;
      if (!best || guard.slotId === best.id) {
        continue;
      }
      const path = findPath({ x: guard.x, y: guard.y }, best, ctx.covers);
      if (path.length === 0) {
        continue;
      }
      takeSlot(guard, best);
      holders.set(best.id, guard.id);
      guard.path = path;
      guard.pathIndex = 0;
      guard.targetX = best.x;
      guard.targetY = best.y;
      queueUnitOrder(ctx, guard, path, 'move');
    }
  }
}
