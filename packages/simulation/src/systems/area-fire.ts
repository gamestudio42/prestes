import { getWeapon } from '@prestes/shared';
import type { RejectionReason, Vec2 } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';
import { releaseCarry } from './casualties';
import { MARKER_TICKS } from './vision';

/**
 * Area fire on a suspected contact (scrub-concealment-and-area-fire). The
 * player answers a "?" marker or the ghost of a lost enemy with fire into a
 * disc round it: rare hits, mostly suppression, at a cost in rounds. This
 * module validates the order against the side's own memory of contacts and
 * sets the men up; the rounds themselves are fired in `combat.ts`.
 */

/** How long the order lasts (ticks, 20 s). */
export const AREA_FIRE_TICKS = 200;
/** A round's hit chance is the aimed chance times this, and never over it. */
export const AREA_FIRE_ACCURACY = 0.03;
/** A round adds this share of a missed aimed round's suppression. */
export const AREA_FIRE_SUPPRESSION = 0.5;
/** Rounds suppress men this far outside the disc too (m). */
export const AREA_FIRE_MARGIN = 2;
/** The ordered point must lie this close to a contact the side holds (m). */
export const AREA_PICK_RADIUS = 8;
/** A last sighting stays a contact for this long (ticks; the view's ghost lasts 5 s). */
export const SIGHTING_TICKS = 70;
/** The disc round a last sighting (m). */
export const SIGHTING_RADIUS = 5;
/** The disc round any point with fog of war off (m). */
export const OPEN_RADIUS = 6;
export const AREA_RADIUS_MIN = 4;
export const AREA_RADIUS_MAX = 12;
/** An enemy seen this close ends a man's area fire (m, the near sense). */
export const AREA_SELF_DEFENCE = 15;
/** A man stops when his rounds left fall to this share of his full load. */
export const AREA_KEEP_SHARE = 0.25;

const clampRadius = (radius: number) => Math.min(AREA_RADIUS_MAX, Math.max(AREA_RADIUS_MIN, radius));

/**
 * The contact a side holds nearest `to`, within AREA_PICK_RADIUS: an
 * unseen-fire marker of the last MARKER_TICKS or the last sighting, in the
 * last SIGHTING_TICKS, of an enemy it no longer sees. Ties go to the newer.
 */
export function suspectedContact(
  ctx: SimContext,
  side: 'column' | 'legalist',
  to: Vec2,
  tick: number,
): { x: number; y: number; radius: number } | null {
  let best: { x: number; y: number; radius: number; distance: number; tick: number } | null = null;
  const consider = (x: number, y: number, radius: number, at: number) => {
    const distance = (x - to.x) ** 2 + (y - to.y) ** 2;
    if (distance > AREA_PICK_RADIUS * AREA_PICK_RADIUS) return;
    if (best && (distance > best.distance || (distance === best.distance && at <= best.tick))) return;
    best = { x, y, radius, distance, tick: at };
  };
  for (const mark of ctx.vision.heard[side]) {
    if (tick - mark.tick <= MARKER_TICKS) consider(mark.x, mark.y, mark.radius, mark.tick);
  }
  const seen = ctx.vision.seen[side];
  for (const [id, sighting] of ctx.vision.lastSeen[side]) {
    if (!seen.has(id) && tick - sighting.tick <= SIGHTING_TICKS) consider(sighting.x, sighting.y, SIGHTING_RADIUS, sighting.tick);
  }
  if (best === null) return null;
  const found: { x: number; y: number; radius: number } = best;
  return { x: found.x, y: found.y, radius: clampRadius(found.radius) };
}

/** The rounds a man keeps back: a quarter of his weapon's full load, rounded up. */
export function areaFireFloor(unit: MutableUnit): number {
  const weapon = getWeapon(unit.weaponId);
  if (!weapon) return 0;
  return Math.ceil(AREA_KEEP_SHARE * (weapon.magazine + weapon.reserve));
}

/** Ends a man's area fire; he holds where he is. */
export function endAreaFire(unit: MutableUnit): void {
  if (unit.areaFire === undefined) return;
  delete unit.areaFire;
  if (unit.currentOrder === 'area-fire') unit.currentOrder = null;
}

/** Ends area fire when its time is up, the man is down to his floor, or out of the fight. */
export function updateAreaFire(ctx: SimContext, tick: number): void {
  for (const unit of ctx.units) {
    if (unit.areaFire === undefined) continue;
    if (
      !unit.alive ||
      unit.incapacitated ||
      unit.routed ||
      tick >= unit.areaFire.untilTick ||
      unit.magazine + unit.reserve <= areaFireFloor(unit)
    ) {
      endAreaFire(unit);
    }
  }
}

/** Applies an `area_fire` command to the resolved men of one section. */
export function orderAreaFire(
  ctx: SimContext,
  actionable: MutableUnit[],
  to: Vec2,
  tick: number,
  reject: (reason: RejectionReason) => void,
): void {
  if (!Number.isFinite(to.x) || !Number.isFinite(to.y)) {
    reject('invalid_position');
    return;
  }
  const side = actionable[0]?.faction;
  let disc: { x: number; y: number; radius: number } | null;
  if (!ctx.fog || (side !== 'column' && side !== 'legalist')) {
    disc = { x: to.x, y: to.y, radius: OPEN_RADIUS };
  } else {
    disc = suspectedContact(ctx, side, to, tick);
  }
  if (!disc) {
    reject('no_suspected_contact');
    return;
  }
  const ids = new Set(actionable.map((unit) => unit.id));
  ctx.orders = ctx.orders.filter((order) => !order.unitIds.some((id) => ids.has(id)));
  for (const unit of actionable) {
    releaseCarry(ctx, unit);
    unit.orderDestination = null;
    unit.orderIssued = true;
    unit.orderRegionCenter = null;
    unit.orderRegionRadius = 0;
    unit.lineMove = false;
    unit.targetId = null;
    unit.targetLocked = false;
    unit.targetX = unit.x;
    unit.targetY = unit.y;
    unit.path = [];
    unit.pathIndex = 0;
    unit.flankTargetId = null;
    unit.suppress = false;
    unit.ambush = false;
    unit.reserveMode = false;
    unit.recon = false;
    unit.rescueTargetId = null;
    unit.holdPosition = true;
    unit.currentOrder = 'area-fire';
    const dx = disc.x - unit.x;
    const dy = disc.y - unit.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0.001) {
      unit.aimX = dx / length;
      unit.aimY = dy / length;
      unit.facingX = dx / length;
      unit.facingY = dy / length;
    }
    unit.areaFire = { x: disc.x, y: disc.y, radius: disc.radius, untilTick: tick + AREA_FIRE_TICKS };
  }
}
